import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeEmail } from "../../../lib/utils";
import { getAuthenticatedUser } from "../../../lib/auth";
import { checkRateLimit, getClientIp } from "../../../lib/ratelimit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }

    const rl = await checkRateLimit(`match:${getClientIp(req)}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Çok fazla istek. Lütfen bekleyin." }, { status: 429 });
    }

    const { itemId } = await req.json();

    const { data: item, error } = await supabase
      .from("items")
      .select("*")
      .eq("id", itemId)
      .single();

    if (error || !item) {
      return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
    }

    const text = `${item.title} ${item.description} ${item.category} ${item.location}`;

    const { data: embedData, error: embedError } = await supabase.functions.invoke("embed", {
      body: { input: text },
    });

    if (embedError) throw embedError;

    const { data: matches, error: matchError } = await supabase.rpc("match_items", {
      query_embedding: embedData.embedding,
      query_type: item.type,
      query_category: item.category,
      query_lat: item.lat ?? 0,
      query_lng: item.lng ?? 0,
      query_date: item.date ?? null,
      query_item_id: item.id,
      query_owner_email: item.created_by_email ?? "",
      match_threshold: 0.3,
      match_count: 5,
    });

    if (matchError) throw matchError;

    const currentOwnerEmail = normalizeEmail(item.created_by_email);

    const filteredMatches = (matches ?? []).filter((m: { id: string; created_by_email?: string; score: number }) => {
      const matchOwnerEmail = normalizeEmail(m.created_by_email);
      if (m.id === item.id) return false;
      if (currentOwnerEmail && matchOwnerEmail === currentOwnerEmail) return false;
      return true;
    });

    // En yüksek skorlu uygun eşleşme varsa bildirim gönder
    const highMatches = filteredMatches.filter((m: { score: number }) => m.score > 0.5);

    if (highMatches.length > 0 && item.created_by_email) {
      const bestMatch = highMatches[0] as { id: string; title: string; type: string; score: number };

      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_email", normalizeEmail(item.created_by_email))
        .eq("item_id", item.id)
        .eq("related_item_id", bestMatch.id)
        .eq("type", "match")
        .maybeSingle();

      if (!existingNotification) {
        const typeText = item.type === "lost" ? "kayıp" : "buluntu";
        const matchTypeText = bestMatch.type === "lost" ? "kayıp" : "buluntu";

        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail: normalizeEmail(item.created_by_email),
            type: "match",
            title: "🎯 Eşleşme bulundu!",
            message: `${item.title} adlı ${typeText} ilanınız için olası bir ${matchTypeText} eşleşmesi bulundu: "${bestMatch.title}" — %${Math.round(bestMatch.score * 100)} uyum`,
            itemId: item.id,
            relatedItemId: bestMatch.id,
          }),
        });
      }
    }

    return NextResponse.json({ matches: filteredMatches });
  } catch {
    return NextResponse.json({ error: "Eşleştirme hatası" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { claimId, ownerUserId, ownerEmail } = body;

    if (!claimId || (!ownerUserId && !ownerEmail)) {
      return NextResponse.json({ error: "Eksik alanlar." }, { status: 400 });
    }

    // Talebi getir
    const { data: claim, error: fetchError } = await supabase
      .from("claims")
      .select("*")
      .eq("id", claimId)
      .single();

    if (fetchError || !claim) {
      return NextResponse.json({ error: "Talep bulunamadı." }, { status: 404 });
    }

    if (claim.status !== "pending") {
      return NextResponse.json({ error: "Bu talep zaten işleme alınmış." }, { status: 409 });
    }

    // Yetkili mi kontrol et (ilan sahibi olmalı)
    const normalizedOwnerEmail = normalizeEmail(ownerEmail);
    const isOwner =
      (ownerUserId && claim.owner_user_id === ownerUserId) ||
      (!ownerUserId && normalizedOwnerEmail && normalizeEmail(claim.owner_email) === normalizedOwnerEmail);

    if (!isOwner) {
      return NextResponse.json({ error: "Bu talebi onaylama yetkin yok." }, { status: 403 });
    }

    // Talebi onayla ve ilanı çözüldü olarak işaretle
    const [{ error: updateClaimError }, { error: updateItemError }] = await Promise.all([
      supabase.from("claims").update({ status: "approved" }).eq("id", claimId),
      supabase.from("items").update({ status: "resolved" }).eq("id", claim.item_id),
    ]);

    if (updateClaimError) {
      console.error("Claim approve update error:", updateClaimError);
      return NextResponse.json({ error: "Talep onaylanamadı." }, { status: 500 });
    }
    if (updateItemError) {
      console.error("Item status update error:", updateItemError);
    }

    // Talep edenin e-postasına bildirim gönder
    if (claim.claimer_email) {
      const { data: item } = await supabase
        .from("items")
        .select("title")
        .eq("id", claim.item_id)
        .single();

      const itemTitle = item?.title || "İlan";

      await supabase.from("notifications").insert({
        user_email: normalizeEmail(claim.claimer_email),
        type: "claim_approved",
        title: "✅ Sahiplik talebiniz onaylandı!",
        message: `"${itemTitle}" ilanı için gönderdiğiniz sahiplik talebi onaylandı.`,
        item_id: claim.item_id,
        is_read: false,
      });
    }

    // Konuşmalara sistem mesajı ekle
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id")
      .eq("item_id", claim.item_id);

    if (conversations && conversations.length > 0) {
      const { data: item } = await supabase
        .from("items")
        .select("title")
        .eq("id", claim.item_id)
        .single();

      await supabase.from("messages").insert(
        conversations.map((c) => ({
          conversation_id: c.id,
          sender_email: "system",
          content: `✅ Sahiplik talebi onaylandı. "${item?.title ?? "İlan"}" çözüme kavuştu.`,
          is_read: true,
          is_system: true,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Claims approve error:", error);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

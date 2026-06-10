import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCriticalAlert } from "../../../lib/criticalAlert";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const internalSecret = req.headers.get("x-internal-secret");
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const isInternal = internalSecret === process.env.CRON_SECRET;

    let callerEmail: string | null = null;
    if (!isInternal) {
      if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      callerEmail = user.email.toLowerCase().trim();
    }

    const body = await req.json();
    const { itemId, title, description, category, location } = body;

    // JWT çağrılarında ilan sahibi doğrula
    if (!isInternal && itemId) {
      const { data: item } = await supabase.from("items").select("created_by_email").eq("id", itemId).maybeSingle();
      if (!item || item.created_by_email?.toLowerCase().trim() !== callerEmail) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    const text = `${title} ${description} ${category} ${location}`;

    const { data, error } = await supabase.functions.invoke("embed", {
      body: { input: text },
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (error) throw error;
    if (!data?.embedding) throw new Error("Embedding boş geldi");

    const { error: updateError } = await supabase
      .from("items")
      .update({ embedding: data.embedding })
      .eq("id", itemId);

    if (updateError) throw updateError;

    if (process.env.CRON_SECRET && process.env.NEXT_PUBLIC_APP_URL) {
      const base = process.env.NEXT_PUBLIC_APP_URL;
      const secret = process.env.CRON_SECRET;
      fetch(`${base}/api/agent/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-agent-secret": secret },
        body: JSON.stringify({ itemId }),
      }).catch(() => {});
      fetch(`${base}/api/telegram?itemId=${itemId}`, {
        headers: { "x-agent-secret": secret },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[embed]", error);
    await sendCriticalAlert(
      "Embedding başarısız",
      String(error),
      "/api/embed"
    );
    return NextResponse.json({ error: "Embedding hatası" }, { status: 500 });
  }
}
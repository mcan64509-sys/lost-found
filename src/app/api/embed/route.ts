import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCriticalAlert } from "../../../lib/criticalAlert";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemId, title, description, category, location } = body;
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

    // Trigger AI agents asynchronously — fire-and-forget
    if (process.env.CRON_SECRET && process.env.NEXT_PUBLIC_APP_URL) {
      const agentHeaders = {
        "Content-Type": "application/json",
        "x-agent-secret": process.env.CRON_SECRET,
      };
      const agentBody = JSON.stringify({ itemId });
      const base = process.env.NEXT_PUBLIC_APP_URL;

      fetch(`${base}/api/agent/match`, { method: "POST", headers: agentHeaders, body: agentBody }).catch(() => {});
      fetch(`${base}/api/agent/moderate`, { method: "POST", headers: agentHeaders, body: agentBody }).catch(() => {});
      fetch(`${base}/api/telegram?secret=${process.env.CRON_SECRET}&itemId=${itemId}`).catch(() => {});
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
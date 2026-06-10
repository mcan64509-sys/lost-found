import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com";

export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization") || "";
  const secret = new URL(req.url).searchParams.get("secret");
  const authorized = bearer === `Bearer ${process.env.CRON_SECRET}` || secret === process.env.CRON_SECRET;
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: items } = await supabase
    .from("items")
    .select("id")
    .eq("status", "active")
    .gte("created_at", since)
    .limit(20);

  if (!items || items.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  for (const item of items) {
    try {
      await fetch(`${APP_URL}/api/agent/match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agent-secret": process.env.CRON_SECRET || "",
        },
        body: JSON.stringify({ itemId: item.id }),
      });
      processed++;
    } catch {}
  }

  return NextResponse.json({ processed, total: items.length });
}

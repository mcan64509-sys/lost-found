import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// "active" olup 30+ dakikadır mesaj/güncelleme olmayan oturumları "waiting"e döndür
const STALE_MINUTES = 30;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staleThreshold = new Date(Date.now() - STALE_MINUTES * 60 * 1000).toISOString();

  const { data: stale, error } = await supabase
    .from("support_sessions")
    .update({ status: "waiting", admin_email: null, admin_name: null })
    .eq("status", "active")
    .lt("updated_at", staleThreshold)
    .select("id, user_email, user_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ cleaned: stale?.length ?? 0 });
}

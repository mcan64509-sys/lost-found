import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Runs daily — lifts bans whose banned_until has passed
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ is_banned: false, banned_until: null })
    .eq("is_banned", true)
    .lt("banned_until", new Date().toISOString())
    .not("banned_until", "is", null)
    .select("email");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ unbanned: data?.length ?? 0 });
}

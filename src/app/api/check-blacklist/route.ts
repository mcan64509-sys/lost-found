import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`blacklist:${ip}`);
  if (!rl.allowed) return NextResponse.json({ blacklisted: false }, { status: 429 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ blacklisted: false });

  const { data } = await supabaseAdmin
    .from("blacklisted_emails")
    .select("email")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  return NextResponse.json({ blacklisted: !!data });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ blacklisted: false });

  const { data } = await supabaseAdmin
    .from("blacklisted_emails")
    .select("email")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  return NextResponse.json({ blacklisted: !!data });
}

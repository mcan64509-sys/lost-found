import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const redirect = searchParams.get("redirect") || "/";

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

  // Email doğrulaması → onay sayfasına yönlendir
  if (type === "signup" || type === "email_change") {
    return NextResponse.redirect(`${siteUrl}/auth/verified`);
  }

  return NextResponse.redirect(`${siteUrl}${redirect}`);
}

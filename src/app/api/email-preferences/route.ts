import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "../../../lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser?.email) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("email_preferences")
    .select("*")
    .eq("user_email", authUser.email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const defaults = {
    user_email: authUser.email,
    notify_claims: true,
    notify_messages: true,
    notify_matches: true,
    notify_digest: false,
  };

  return NextResponse.json(data ?? defaults);
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.email) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }

    const body = await req.json();

    const prefs = {
      user_email: authUser.email,
      notify_claims: body.notify_claims ?? true,
      notify_messages: body.notify_messages ?? true,
      notify_matches: body.notify_matches ?? true,
      notify_digest: body.notify_digest ?? false,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("email_preferences")
      .upsert(prefs, { onConflict: "user_email" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

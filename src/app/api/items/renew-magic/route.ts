import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com";

// GET: magic link ile tek tıkla uzatma — ?token=<uuid>
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${APP_URL}/?renew=invalid`);
  }

  // Token ile item bul — renew_token + renew_token_expires_at kolonlarını kontrol et
  const { data: item, error } = await supabase
    .from("items")
    .select("id, title, status, renew_token, renew_token_expires_at, expires_at")
    .eq("renew_token", token)
    .maybeSingle();

  if (error || !item) {
    return NextResponse.redirect(`${APP_URL}/?renew=invalid`);
  }

  if (item.status === "resolved") {
    return NextResponse.redirect(`${APP_URL}/items/${item.id}?renew=resolved`);
  }

  const tokenExpiry = item.renew_token_expires_at ? new Date(item.renew_token_expires_at) : null;
  if (!tokenExpiry || tokenExpiry < new Date()) {
    return NextResponse.redirect(`${APP_URL}/items/${item.id}?renew=expired`);
  }

  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + 60);

  const { error: updateError } = await supabase
    .from("items")
    .update({
      expires_at: newExpiry.toISOString(),
      status: "active",
      renew_token: null,
      renew_token_expires_at: null,
    })
    .eq("id", item.id);

  if (updateError) {
    return NextResponse.redirect(`${APP_URL}/items/${item.id}?renew=error`);
  }

  return NextResponse.redirect(`${APP_URL}/items/${item.id}?renew=success`);
}

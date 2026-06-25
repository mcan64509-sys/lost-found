import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "../../../../lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.email) return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });

    const { subscription, userId } = await req.json();
    const userEmail = authUser.email;

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });
    }
    if (
      subscription.endpoint.length > 512 ||
      (subscription.keys?.p256dh && subscription.keys.p256dh.length > 128) ||
      (subscription.keys?.auth && subscription.keys.auth.length > 64)
    ) {
      return NextResponse.json({ error: "Geçersiz veri." }, { status: 400 });
    }

    await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId || null,
        user_email: userEmail,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: "endpoint" }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.email) return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });

    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });

    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("user_email", authUser.email);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

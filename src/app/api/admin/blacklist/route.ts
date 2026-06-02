import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyPermission } from "../../../../lib/adminAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const callerEmail = await verifyPermission(req, "manage_blacklist");
  if (!callerEmail) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { targetEmail, blacklist, reason } = await req.json();

  if (!targetEmail) {
    return NextResponse.json({ error: "targetEmail gerekli" }, { status: 400 });
  }
  if (targetEmail.toLowerCase() === callerEmail) {
    return NextResponse.json({ error: "Kendinizi kara listeye alamazsınız" }, { status: 400 });
  }

  if (blacklist) {
    const { error } = await supabaseAdmin
      .from("blacklisted_emails")
      .upsert({ email: targetEmail.toLowerCase(), reason: reason || null, banned_by: callerEmail }, { onConflict: "email" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin
      .from("blacklisted_emails")
      .delete()
      .eq("email", targetEmail.toLowerCase());
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, blacklisted: !!blacklist });
}

export async function GET(req: NextRequest) {
  const callerEmail = await verifyPermission(req, "manage_blacklist");
  if (!callerEmail) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("blacklisted_emails")
    .select("email")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ emails: (data ?? []).map((r) => r.email) });
}

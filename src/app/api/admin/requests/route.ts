import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyPermission } from "../../../../lib/adminAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const admin = await verifyPermission(req, "manage_requests");
  if (!admin) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("user_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const admin = await verifyPermission(req, "manage_requests");
  if (!admin) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { requestId, status, adminResponse } = await req.json();
  if (!requestId || !["in_progress", "resolved", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("user_requests")
    .update({ status, admin_response: adminResponse || null })
    .eq("id", requestId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

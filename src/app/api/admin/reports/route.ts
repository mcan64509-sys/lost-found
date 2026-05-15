import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user?.email) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const email = user.email.toLowerCase().trim();
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("*, items(title)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reports = (data || []).map((r: Record<string, unknown>) => ({
    ...r,
    item_title: (r.items as { title?: string } | null)?.title || "—",
  }));

  return NextResponse.json({ reports });
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user?.email) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const email = user.email.toLowerCase().trim();
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const { reportId, status } = await req.json();
  if (!reportId || !["reviewed", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("reports")
    .update({ status })
    .eq("id", reportId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

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

async function verifyAdmin(req: NextRequest): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user?.email) return null;
  const email = user.email.toLowerCase().trim();
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) return null;
  return email;
}

export async function GET(req: NextRequest) {
  const adminEmail = await verifyAdmin(req);
  if (!adminEmail) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("*, items(title, created_by_email)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type ItemJoin = { title?: string; created_by_email?: string } | null;
  const reports = (data || []).map((r: Record<string, unknown>) => ({
    ...r,
    item_title: (r.items as ItemJoin)?.title || "—",
    item_owner_email: (r.items as ItemJoin)?.created_by_email || null,
  }));

  return NextResponse.json({ reports });
}

export async function PATCH(req: NextRequest) {
  const adminEmail = await verifyAdmin(req);
  if (!adminEmail) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { reportId, action, adminMessage } = await req.json();
  if (!reportId || !["remove_item", "warn_user", "dismiss"].includes(action)) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  type ItemJoin = { title?: string; created_by_email?: string } | null;
  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("item_id, items(title, created_by_email)")
    .eq("id", reportId)
    .single();

  const itemTitle = (report?.items as ItemJoin)?.title || "İlan";
  const itemOwnerEmail = (report?.items as ItemJoin)?.created_by_email;
  const itemId = report?.item_id;

  if (action === "remove_item") {
    if (itemId) await supabaseAdmin.from("items").delete().eq("id", itemId);
    if (itemOwnerEmail) {
      try {
        await supabaseAdmin.from("notifications").insert({
          user_email: itemOwnerEmail,
          type: "item_removed_report",
          title: "İlanınız kaldırıldı ⚠️",
          message: adminMessage || `"${itemTitle}" ilanınız, şikayet incelemesi sonucunda platform kurallarına aykırı bulunarak kaldırıldı.`,
          item_id: null,
          is_read: false,
        });
      } catch { /* non-critical */ }
    }
    await supabaseAdmin.from("reports").update({ status: "reviewed" }).eq("id", reportId);

  } else if (action === "warn_user") {
    if (itemOwnerEmail) {
      try {
        await supabaseAdmin.from("notifications").insert({
          user_email: itemOwnerEmail,
          type: "admin_warning",
          title: "Admin Uyarısı ⚠️",
          message: adminMessage || `"${itemTitle}" ilanınız hakkında şikayet alındı. Lütfen platform kurallarına uygun hareket edin.`,
          item_id: itemId || null,
          is_read: false,
        });
      } catch { /* non-critical */ }
    }
    await supabaseAdmin.from("reports").update({ status: "reviewed" }).eq("id", reportId);

  } else if (action === "dismiss") {
    await supabaseAdmin.from("reports").update({ status: "dismissed" }).eq("id", reportId);
  }

  return NextResponse.json({ success: true });
}

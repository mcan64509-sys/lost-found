import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendItemDeletedEmail } from "../../../../lib/email";
import { verifyPermission } from "../../../../lib/adminAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const adminEmail = await verifyPermission(req, "delete_items");
  if (!adminEmail) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { itemId, reason } = await req.json();
  if (!itemId || !reason?.trim()) {
    return NextResponse.json({ error: "Eksik parametre." }, { status: 400 });
  }

  const { data: item } = await supabaseAdmin
    .from("items")
    .select("id, title, created_by_email")
    .eq("id", itemId)
    .single();

  if (!item) return NextResponse.json({ error: "İlan bulunamadı." }, { status: 404 });

  const { error } = await supabaseAdmin.from("items").delete().eq("id", itemId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (item.created_by_email) {
    await supabaseAdmin.from("notifications").insert({
      user_email: item.created_by_email,
      type: "item_removed_admin",
      title: "İlanınız kaldırıldı ⚠️",
      message: `"${item.title}" ilanınız şu sebeple kaldırıldı: ${reason}`,
      item_id: null,
      is_read: false,
    });

    await sendItemDeletedEmail({
      ownerEmail: item.created_by_email,
      itemTitle: item.title,
      reason,
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

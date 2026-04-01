import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const itemId = (body.itemId || "").trim();
    const userEmail = (body.userEmail || "").trim().toLowerCase();

    if (!itemId || !userEmail) {
      return NextResponse.json({ error: "itemId ve userEmail gerekli" }, { status: 400 });
    }

    // Verify item belongs to user
    const { data: item, error: fetchError } = await supabase
      .from("items")
      .select("id, created_by_email")
      .eq("id", itemId)
      .maybeSingle();

    if (fetchError || !item) {
      return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
    }

    if ((item.created_by_email || "").trim().toLowerCase() !== userEmail) {
      return NextResponse.json({ error: "Bu ilan sana ait değil" }, { status: 403 });
    }

    const newExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await supabase
      .from("items")
      .update({ expires_at: newExpiresAt })
      .eq("id", itemId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, expires_at: newExpiresAt });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

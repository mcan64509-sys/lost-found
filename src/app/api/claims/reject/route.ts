import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { claimId, ownerUserId, ownerEmail } = body;

    if (!claimId || (!ownerUserId && !ownerEmail)) {
      return NextResponse.json({ error: "Eksik alanlar." }, { status: 400 });
    }

    // Talebi getir
    const { data: claim, error: fetchError } = await supabase
      .from("claims")
      .select("*")
      .eq("id", claimId)
      .single();

    if (fetchError || !claim) {
      return NextResponse.json({ error: "Talep bulunamadı." }, { status: 404 });
    }

    if (claim.status !== "pending") {
      return NextResponse.json({ error: "Bu talep zaten işleme alınmış." }, { status: 409 });
    }

    // Yetkili mi kontrol et (ilan sahibi olmalı)
    const normalizedOwnerEmail = normalizeEmail(ownerEmail);
    const isOwner =
      (ownerUserId && claim.owner_user_id === ownerUserId) ||
      (!ownerUserId && normalizedOwnerEmail && normalizeEmail(claim.owner_email) === normalizedOwnerEmail);

    if (!isOwner) {
      return NextResponse.json({ error: "Bu talebi reddetme yetkin yok." }, { status: 403 });
    }

    // Talebi reddet
    const { error: updateError } = await supabase
      .from("claims")
      .update({ status: "rejected" })
      .eq("id", claimId);

    if (updateError) {
      console.error("Claim reject update error:", updateError);
      return NextResponse.json({ error: "Talep reddedilemedi." }, { status: 500 });
    }

    // Talep edenin e-postasına bildirim gönder
    if (claim.claimer_email) {
      const { data: item } = await supabase
        .from("items")
        .select("title")
        .eq("id", claim.item_id)
        .single();

      const itemTitle = item?.title || "İlan";

      await supabase.from("notifications").insert({
        user_email: normalizeEmail(claim.claimer_email),
        type: "claim_rejected",
        title: "❌ Sahiplik talebiniz reddedildi.",
        message: `"${itemTitle}" ilanı için gönderdiğiniz sahiplik talebi reddedildi.`,
        item_id: claim.item_id,
        is_read: false,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Claims reject error:", error);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

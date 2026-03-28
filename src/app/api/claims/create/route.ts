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

    const {
      item_id,
      claimer_user_id,
      claimer_email,
      claimant_name,
      owner_user_id,
      owner_email,
      lost_date,
      lost_location,
      brand_model,
      distinctive_feature,
      extra_note,
    } = body;

    if (!item_id || !claimer_user_id || !claimant_name || !lost_location || !distinctive_feature) {
      return NextResponse.json({ error: "Eksik zorunlu alanlar." }, { status: 400 });
    }

    const normalizedClaimerEmail = normalizeEmail(claimer_email);
    const normalizedOwnerEmail = normalizeEmail(owner_email);

    // Kendi ilanına talep engellemesi
    if (owner_user_id && claimer_user_id === owner_user_id) {
      return NextResponse.json({ error: "Kendi ilanına talep gönderemezsin." }, { status: 400 });
    }
    if (!owner_user_id && normalizedOwnerEmail && normalizedClaimerEmail === normalizedOwnerEmail) {
      return NextResponse.json({ error: "Kendi ilanına talep gönderemezsin." }, { status: 400 });
    }

    // Zaten aktif talep var mı?
    const { data: existing } = await supabase
      .from("claims")
      .select("id")
      .eq("item_id", item_id)
      .eq("claimer_user_id", claimer_user_id)
      .in("status", ["pending", "approved"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Bu ilan için zaten aktif bir sahiplik talebin var." },
        { status: 409 }
      );
    }

    const { data: claim, error: insertError } = await supabase
      .from("claims")
      .insert({
        item_id,
        claimer_user_id,
        claimer_email: normalizedClaimerEmail || null,
        claimant_name: claimant_name.trim(),
        owner_user_id: owner_user_id || null,
        owner_email: normalizedOwnerEmail || null,
        lost_date: lost_date || null,
        lost_location: lost_location.trim(),
        brand_model: brand_model?.trim() || null,
        distinctive_feature: distinctive_feature.trim(),
        extra_note: extra_note?.trim() || null,
        status: "pending",
      })
      .select()
      .single();

    if (insertError || !claim) {
      console.error("Claim insert error:", insertError);
      return NextResponse.json({ error: "Talep oluşturulamadı." }, { status: 500 });
    }

    return NextResponse.json({ claim }, { status: 201 });
  } catch (error) {
    console.error("Claims create error:", error);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeEmail } from "../../../../lib/utils";
import { sendClaimReceivedEmail } from "../../../../lib/email";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { checkRateLimit, getClientIp } from "../../../../lib/ratelimit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }

    const rl = await checkRateLimit(`claims:${authUser.id}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Çok fazla istek. Lütfen bekleyin." }, { status: 429 });
    }

    const body = await req.json();

    const {
      item_id,
      claimant_name,
      owner_user_id,
      owner_email,
      lost_date,
      lost_location,
      brand_model,
      distinctive_feature,
      extra_note,
    } = body;

    if (!item_id || !claimant_name || !lost_location || !distinctive_feature) {
      return NextResponse.json({ error: "Eksik zorunlu alanlar." }, { status: 400 });
    }

    // JWT'den gelen kullanıcı bilgilerini kullan
    const claimer_user_id = authUser.id;
    const claimer_email = authUser.email;

    // Ban check
    if (claimer_email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_banned")
        .eq("email", claimer_email)
        .maybeSingle();
      if (profile?.is_banned) {
        return NextResponse.json({ error: "Hesabınız engellendi. Talep gönderemezsiniz." }, { status: 403 });
      }
    }

    const normalizedOwnerEmail = normalizeEmail(owner_email);

    // Kendi ilanına talep engellemesi
    if (owner_user_id && claimer_user_id === owner_user_id) {
      return NextResponse.json({ error: "Kendi ilanına talep gönderemezsin." }, { status: 400 });
    }
    if (!owner_user_id && normalizedOwnerEmail && claimer_email === normalizedOwnerEmail) {
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
        claimer_email: claimer_email || null,
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
      return NextResponse.json({ error: "Talep oluşturulamadı." }, { status: 500 });
    }

    // İlan sahibine email bildir
    if (normalizedOwnerEmail) {
      const { data: item } = await supabase
        .from("items")
        .select("title")
        .eq("id", item_id)
        .maybeSingle();

      if (item?.title) {
        sendClaimReceivedEmail({
          ownerEmail: normalizedOwnerEmail,
          claimantName: claimant_name.trim(),
          itemTitle: item.title,
          itemId: item_id,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ claim }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

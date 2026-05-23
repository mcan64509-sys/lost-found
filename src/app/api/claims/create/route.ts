import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeEmail } from "../../../../lib/utils";
import { sendClaimReceivedEmail } from "../../../../lib/email";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { checkRateLimit, getClientIp } from "../../../../lib/ratelimit";
import { sendCriticalAlert } from "../../../../lib/criticalAlert";

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

    // Fetch item title for notifications
    const { data: itemData } = await supabase
      .from("items")
      .select("title")
      .eq("id", item_id)
      .maybeSingle();

    const itemTitle = itemData?.title || "İlan";

    // Create conversation + send claim details as first message
    let conversationId: string | null = null;
    if (normalizedOwnerEmail && claimer_email && normalizedOwnerEmail !== claimer_email) {
      const { data: existingConvs } = await supabase
        .from("conversations")
        .select("id")
        .eq("item_id", item_id)
        .or(
          `and(owner_email.eq.${normalizedOwnerEmail},claimant_email.eq.${claimer_email}),and(owner_email.eq.${claimer_email},claimant_email.eq.${normalizedOwnerEmail})`
        );

      conversationId = existingConvs?.[0]?.id ?? null;

      if (!conversationId) {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({
            item_id,
            item_title: itemTitle,
            owner_email: normalizedOwnerEmail,
            claimant_email: claimer_email,
          })
          .select("id")
          .single();
        conversationId = newConv?.id ?? null;
      }

      if (conversationId) {
        const msgLines = [
          `📬 Bu eşyanın sahibi olduğunu bildirmek istiyorum!`,
          ``,
          `👤 İsim: ${claimant_name.trim()}`,
          `📍 Konum: ${lost_location.trim()}`,
        ];
        if (brand_model?.trim()) msgLines.push(`🏷️ Marka/Model: ${brand_model.trim()}`);
        msgLines.push(`🔍 Ayırt edici özellik: ${distinctive_feature.trim()}`);
        if (extra_note?.trim()) msgLines.push(``, `📝 Ek not: ${extra_note.trim()}`);

        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_email: claimer_email,
          content: msgLines.join("\n"),
          is_read: false,
          is_system: false,
        });
      }
    }

    if (normalizedOwnerEmail) {
      // Email notification
      sendClaimReceivedEmail({
        ownerEmail: normalizedOwnerEmail,
        claimantName: claimant_name.trim(),
        itemTitle,
        itemId: item_id,
      }).catch(() => {});

      // In-app notification with conversation link
      supabase.from("notifications").insert({
        user_email: normalizedOwnerEmail,
        type: "new_claim",
        title: `📬 Eşya benim talebi: ${itemTitle}`,
        message: `${claimant_name.trim()} bulundu ilanınıza yanıt verdi ve "eşya benim" talebi gönderdi.`,
        item_id,
        conversation_id: conversationId || null,
        is_read: false,
      }).then(null, () => {});
    }

    return NextResponse.json({ claim }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? (err.stack || err.message) : String(err);
    sendCriticalAlert("500 — /api/claims/create", msg, "/api/claims/create").catch(console.error);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

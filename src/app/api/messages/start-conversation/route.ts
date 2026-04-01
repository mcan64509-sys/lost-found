import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { normalizeEmail, isValidEmail } from "../../../../lib/utils";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { checkRateLimit, getClientIp } from "../../../../lib/ratelimit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }

    const rl = await checkRateLimit(`startconv:${getClientIp(req)}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Çok fazla istek. Lütfen bekleyin." }, { status: 429 });
    }

    const body = await req.json();

    const receiverEmail = normalizeEmail(body.receiverEmail);
    const itemId = String(body.itemId || "").trim();
    const itemTitle = String(body.itemTitle || "").trim();
    const matchedItemId = body.matchedItemId ? String(body.matchedItemId) : null;
    const senderEmail = authUser.email!;

    if (!receiverEmail || !itemId || !itemTitle) {
      return NextResponse.json(
        { error: "Eksik alanlar var." },
        { status: 400 }
      );
    }

    if (!isValidEmail(receiverEmail)) {
      return NextResponse.json(
        { error: "Geçersiz email bilgisi." },
        { status: 400 }
      );
    }

    if (senderEmail === receiverEmail) {
      return NextResponse.json(
        { error: "Kendinle konuşma başlatamazsın." },
        { status: 400 }
      );
    }

    // Aynı item + aynı iki kişi için mevcut konuşma var mı? (her iki yön)
    const { data: existingConversations, error: existingError } = await supabase
      .from("conversations")
      .select("*")
      .eq("item_id", itemId)
      .or(
        `and(owner_email.eq.${receiverEmail},claimant_email.eq.${senderEmail}),and(owner_email.eq.${senderEmail},claimant_email.eq.${receiverEmail})`
      );

    if (existingError) {
      return NextResponse.json(
        { error: "Mevcut konuşma kontrol edilemedi." },
        { status: 500 }
      );
    }

    if (existingConversations && existingConversations.length > 0) {
      return NextResponse.json({ conversationId: existingConversations[0].id });
    }

    // Yeni konuşma oluştur
    const { data: conversation, error: insertError } = await supabase
      .from("conversations")
      .insert({
        item_id: itemId,
        item_title: itemTitle,
        owner_email: receiverEmail,
        claimant_email: senderEmail,
      })
      .select()
      .single();

    if (insertError || !conversation) {
      return NextResponse.json(
        { error: "Konuşma başlatılamadı." },
        { status: 500 }
      );
    }

    // Karşı tarafa bildirim
    await supabase.from("notifications").insert({
      user_email: receiverEmail,
      type: "match_message",
      title: "💬 Yeni mesaj isteği!",
      message: `${senderEmail} kullanıcısı "${itemTitle}" ilanınız için size ulaşmak istiyor.`,
      item_id: itemId,
      related_item_id: matchedItemId,
      is_read: false,
    });

    // Email gönderimi opsiyonel
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const fromEmail = process.env.RESEND_FROM_EMAIL || "Lost & Found <onboarding@resend.dev>";

      await resend.emails.send({
        from: fromEmail,
        to: receiverEmail,
        subject: "💬 Yeni mesaj isteği",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h1 style="font-size:22px;font-weight:800;color:#0f172a;">Yeni mesaj isteği</h1>
            <p style="font-size:15px;color:#475569;margin-top:12px;">
              <strong>${senderEmail}</strong> kullanıcısı <strong>"${itemTitle}"</strong>
              ilanınız hakkında size mesaj göndermek istiyor.
            </p>
            <a href="${appUrl}/messages/${conversation.id}"
              style="display:inline-block;margin-top:24px;background:#2563eb;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;">
              Mesajı Gör
            </a>
          </div>
        `,
      });
    } catch {
      // Email fail olsa da konuşmayı bozma
    }

    return NextResponse.json({ conversationId: conversation.id });
  } catch {
    return NextResponse.json(
      { error: "Konuşma başlatılamadı." },
      { status: 500 }
    );
  }
}

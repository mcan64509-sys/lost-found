import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const senderEmail = normalizeEmail(body.senderEmail);
    const receiverEmail = normalizeEmail(body.receiverEmail);
    const itemId = String(body.itemId || "").trim();
    const itemTitle = String(body.itemTitle || "").trim();
    const matchedItemId = body.matchedItemId ? String(body.matchedItemId) : null;

    if (!senderEmail || !receiverEmail || !itemId || !itemTitle) {
      return NextResponse.json(
        { error: "Eksik alanlar var." },
        { status: 400 }
      );
    }

    if (!isValidEmail(senderEmail) || !isValidEmail(receiverEmail)) {
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

    // Aynı item + aynı iki kişi için mevcut konuşma var mı?
    const { data: existingConversation, error: existingError } = await supabase
      .from("conversations")
      .select("*")
      .eq("item_id", itemId)
      .eq("owner_email", receiverEmail)
      .eq("claimant_email", senderEmail)
      .maybeSingle();

    if (existingError) {
      console.error("Existing conversation lookup error:", existingError);
      return NextResponse.json(
        { error: "Mevcut konuşma kontrol edilemedi." },
        { status: 500 }
      );
    }

    if (existingConversation) {
      return NextResponse.json({ conversationId: existingConversation.id });
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
      console.error("Conversation insert error:", insertError);
      return NextResponse.json(
        { error: "Konuşma başlatılamadı." },
        { status: 500 }
      );
    }

    // Karşı tarafa bildirim
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_email: receiverEmail,
        type: "match_message",
        title: "💬 Yeni mesaj isteği!",
        message: `${senderEmail} kullanıcısı "${itemTitle}" ilanınız için size ulaşmak istiyor.`,
        item_id: itemId,
        related_item_id: matchedItemId,
        is_read: false,
      });

    if (notificationError) {
      console.error("Start conversation notification insert error:", notificationError);
    }

    // Email gönderimi opsiyonel, fail olsa da konuşmayı bozma
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      await resend.emails.send({
        from: "Lost & Found <onboarding@resend.dev>",
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
    } catch (mailError) {
      console.error("Start conversation mail error:", mailError);
    }

    return NextResponse.json({ conversationId: conversation.id });
  } catch (error) {
    console.error("Start conversation error:", error);
    return NextResponse.json(
      { error: "Konuşma başlatılamadı." },
      { status: 500 }
    );
  }
}
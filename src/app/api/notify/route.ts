import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { userEmail, type, title, message, itemId, relatedItemId } = await req.json();

    if (!userEmail || !type || !title || !message) {
      return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
    }

    // 1. Site içi bildirim kaydet
    const { error: insertError } = await supabase
      .from("notifications")
      .insert({
        user_email: userEmail.toLowerCase().trim(),
        type,
        title,
        message,
        item_id: itemId || null,
        related_item_id: relatedItemId || null,
        is_read: false,
      });

    if (insertError) {
      console.error("Notification insert error:", insertError);
    }

    // 2. Email gönder
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const itemUrl = itemId ? `${appUrl}/items/${itemId}` : appUrl;

    await resend.emails.send({
      from: "Lost & Found <onboarding@resend.dev>",
      to: userEmail,
      subject: title,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #fff; padding: 32px; border-radius: 16px;">
          <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 16px;">${title}</h1>
          <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">${message}</p>
          ${itemId ? `
          <a href="${itemUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600;">
            İlanı Görüntüle
          </a>
          ` : ""}
          <p style="color: #475569; font-size: 12px; margin-top: 32px;">Lost & Found — Kayıp eşyaları bul, sahibine ulaştır.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notify error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
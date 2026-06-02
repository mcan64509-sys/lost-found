import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { sendCriticalAlert } from "../../../lib/criticalAlert";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  try {
    const internalSecret = req.headers.get("x-internal-secret");
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const isInternal = internalSecret === process.env.CRON_SECRET;
    let callerEmail: string | null = null;

    if (!isInternal) {
      if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      callerEmail = user.email.toLowerCase().trim();
    }

    const { userEmail, type, title, message, itemId, relatedItemId } = await req.json();

    // JWT çağrılarında yalnızca kendi email'ine bildirim gönderilebilir
    if (!isInternal && callerEmail !== userEmail?.toLowerCase().trim()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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


    // 2. Email gönder
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const itemUrl = itemId ? `${appUrl}/items/${itemId}` : appUrl;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "BulanVarMı? <onboarding@resend.dev>",
      to: userEmail,
      subject: title,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #fff; padding: 32px; border-radius: 16px;">
          <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 16px;">${escapeHtml(title)}</h1>
          <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">${escapeHtml(message)}</p>
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
  } catch (err) {
    const msg = err instanceof Error ? (err.stack || err.message) : String(err);
    sendCriticalAlert("500 — /api/notify", msg, "/api/notify").catch(console.error);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "BulanVarMı? <support@bulanvarmi.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

const ADMIN_EMAILS = ((process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS) || "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  let userId: string | null = null;
  let userEmail = "";
  let userName = "";

  if (token) {
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (user) {
      userId = user.id;
      userEmail = user.email ?? "";
      userName = (user.user_metadata?.full_name as string) || userEmail.split("@")[0];
    }
  }

  if (!userEmail) {
    const body = await req.json().catch(() => ({}));
    userEmail = body.email || "anonim@bulanvarmi.com";
    userName = body.name || "Anonim Kullanıcı";
  }

  // Zaten bekleyen/aktif session var mı?
  const { data: existing } = await supabase
    .from("support_sessions")
    .select("id, status")
    .eq("user_email", userEmail)
    .in("status", ["waiting", "active"])
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ sessionId: existing.id, status: existing.status });
  }

  const { data: session, error } = await supabase
    .from("support_sessions")
    .insert({ user_id: userId, user_email: userEmail, user_name: userName, status: "waiting" })
    .select()
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Session oluşturulamadı" }, { status: 500 });
  }

  const adminUrl = `${APP_URL}/admin?tab=support&session=${session.id}`;
  const displayName = userName || userEmail;

  // 1. Her admin'e doğrudan email gönder (Resend ile)
  for (const adminEmail of ADMIN_EMAILS) {
    resend.emails.send({
      from: FROM,
      to: adminEmail,
      subject: `🔴 Canlı Destek Talebi — ${displayName}`,
      html: `
        <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:28px 24px;border-radius:16px;">
          <p style="margin:0 0 24px;font-size:18px;font-weight:800;color:#fff;">BulanVarMı?</p>
          <div style="background:#450a0a;border:1px solid #7f1d1d;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <h1 style="font-size:18px;font-weight:700;margin:0 0 8px;color:#fca5a5;">🔴 Canlı Destek Talebi</h1>
            <p style="color:#fca5a5;margin:0;">
              <strong>${displayName}</strong> (${userEmail}) destek kuyruğunda bekliyor.
            </p>
          </div>
          <a href="${adminUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 26px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
            Admin Panelinde Yanıtla →
          </a>
          <p style="margin-top:24px;font-size:11px;color:#475569;">Bu bildirim BulanVarMı? canlı destek sistemi tarafından gönderilmiştir.</p>
        </div>
      `,
    }).catch((err) => console.error("Support email error:", err));
  }

  // 2. Telegram bildirimi
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHANNEL_ID) {
    const msg = `🔴 <b>Canlı Destek Talebi</b>\n\n👤 <b>${displayName}</b>\n📧 ${userEmail}\n\n<a href="${adminUrl}">Admin panelinde yanıtla →</a>`;
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        text: msg,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    }).catch((err) => console.error("Support telegram error:", err));
  }

  // 3. Push (admin push subscription varsa)
  try {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_email", ADMIN_EMAILS);

    if (subs && subs.length > 0) {
      const webpush = (await import("web-push")).default;
      if (process.env.VAPID_EMAIL && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          process.env.VAPID_EMAIL,
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        const payload = JSON.stringify({
          title: "🔴 Canlı Destek Talebi",
          body: `${displayName} destek kuyruğunda bekliyor.`,
          url: adminUrl,
          tag: `support-${session.id}`,
        });
        await Promise.allSettled(
          subs.map((sub) =>
            webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            )
          )
        );
      }
    }
  } catch {
    // push olmasa da devam et
  }

  return NextResponse.json({ sessionId: session.id, status: "waiting" });
}

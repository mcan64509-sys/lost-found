import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com";
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  let userId: string | null = null;
  let userEmail = "";
  let userName = "";

  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      userId = user.id;
      userEmail = user.email ?? "";
      userName = (user.user_metadata?.full_name as string) || userEmail.split("@")[0];
    }
  }

  // Anonim kullanıcılar için body'den email/name al
  if (!userEmail) {
    const body = await req.json().catch(() => ({}));
    userEmail = body.email || "anonim@bulanvarmi.com";
    userName = body.name || "Anonim Kullanıcı";
  }

  // Bekleyen açık session var mı?
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

  // Admin'e bildirimler
  const adminSupportUrl = `${APP_URL}/admin?tab=support&session=${session.id}`;

  // 1. Push + Email (her admin için)
  for (const adminEmail of ADMIN_EMAILS) {
    fetch(`${APP_URL}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.CRON_SECRET || "",
      },
      body: JSON.stringify({
        userEmail: adminEmail,
        title: "🔴 Canlı Destek Talebi",
        body: `${userName} destek kuyruğunda bekliyor.`,
        url: adminSupportUrl,
        tag: `support-${session.id}`,
        sendEmail: true,
      }),
    }).catch(() => {});
  }

  // 2. Telegram
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHANNEL_ID) {
    const msg = `🔴 <b>Canlı Destek Talebi</b>\n\n👤 <b>${userName}</b> (${userEmail}) destek kuyruğunda bekliyor.\n\n<a href="${adminSupportUrl}">Admin panelinde yanıtla →</a>`;
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        text: msg,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ sessionId: session.id, status: "waiting" });
}

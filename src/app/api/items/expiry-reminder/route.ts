import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "BulanVarMı? <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

type ExpiringItem = {
  id: string;
  title: string;
  created_by_email: string;
  expires_at: string;
  type: string | null;
};

async function sendExpiryReminderEmail(item: ExpiringItem): Promise<void> {
  const expiresDate = new Date(item.expires_at).toLocaleDateString("tr-TR");
  await resend.emails.send({
    from: FROM,
    to: item.created_by_email,
    subject: `⏰ İlanınız 3 gün içinde sona eriyor — ${item.title}`,
    html: `
      <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:28px 24px;border-radius:16px;">
        <p style="margin:0 0 24px;font-size:18px;font-weight:800;color:#fff;">BulanVarMı?</p>
        <div style="background:#1e293b;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
          <h1 style="font-size:18px;font-weight:700;margin:0 0 10px;color:#fbbf24;">⏰ İlanınız yakında sona eriyor</h1>
          <p style="color:#94a3b8;line-height:1.6;margin:0 0 8px;">
            "<strong style="color:#e2e8f0;">${item.title}</strong>" başlıklı ilanınız
            <strong style="color:#fbbf24;">${expiresDate}</strong> tarihinde sona erecek.
          </p>
          <p style="color:#94a3b8;line-height:1.6;margin:0;">
            İlanınızı uzatmak veya güncellemek için ilanınızı ziyaret edebilirsiniz.
          </p>
        </div>
        <a href="${APP_URL}/items/${item.id}" style="display:inline-block;background:#2563eb;color:#fff;padding:11px 22px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">İlanı Görüntüle →</a>
        <p style="margin-top:32px;font-size:11px;color:#475569;">Bu e-posta BulanVarMı? platformu tarafından gönderilmiştir. <a href="${APP_URL}" style="color:#60a5fa;text-decoration:none;">Platforma git →</a></p>
      </div>
    `,
  });
}

async function processExpiryReminders() {
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { data: expiringItems, error } = await supabase
    .from("items")
    .select("id, title, created_by_email, expires_at, type")
    .neq("status", "resolved")
    .gte("expires_at", now.toISOString())
    .lte("expires_at", threeDaysLater.toISOString());

  if (error) {
    return { error: error.message, sent: 0 };
  }

  if (!expiringItems || expiringItems.length === 0) {
    return { sent: 0, total: 0 };
  }

  let sent = 0;
  for (const item of expiringItems as ExpiringItem[]) {
    if (!item.created_by_email) continue;
    try {
      await sendExpiryReminderEmail(item);

      await supabase.from("notifications").insert({
        user_email: item.created_by_email,
        type: "expiry_reminder",
        title: "İlanınız 3 gün içinde sona eriyor",
        message: item.title,
        item_id: item.id,
        is_read: false,
      });

      sent++;
    } catch {
      // continue on email error
    }
  }

  return { sent, total: expiringItems.length };
}

// GET: cron job ile çağrılır — ?secret=CRON_SECRET
export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processExpiryReminders();
  return NextResponse.json(result);
}

// POST: admin panelinden çağrılır — Authorization: Bearer <jwt>
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = user.email.toLowerCase().trim();
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(userEmail)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await processExpiryReminders();
  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendExpiryReminderSmartEmail } from "../../../../lib/email";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAILS = ((process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS) || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Kaç gün kala bildirim gönderilecek
const REMINDER_DAYS = [7, 3, 1];

type ExpiringItem = {
  id: string;
  title: string;
  created_by_email: string;
  expires_at: string;
  type: string | null;
};

async function processExpiryReminders() {
  const now = new Date();
  let sent = 0;
  let skipped = 0;

  for (const daysLeft of REMINDER_DAYS) {
    const windowStart = new Date(now.getTime() + (daysLeft - 1) * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + daysLeft * 24 * 60 * 60 * 1000);

    const { data: expiringItems, error } = await supabase
      .from("items")
      .select("id, title, created_by_email, expires_at, type")
      .neq("status", "resolved")
      .gte("expires_at", windowStart.toISOString())
      .lte("expires_at", windowEnd.toISOString());

    if (error || !expiringItems) continue;

    for (const item of expiringItems as ExpiringItem[]) {
      if (!item.created_by_email) { skipped++; continue; }

      // Aynı gün için zaten bildirim gönderildi mi?
      const notifType = `expiry_reminder_${daysLeft}d`;
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("type", notifType)
        .eq("item_id", item.id)
        .gte("created_at", new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existing) { skipped++; continue; }

      try {
        // Magic link token oluştur (7 gün geçerli)
        const token = crypto.randomUUID();
        const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await supabase
          .from("items")
          .update({ renew_token: token, renew_token_expires_at: tokenExpiry.toISOString() })
          .eq("id", item.id);

        await sendExpiryReminderSmartEmail({
          ownerEmail: item.created_by_email,
          itemTitle: item.title,
          itemId: item.id,
          daysLeft,
          renewToken: token,
        });

        await supabase.from("notifications").insert({
          user_email: item.created_by_email,
          type: notifType,
          title: `İlanınız ${daysLeft} gün içinde sona eriyor`,
          message: item.title,
          item_id: item.id,
          is_read: false,
        });

        sent++;
      } catch {
        skipped++;
      }
    }
  }

  return { sent, skipped };
}

// GET: cron job ile çağrılır — ?secret=CRON_SECRET
export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  const bearer = (req as Request & { headers: Headers }).headers.get("authorization");
  const authorized =
    secret === process.env.CRON_SECRET || bearer === `Bearer ${process.env.CRON_SECRET}`;
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await processExpiryReminders();
  return NextResponse.json(result);
}

// POST: admin panelinden çağrılır
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userEmail = user.email.toLowerCase().trim();
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(userEmail)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await processExpiryReminders();
  return NextResponse.json(result);
}

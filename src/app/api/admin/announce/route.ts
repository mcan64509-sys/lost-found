import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "BulanVarMı? <support@bulanvarmi.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com";

const ADMIN_EMAILS = ((process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS) || "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return false;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase().trim());
}

export async function POST(req: NextRequest) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { subject, message, targets, sendEmail, sendNotification } = await req.json();
  // targets: "all" | string[] (email listesi)

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Konu ve mesaj gerekli" }, { status: 400 });
  }
  if (!sendEmail && !sendNotification) {
    return NextResponse.json({ error: "En az bir gönderim türü seçin" }, { status: 400 });
  }

  // Alıcıları belirle
  let emails: string[] = [];
  if (targets === "all") {
    const { data } = await supabaseAdmin.from("profiles").select("email").not("email", "is", null);
    emails = (data || []).map((p) => p.email as string).filter(Boolean);
  } else if (Array.isArray(targets) && targets.length > 0) {
    emails = targets.map((e: string) => e.trim().toLowerCase()).filter(Boolean);
  }

  if (emails.length === 0) return NextResponse.json({ error: "Alıcı bulunamadı" }, { status: 400 });

  let notifSent = 0;
  let emailSent = 0;
  let emailFailed = 0;

  // Uygulama bildirimleri — toplu insert
  if (sendNotification) {
    const notifs = emails.map((email) => ({
      user_email: email,
      type: "admin_announce",
      title: subject.trim(),
      message: message.trim(),
      item_id: null,
      is_read: false,
    }));
    const { error } = await supabaseAdmin.from("notifications").insert(notifs);
    if (!error) notifSent = emails.length;
  }

  // Mailler — Resend rate limit için 300ms aralık
  if (sendEmail) {
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:28px 24px;border-radius:16px;">
        <p style="margin:0 0 20px;font-size:18px;font-weight:800;color:#fff;">BulanVarMı?</p>
        <h1 style="font-size:20px;font-weight:700;margin:0 0 16px;color:#fff;">${subject.trim()}</h1>
        <div style="color:#cbd5e1;font-size:15px;line-height:1.7;white-space:pre-wrap;">${message.trim()}</div>
        <div style="margin-top:28px;padding-top:20px;border-top:1px solid #1e293b;">
          <a href="${APP_URL}" style="display:inline-block;background:#2563eb;color:#fff;padding:11px 22px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">Platforma Git →</a>
        </div>
        <p style="margin-top:24px;font-size:11px;color:#475569;">Bu mesaj BulanVarMı? yönetimi tarafından gönderilmiştir.</p>
      </div>
    `;

    for (const email of emails) {
      try {
        await resend.emails.send({ from: FROM, to: email, subject: subject.trim(), html });
        emailSent++;
      } catch {
        emailFailed++;
      }
      // Resend rate limit
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return NextResponse.json({ ok: true, recipients: emails.length, notifSent, emailSent, emailFailed });
}

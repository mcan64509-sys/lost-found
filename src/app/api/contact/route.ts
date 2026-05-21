import { NextRequest, NextResponse } from "next/server";
import { sendContactToAdminEmail, sendContactConfirmationEmail } from "../../../lib/email";
import { checkRateLimit, getClientIp } from "../../../lib/ratelimit";

const ADMIN_EMAILS = ["support@bulanvarmi.com"];

const SUBJECTS = [
  "Hesap Sorunu",
  "Teknik Sorun",
  "İlan Sorunu",
  "Ödeme Sorunu",
  "Gizlilik & KVKK",
  "İş Birliği",
  "Diğer",
];

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`contact:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Çok fazla istek. Lütfen bekleyin." }, { status: 429 });
    }

    const { name, email, subject, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Tüm alanlar zorunludur." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Geçerli bir e-posta girin." }, { status: 400 });
    }
    if (!SUBJECTS.includes(subject)) {
      return NextResponse.json({ error: "Geçersiz konu." }, { status: 400 });
    }
    if (message.trim().length > 2000) {
      return NextResponse.json({ error: "Mesaj çok uzun (maks. 2000 karakter)." }, { status: 400 });
    }

    await Promise.all([
      ...ADMIN_EMAILS.map((adminEmail) =>
        sendContactToAdminEmail({
          fromName: name.trim(),
          fromEmail: email.trim().toLowerCase(),
          subject: subject.trim(),
          message: message.trim(),
          adminEmail,
        })
      ),
      sendContactConfirmationEmail({
        toEmail: email.trim().toLowerCase(),
        toName: name.trim(),
        subject: subject.trim(),
      }).catch((err) => console.error("Contact confirmation email failed:", err)),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact email error:", err);
    return NextResponse.json({ error: "Gönderim başarısız, lütfen tekrar deneyin." }, { status: 500 });
  }
}

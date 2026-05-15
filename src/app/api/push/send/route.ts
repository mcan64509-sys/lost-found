import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "BulanVarMı? <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    // Lazy init — env yoksa build patlamaz, sadece runtime'da hata verir
    if (process.env.VAPID_EMAIL && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        process.env.VAPID_EMAIL,
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }

    const { userEmail, title, body, url, sendEmail = false } = await req.json();
    if (!userEmail || !title) {
      return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });
    }

    // Push bildirimi gönder
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_email", userEmail);

    let pushSent = 0;
    if (subs?.length) {
      const payload = JSON.stringify({ title, body, url: url || "/" });
      const results = await Promise.allSettled(
        subs.map((sub) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
        )
      );
      pushSent = results.filter((r) => r.status === "fulfilled").length;

      // Başarısız abonelikleri temizle
      const failed = results
        .map((r, i) => (r.status === "rejected" ? subs[i].endpoint : null))
        .filter(Boolean);
      if (failed.length > 0) {
        await supabase.from("push_subscriptions").delete().in("endpoint", failed);
      }
    }

    // E-posta bildirimi (isteğe bağlı, sendEmail=true gelirse)
    let emailSent = false;
    if (sendEmail && userEmail) {
      const fullUrl = url ? (url.startsWith("http") ? url : `${APP_URL}${url}`) : APP_URL;
      await resend.emails.send({
        from: FROM,
        to: userEmail,
        subject: title,
        html: `
          <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:28px 24px;border-radius:16px;">
            <p style="margin:0 0 24px;font-size:18px;font-weight:800;color:#fff;">BulanVarMı?</p>
            <h1 style="font-size:20px;font-weight:700;margin:0 0 12px;color:#fff;">${title}</h1>
            ${body ? `<p style="color:#94a3b8;line-height:1.6;margin:0;">${body}</p>` : ""}
            ${url ? `<a href="${fullUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:11px 22px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;margin-top:20px;">Görüntüle →</a>` : ""}
            <p style="margin-top:32px;font-size:11px;color:#475569;">Bu e-posta BulanVarMı? platformu tarafından gönderilmiştir. <a href="${APP_URL}" style="color:#60a5fa;text-decoration:none;">Platforma git →</a></p>
          </div>
        `,
      }).then(() => { emailSent = true; }).catch(() => {});
    }

    return NextResponse.json({ pushSent, emailSent });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

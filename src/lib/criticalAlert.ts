import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(",")[0].trim();
const FROM = process.env.RESEND_FROM_EMAIL || "BulanVarMı? <support@bulanvarmi.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com";

export async function sendCriticalAlert(
  title: string,
  details: string,
  route?: string
): Promise<void> {
  if (!ADMIN_EMAIL || !process.env.RESEND_API_KEY) return;

  const now = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `🚨 Sistem Hatası: ${title}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:28px 24px;border-radius:16px;">
        <p style="margin:0 0 20px;font-size:18px;font-weight:800;color:#fff;">BulanVarMı? — Acil Sistem Hatası</p>

        <div style="background:#450a0a;border:1px solid #7f1d1d;border-radius:12px;padding:16px;margin-bottom:16px;">
          <p style="margin:0 0 6px;color:#fca5a5;font-size:11px;font-weight:700;text-transform:uppercase;">🚨 Hata</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#fff;">${title}</p>
          ${route ? `<p style="margin:6px 0 0;font-size:12px;color:#f87171;">Route: ${route}</p>` : ""}
          <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;">Zaman: ${now}</p>
        </div>

        <div style="background:#1e293b;border-radius:12px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 8px;color:#94a3b8;font-size:11px;text-transform:uppercase;">Detay</p>
          <pre style="margin:0;font-size:13px;color:#e2e8f0;white-space:pre-wrap;word-break:break-all;">${details}</pre>
        </div>

        <a href="${APP_URL}/admin" style="display:inline-block;background:#dc2626;color:#fff;padding:11px 22px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">Admin Paneline Git →</a>

        <p style="margin-top:24px;font-size:11px;color:#475569;">BulanVarMı? otomatik hata alarmı</p>
      </div>
    `,
  }).catch(() => {});
}

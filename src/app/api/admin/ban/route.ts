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
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function getCallerEmail(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user?.email) return null;
  return user.email.toLowerCase().trim();
}

export async function POST(req: NextRequest) {
  const callerEmail = await getCallerEmail(req);
  if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { targetEmail, ban, banDurationDays, banReason } = await req.json();

  if (!targetEmail) {
    return NextResponse.json({ error: "targetEmail gerekli" }, { status: 400 });
  }
  if (targetEmail.toLowerCase() === callerEmail) {
    return NextResponse.json({ error: "Kendinizi engelleyemezsiniz" }, { status: 400 });
  }

  const bannedUntil =
    ban && banDurationDays && banDurationDays > 0
      ? new Date(Date.now() + banDurationDays * 86_400_000).toISOString()
      : null;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      is_banned: !!ban,
      banned_until: ban ? bannedUntil : null,
      ban_reason: ban ? (banReason || null) : null,
    })
    .eq("email", targetEmail);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const durationLabel = banDurationDays === 1 ? "24 saat" : banDurationDays === 7 ? "7 gün" : banDurationDays === 30 ? "30 gün" : null;
  const banEndStr = bannedUntil ? `<p style="color:#fca5a5;font-size:13px;margin:8px 0 0;">Ban süresi: <strong>${durationLabel ?? `${banDurationDays} gün`}</strong> — ${new Date(bannedUntil).toLocaleDateString("tr-TR")} tarihinde otomatik kalkacak.</p>` : "";
  const reasonStr = banReason ? `<div style="margin-top:12px;padding:10px 14px;background:#3b0f0f;border-radius:8px;border-left:3px solid #ef4444;"><p style="color:#fca5a5;font-size:13px;margin:0;"><strong>Sebep:</strong> ${banReason}</p></div>` : "";

  // Ban/unban bildirim emaili
  resend.emails.send({
    from: FROM,
    to: targetEmail,
    subject: ban
      ? "Hesabınız askıya alındı — BulanVarMı?"
      : "Hesabınız tekrar aktif — BulanVarMı?",
    html: ban
      ? `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:28px 24px;border-radius:16px;">
          <p style="font-size:18px;font-weight:800;color:#fff;margin:0 0 20px">BulanVarMı?</p>
          <div style="background:#450a0a;border:1px solid #7f1d1d;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <p style="color:#fca5a5;font-weight:700;margin:0 0 8px">Hesabınız askıya alındı</p>
            <p style="color:#fca5a5;margin:0;font-size:14px;">Platform kurallarını ihlal ettiğiniz tespit edildiğinden hesabınız ${durationLabel ? `<strong>${durationLabel}</strong> süreyle` : "kalıcı olarak"} askıya alınmıştır.</p>
            ${banEndStr}
            ${reasonStr}
          </div>
          <p style="color:#94a3b8;font-size:13px;margin:0 0 16px;">Kararın hatalı olduğunu düşünüyorsanız destek ekibimizle iletişime geçebilirsiniz.</p>
          <a href="${APP_URL}/destek" style="display:inline-block;background:#2563eb;color:#fff;padding:11px 22px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">Destek ile İletişime Geç →</a>
          <p style="margin-top:24px;font-size:11px;color:#475569;">BulanVarMı? — <a href="${APP_URL}" style="color:#60a5fa;text-decoration:none;">bulanvarmi.com</a></p>
        </div>`
      : `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:28px 24px;border-radius:16px;">
          <p style="font-size:18px;font-weight:800;color:#fff;margin:0 0 20px">BulanVarMı?</p>
          <div style="background:#052e16;border:1px solid #166534;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <p style="color:#86efac;font-weight:700;margin:0 0 8px">Hesabınız tekrar aktif</p>
            <p style="color:#86efac;margin:0;font-size:14px;">Hesabınızdaki kısıtlama kaldırılmıştır. Platformumuzu yeniden kullanabilirsiniz.</p>
          </div>
          <a href="${APP_URL}" style="display:inline-block;background:#2563eb;color:#fff;padding:11px 22px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">Platforma Git →</a>
          <p style="margin-top:24px;font-size:11px;color:#475569;">BulanVarMı? — <a href="${APP_URL}" style="color:#60a5fa;text-decoration:none;">bulanvarmi.com</a></p>
        </div>`,
  }).catch((err) => console.error("Ban email error:", err));

  return NextResponse.json({ success: true, banned: !!ban });
}

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const anthropic = new Anthropic();
const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com";
const FROM = process.env.RESEND_FROM_EMAIL || "BulanVarMı? <support@bulanvarmi.com>";
const ADMIN_EMAIL = "support@bulanvarmi.com";

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  yaniltici: "Yanıltıcı",
  uygunsuz: "Uygunsuz",
  duplicate: "Tekrar ilan",
  diger: "Diğer",
};

const ACTION_LABELS: Record<string, string> = {
  remove_item: "🗑️ İlanı kaldır",
  warn_user: "⚠️ Kullanıcıyı uyar",
  dismiss: "✅ Görmezden gel",
};

type ItemJoin = {
  id?: string; title?: string; type?: string; category?: string;
  location?: string; description?: string; created_by_email?: string;
  status?: string; moderation_status?: string;
} | null;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-agent-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await req.json();
  if (!reportId) return NextResponse.json({ error: "reportId gerekli" }, { status: 400 });

  const { data: report } = await supabase
    .from("reports")
    .select("*, items(id, title, type, category, location, description, created_by_email, status, moderation_status)")
    .eq("id", reportId)
    .single();

  if (!report) return NextResponse.json({ error: "Rapor bulunamadı" }, { status: 404 });

  const { count: reporterCount } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("reporter_email", report.reporter_email);

  const { count: itemReportCount } = report.item_id
    ? await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("item_id", report.item_id)
    : { count: 0 };

  const item = report.items as ItemJoin;

  const context = `
Şikayet:
- Sebep: ${REASON_LABELS[report.reason] ?? report.reason}
- Açıklama: ${report.details || "(yok)"}
- Şikayet eden: ${report.reporter_email} (toplam ${reporterCount ?? 0} şikayet göndermiş)
- İlan: "${item?.title ?? "—"}" (${item?.type === "lost" ? "Kayıp" : "Bulundu"}, ${item?.category ?? "-"}, ${item?.location ?? "-"})
- İlan sahibi: ${item?.created_by_email ?? "—"}
- Bu ilana gelen toplam şikayet sayısı: ${itemReportCount ?? 1}
- İlan durumu: ${item?.status ?? "—"}, Moderasyon: ${item?.moderation_status ?? "yok"}
${item?.description ? `- İlan açıklaması: ${item.description.slice(0, 200)}` : ""}
`;

  let analysis = "";
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: `Sen BulanVarMı? platformunun admin asistanısın. Kullanıcı şikayetlerini değerlendirip Türkçe analiz yapıyorsun.

Değerlendir:
1. Şikayet gerçek mi, spam mı?
2. Önerilen aksiyon: remove_item (ilanı kaldır), warn_user (kullanıcıyı uyar) veya dismiss (görmezden gel)

Yanıt formatı:
AKSIYON: [remove_item | warn_user | dismiss]
ANALIZ: [2-3 cümle Türkçe açıklama]`,
      messages: [{ role: "user", content: context }],
    });
    const text = response.content.find((b) => b.type === "text");
    analysis = text ? (text as Anthropic.TextBlock).text : "";
  } catch {
    analysis = "AKSIYON: dismiss\nANALIZ: Claude analizi yapılamadı.";
  }

  const actionMatch = analysis.match(/AKSIYON:\s*(remove_item|warn_user|dismiss)/i);
  const recommendedAction = actionMatch?.[1] ?? "dismiss";
  const analysiText = analysis.replace(/AKSIYON:.*\n?/i, "").replace(/ANALIZ:/i, "").trim();

  if (ADMIN_EMAIL) {
    const itemUrl = item?.id ? `${APP_URL}/items/${item.id}` : APP_URL;

    await resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `🚨 Yeni Şikayet: ${REASON_LABELS[report.reason] ?? report.reason} — ${item?.title ?? "—"}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:28px 24px;border-radius:16px;">
          <p style="margin:0 0 20px;font-size:18px;font-weight:800;color:#fff;">BulanVarMı? — Şikayet Raporu</p>

          <div style="background:#1e293b;border-radius:12px;padding:16px;margin-bottom:14px;">
            <p style="margin:0 0 6px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.05em;">Şikayet</p>
            <p style="margin:0;font-size:16px;font-weight:700;color:#f87171;">${REASON_LABELS[report.reason] ?? report.reason}</p>
            ${report.details ? `<p style="margin:8px 0 0;color:#cbd5e1;font-size:14px;">${report.details}</p>` : ""}
            <p style="margin:8px 0 0;color:#64748b;font-size:12px;">Şikayet eden: ${report.reporter_email} · Toplam ${reporterCount ?? 0} şikayet</p>
          </div>

          <div style="background:#1e293b;border-radius:12px;padding:16px;margin-bottom:14px;">
            <p style="margin:0 0 6px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.05em;">İlan</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#fff;">${item?.title ?? "—"}</p>
            <p style="margin:4px 0 0;color:#64748b;font-size:12px;">${item?.type === "lost" ? "Kayıp" : "Bulundu"} · ${item?.category ?? "-"} · ${item?.location ?? "-"}</p>
            <p style="margin:4px 0 0;color:#64748b;font-size:12px;">Sahibi: ${item?.created_by_email ?? "—"} · Bu ilana gelen şikayet: ${itemReportCount ?? 1}</p>
            <a href="${itemUrl}" style="display:inline-block;margin-top:10px;color:#60a5fa;font-size:13px;text-decoration:none;">İlanı Görüntüle →</a>
          </div>

          <div style="background:#1a2744;border-left:3px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px;margin-bottom:20px;">
            <p style="margin:0 0 8px;color:#93c5fd;font-size:11px;font-weight:700;text-transform:uppercase;">🤖 AI Analizi</p>
            <p style="margin:0;color:#e2e8f0;font-size:14px;line-height:1.6;">${analysiText}</p>
            <p style="margin:12px 0 0;font-size:14px;font-weight:700;color:#fbbf24;">Öneri: ${ACTION_LABELS[recommendedAction]}</p>
          </div>

          <a href="${APP_URL}/admin" style="display:inline-block;background:#2563eb;color:#fff;padding:11px 22px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">Admin Paneline Git →</a>

          <p style="margin-top:24px;font-size:11px;color:#475569;">BulanVarMı? otomatik şikayet analizi · <a href="${APP_URL}" style="color:#60a5fa;text-decoration:none;">bulanvarmi.com</a></p>
        </div>
      `,
    });
  }

  return NextResponse.json({ recommended: recommendedAction });
}

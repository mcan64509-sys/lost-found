import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getAuthenticatedUser } from "../../../../lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const anthropic = new Anthropic();
const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com";
const FROM = process.env.RESEND_FROM_EMAIL || "BulanVarMı? <support@bulanvarmi.com>";
const _adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean);
const ADMIN_EMAIL = _adminEmails.find((e) => !e.startsWith("support@")) ?? _adminEmails[0] ?? "mcan64509@gmail.com";

async function runReport(alertOnly = false) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [pendingReports, flaggedItems, noEmbedItems, totalItems, totalUsers] = await Promise.all([
    supabase
      .from("reports")
      .select("id, reason, details, reporter_email, created_at, items(title)", { count: "exact" })
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("items")
      .select("id, title, category, location")
      .eq("moderation_status", "flagged")
      .gte("updated_at", since),
    supabase
      .from("items")
      .select("id, title, created_at")
      .is("embedding", null)
      .gte("created_at", since),
    supabase.from("items").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  type ReportRow = { id: string; reason: string; details?: string; reporter_email: string; items?: { title?: string } | null };
  type ItemRow = { id: string; title: string; category?: string; location?: string };

  const reports = (pendingReports.data || []) as ReportRow[];
  const flagged = (flaggedItems.data || []) as ItemRow[];
  const noEmbed = (noEmbedItems.data || []) as ItemRow[];

  const dataSummary = `
Platform özeti:
- Toplam aktif ilan: ${totalItems.count ?? "?"}
- Toplam kullanıcı: ${totalUsers.count ?? "?"}

Bekleyen şikayetler (toplam): ${pendingReports.count ?? 0}
${reports.slice(0, 5).map((r) => `  • ${r.reason}: "${r.items?.title ?? "kullanıcı şikayeti"}" — ${r.reporter_email}`).join("\n") || "  (yok)"}

Son 24 saatte işaretlenen ilanlar: ${flagged.length}
${flagged.map((i) => `  • "${i.title}" (${i.category ?? "-"}, ${i.location ?? "-"})`).join("\n") || "  (yok)"}

Son 24 saatte embedding hatası şüpheli (embedding=null): ${noEmbed.length}
${noEmbed.map((i) => `  • "${i.title}"`).join("\n") || "  (yok)"}
`;

  let aiText = "";
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 9000);
    const response = await anthropic.messages.create(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: `Sen BulanVarMı? platformunun admin asistanısın. Günlük platform sağlık raporunu kısa Türkçe yaz.
Acil durum varsa (çok sayıda şikayet, toplu flag, embedding sorunu) özellikle belirt.
Her şey normalse "Genel durum iyi." diye başla.
Sadece anlamlı uyarılar ver, gereksiz tekrar etme.`,
        messages: [{ role: "user", content: dataSummary }],
      },
      { signal: ac.signal }
    );
    clearTimeout(timer);
    const text = response.content.find((b) => b.type === "text");
    aiText = text ? (text as Anthropic.TextBlock).text : "";
  } catch {
    aiText = "AI özeti oluşturulamadı.";
  }

  const hasIssues = (pendingReports.count ?? 0) > 0 || flagged.length > 0 || noEmbed.length > 0;

  // alertOnly modunda sorun yoksa e-posta gönderme
  if (alertOnly && !hasIssues) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no_issues" });
  }

  let emailError: string | null = null;
  if (ADMIN_EMAIL) {
    try {
      await resend.emails.send({
        from: FROM,
        to: ADMIN_EMAIL,
        subject: `${hasIssues ? "⚠️" : "✅"} BulanVarMı? Günlük Platform Raporu`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:28px 24px;border-radius:16px;">
          <p style="margin:0 0 4px;font-size:18px;font-weight:800;color:#fff;">BulanVarMı? — Günlük Rapor</p>
          <p style="margin:0 0 24px;font-size:12px;color:#64748b;">${new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</p>

          <div style="display:flex;gap:12px;margin-bottom:20px;">
            <div style="flex:1;background:#1e293b;border-radius:12px;padding:14px;text-align:center;">
              <p style="margin:0;font-size:24px;font-weight:800;color:#fff;">${totalItems.count ?? "?"}</p>
              <p style="margin:4px 0 0;font-size:11px;color:#64748b;">Aktif İlan</p>
            </div>
            <div style="flex:1;background:#1e293b;border-radius:12px;padding:14px;text-align:center;">
              <p style="margin:0;font-size:24px;font-weight:800;color:#fff;">${totalUsers.count ?? "?"}</p>
              <p style="margin:4px 0 0;font-size:11px;color:#64748b;">Kullanıcı</p>
            </div>
            <div style="flex:1;background:${(pendingReports.count ?? 0) > 0 ? "#450a0a" : "#1e293b"};border-radius:12px;padding:14px;text-align:center;">
              <p style="margin:0;font-size:24px;font-weight:800;color:${(pendingReports.count ?? 0) > 0 ? "#f87171" : "#fff"};">${pendingReports.count ?? 0}</p>
              <p style="margin:4px 0 0;font-size:11px;color:#64748b;">Bekleyen Şikayet</p>
            </div>
          </div>

          <div style="background:#1a2744;border-left:3px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px;margin-bottom:20px;">
            <p style="margin:0 0 8px;color:#93c5fd;font-size:11px;font-weight:700;text-transform:uppercase;">🤖 AI Özeti</p>
            <p style="margin:0;color:#e2e8f0;font-size:14px;line-height:1.6;">${aiText}</p>
          </div>

          ${
            reports.length > 0
              ? `<div style="background:#1e293b;border-radius:12px;padding:16px;margin-bottom:14px;">
              <p style="margin:0 0 10px;color:#f87171;font-size:13px;font-weight:700;">⚠️ Bekleyen Şikayetler (${pendingReports.count ?? 0})</p>
              ${reports
                .slice(0, 5)
                .map(
                  (r) =>
                    `<div style="border-top:1px solid #0f172a;padding:8px 0;"><p style="margin:0;font-size:13px;color:#e2e8f0;"><strong>${r.reason}</strong> — ${r.items?.title ?? "kullanıcı"}</p><p style="margin:2px 0 0;font-size:11px;color:#64748b;">${r.reporter_email}</p></div>`
                )
                .join("")}
            </div>`
              : ""
          }

          ${
            flagged.length > 0
              ? `<div style="background:#1e293b;border-radius:12px;padding:16px;margin-bottom:14px;">
              <p style="margin:0 0 10px;color:#fbbf24;font-size:13px;font-weight:700;">🚩 Son 24h İşaretlenen İlanlar (${flagged.length})</p>
              ${flagged
                .map(
                  (i) =>
                    `<div style="border-top:1px solid #0f172a;padding:8px 0;"><a href="${APP_URL}/items/${i.id}" style="color:#60a5fa;font-size:13px;text-decoration:none;">${i.title}</a><span style="color:#64748b;font-size:11px;margin-left:8px;">${i.category ?? ""} ${i.location ?? ""}</span></div>`
                )
                .join("")}
            </div>`
              : ""
          }

          ${
            noEmbed.length > 0
              ? `<div style="background:#1e293b;border-radius:12px;padding:16px;margin-bottom:20px;">
              <p style="margin:0 0 10px;color:#94a3b8;font-size:13px;font-weight:700;">🔧 Embedding Hatası Şüpheli (${noEmbed.length})</p>
              ${noEmbed
                .map(
                  (i) =>
                    `<div style="border-top:1px solid #0f172a;padding:8px 0;"><a href="${APP_URL}/items/${i.id}" style="color:#60a5fa;font-size:13px;text-decoration:none;">${i.title}</a></div>`
                )
                .join("")}
            </div>`
              : ""
          }

          <a href="${APP_URL}/admin" style="display:inline-block;background:#2563eb;color:#fff;padding:11px 22px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">Admin Paneline Git →</a>

          <p style="margin-top:24px;font-size:11px;color:#475569;">BulanVarMı? otomatik günlük rapor · <a href="${APP_URL}" style="color:#60a5fa;text-decoration:none;">bulanvarmi.com</a></p>
        </div>
      `,
      });
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err);
      console.error("Daily report email failed:", emailError, "to:", ADMIN_EMAIL, "from:", FROM);
    }
  }

  return NextResponse.json({
    ok: true,
    sentTo: ADMIN_EMAIL,
    emailError,
    pendingReports: pendingReports.count ?? 0,
    flaggedItems: flagged.length,
    noEmbedItems: noEmbed.length,
  });
}

const ADMIN_EMAILS_LIST = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const bearer = req.headers.get("authorization") || "";
  const secret = url.searchParams.get("secret");
  if (bearer !== `Bearer ${process.env.CRON_SECRET}` && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const alertOnly = url.searchParams.get("alertOnly") === "1";
  return runReport(alertOnly);
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ADMIN_EMAILS_LIST boşsa (env set edilmemiş) → authenticated herhangi kullanıcı geçer
  if (ADMIN_EMAILS_LIST.length > 0 && !ADMIN_EMAILS_LIST.includes(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return runReport();
}

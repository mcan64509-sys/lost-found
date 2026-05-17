import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const anthropic = new Anthropic();
const FROM = process.env.RESEND_FROM_EMAIL || "BulanVarMı? <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com";

type Item = {
  id: string;
  title: string;
  type: string;
  category: string | null;
  location: string | null;
};

type Profile = {
  email: string;
  full_name: string | null;
};

async function generateIntro(userName: string, items: Item[], userCategories: string[]): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [{
        role: "user",
        content: `BulanVarMı? platformu haftalık digest emaili için kişisel bir giriş cümlesi yaz.
Kullanıcı adı: ${userName}
Kullanıcının ilgi kategorileri: ${userCategories.join(", ") || "genel"}
Bu haftaki ilan sayısı: ${items.length}

1-2 cümle, samimi, Türkçe. Sadece giriş metnini yaz, başka bir şey ekleme.`,
      }],
    });
    const text = response.content.find((b) => b.type === "text");
    return text ? (text as Anthropic.TextBlock).text : `Merhaba ${userName}, bu hafta ${items.length} yeni ilan var.`;
  } catch {
    return `Merhaba ${userName}, bu hafta ${items.length} yeni ilan eklendi.`;
  }
}

function buildEmail(intro: string, items: Item[]): string {
  const itemsHtml = items.slice(0, 8).map((item) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #1e293b;">
        <span style="display:inline-block;background:${item.type === "lost" ? "#7f1d1d" : "#14532d"};color:#fff;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700;margin-bottom:6px;">
          ${item.type === "lost" ? "Kayıp" : "Bulundu"}
        </span>
        <br/>
        <a href="${APP_URL}/items/${item.id}" style="color:#60a5fa;font-weight:600;text-decoration:none;font-size:15px;">${item.title}</a>
        <br/>
        <span style="color:#94a3b8;font-size:13px;">${item.category ?? "-"} · ${item.location ?? "-"}</span>
      </td>
    </tr>
  `).join("");

  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:28px 24px;border-radius:16px;">
      <p style="margin:0 0 4px;font-size:18px;font-weight:800;color:#fff;">BulanVarMı?</p>
      <p style="margin:0 0 24px;font-size:12px;color:#475569;">Haftalık Özet</p>
      <p style="color:#cbd5e1;line-height:1.7;margin:0 0 24px;">${intro}</p>
      <table style="width:100%;border-collapse:collapse;">${itemsHtml}</table>
      <div style="margin-top:24px;">
        <a href="${APP_URL}/search" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;">
          Tüm İlanları Gör →
        </a>
      </div>
      <p style="margin-top:32px;font-size:11px;color:#475569;">
        Bu e-posta haftalık özet olarak gönderilmiştir.
        <a href="${APP_URL}/profile" style="color:#60a5fa;text-decoration:none;">Bildirim tercihlerini değiştir</a>
      </p>
    </div>
  `;
}

export async function GET(req: Request) {
  const bearer = (req as Request & { headers: Headers }).headers.get("authorization");
  const secret = new URL(req.url).searchParams.get("secret");
  const authorized = bearer === `Bearer ${process.env.CRON_SECRET}` || secret === process.env.CRON_SECRET;
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Son 7 günde eklenen tüm ilanlar
  const { data: newItems } = await supabase
    .from("items")
    .select("id, title, type, category, location, created_by_email")
    .gte("created_at", sevenDaysAgo)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!newItems || newItems.length === 0) {
    return NextResponse.json({ sent: 0, reason: "bu hafta ilan yok" });
  }

  // Email bildirimi açık olan kullanıcıları al
  const { data: prefs } = await supabase
    .from("email_preferences")
    .select("user_email")
    .eq("weekly_digest", true);

  // Tercihi olmayan ama aktif ilanı olan kullanıcıları da dahil et
  const { data: activeUsers } = await supabase
    .from("items")
    .select("created_by_email")
    .eq("status", "active")
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const prefEmails = new Set((prefs ?? []).map((p: { user_email: string }) => p.user_email.toLowerCase()));
  const activeEmails = new Set((activeUsers ?? []).map((u: { created_by_email: string }) => u.created_by_email?.toLowerCase()).filter(Boolean));

  // Birleşik liste (tercih açık VEYA aktif kullanıcı)
  const targetEmails = new Set([...prefEmails, ...activeEmails]);

  // Yeni ilanı olan kişileri çıkar (kendi ilanından digest almak anlamsız)
  const newItemOwners = new Set(newItems.map((i: { created_by_email: string }) => i.created_by_email?.toLowerCase()).filter(Boolean));
  const recipients = [...targetEmails].filter((e) => !newItemOwners.has(e)).slice(0, 100); // max 100 per run

  if (recipients.length === 0) return NextResponse.json({ sent: 0 });

  // Profil bilgileri
  const { data: profiles } = await supabase
    .from("profiles")
    .select("email, full_name")
    .in("email", recipients);

  const profileMap = new Map((profiles ?? []).map((p: Profile) => [p.email.toLowerCase(), p]));

  // Her kullanıcının kendi kategorilerine göre ilanları filtrele
  const { data: userItems } = await supabase
    .from("items")
    .select("created_by_email, category")
    .in("created_by_email", recipients)
    .eq("type", "lost");

  const userCategoryMap = new Map<string, string[]>();
  for (const ui of (userItems ?? []) as { created_by_email: string; category: string | null }[]) {
    if (!ui.created_by_email || !ui.category) continue;
    const email = ui.created_by_email.toLowerCase();
    if (!userCategoryMap.has(email)) userCategoryMap.set(email, []);
    const cats = userCategoryMap.get(email)!;
    if (!cats.includes(ui.category)) cats.push(ui.category);
  }

  let sent = 0;
  for (const email of recipients) {
    const profile = profileMap.get(email);
    const userName = profile?.full_name?.split(" ")[0] ?? "Merhaba";
    const userCategories = userCategoryMap.get(email) ?? [];

    // Kullanıcının kategorileriyle eşleşen ilanları öne al
    const relevant = userCategories.length > 0
      ? [
          ...newItems.filter((i: Item) => userCategories.includes(i.category ?? "")),
          ...newItems.filter((i: Item) => !userCategories.includes(i.category ?? "")),
        ]
      : newItems as Item[];

    const intro = await generateIntro(userName, relevant.slice(0, 8), userCategories);

    try {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject: `📋 Haftalık Özet — ${newItems.length} yeni ilan`,
        html: buildEmail(intro, relevant as Item[]),
      });
      sent++;
    } catch {
      // email hatasında devam et
    }

    // Rate limit — Resend free tier 2 req/sec
    await new Promise((r) => setTimeout(r, 600));
  }

  return NextResponse.json({ sent, total: recipients.length, items: newItems.length });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { isValidEmail } from "../../../lib/utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { userEmail } = await req.json();
    if (!userEmail || !isValidEmail(userEmail)) {
      return NextResponse.json({ error: "Geçersiz email." }, { status: 400 });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: items } = await supabase
      .from("items")
      .select("id, title, type, category, location, date, image_url")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!items || items.length === 0) {
      return NextResponse.json({ message: "Son 7 günde ilan yok." });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #1e293b;">
          <a href="${appUrl}/items/${item.id}" style="color:#60a5fa;font-weight:600;text-decoration:none;">${item.title}</a>
          <br/><span style="color:#94a3b8;font-size:13px;">${item.type === "lost" ? "🔴 Kayıp" : "🟢 Bulundu"} · ${item.category || "-"} · ${item.location || "-"}</span>
        </td>
      </tr>
    `).join("");

    await resend.emails.send({
      from: "Lost & Found <onboarding@resend.dev>",
      to: userEmail,
      subject: `📋 Haftalık Özet — ${items.length} yeni ilan`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:24px;border-radius:16px;">
          <h1 style="font-size:22px;font-weight:800;margin:0 0 8px;">Lost &amp; Found — Haftalık Özet</h1>
          <p style="color:#94a3b8;margin:0 0 24px;">Son 7 günde ${items.length} yeni ilan eklendi.</p>
          <table style="width:100%;border-collapse:collapse;">
            ${itemsHtml}
          </table>
          <div style="margin-top:24px;">
            <a href="${appUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;">
              Tüm İlanları Gör
            </a>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, count: items.length });
  } catch {
    return NextResponse.json({ error: "Digest gönderilemedi." }, { status: 500 });
  }
}

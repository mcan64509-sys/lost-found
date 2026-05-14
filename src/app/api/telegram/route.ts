import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegram(chatId: number, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId: number = message.chat?.id;
    const text: string = (message.text || "").trim();
    const cmd = text.split(" ")[0].toLowerCase();
    const args = text.slice(cmd.length).trim();

    if (cmd === "/start" || cmd === "/yardim" || cmd === "/help") {
      await sendTelegram(chatId,
        "🔍 <b>BulanVarMı? Bot</b>\n\n" +
        "Komutlar:\n" +
        "/kayip — Son kayıp ilanlarını listele\n" +
        "/buldum — Son bulundu ilanlarını listele\n" +
        "/ara &lt;kelime&gt; — İlan ara\n" +
        "/site — Platform linkini göster"
      );
    } else if (cmd === "/kayip") {
      const { data } = await supabase
        .from("items")
        .select("id, title, category, location, created_at")
        .eq("type", "lost")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!data || data.length === 0) {
        await sendTelegram(chatId, "Aktif kayıp ilanı bulunamadı.");
      } else {
        const lines = data.map((item: { id: string; title: string; category: string | null; location: string | null }) =>
          `• <b>${item.title}</b>\n  📂 ${item.category || "—"} | 📍 ${item.location || "—"}\n  🔗 https://bulanvarmi.vercel.app/items/${item.id}`
        );
        await sendTelegram(chatId, "🔴 <b>Son Kayıp İlanları</b>\n\n" + lines.join("\n\n"));
      }
    } else if (cmd === "/buldum") {
      const { data } = await supabase
        .from("items")
        .select("id, title, category, location, created_at")
        .eq("type", "found")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!data || data.length === 0) {
        await sendTelegram(chatId, "Aktif bulundu ilanı bulunamadı.");
      } else {
        const lines = data.map((item: { id: string; title: string; category: string | null; location: string | null }) =>
          `• <b>${item.title}</b>\n  📂 ${item.category || "—"} | 📍 ${item.location || "—"}\n  🔗 https://bulanvarmi.vercel.app/items/${item.id}`
        );
        await sendTelegram(chatId, "🟢 <b>Son Bulundu İlanları</b>\n\n" + lines.join("\n\n"));
      }
    } else if (cmd === "/ara") {
      if (!args) {
        await sendTelegram(chatId, "Kullanım: /ara &lt;kelime&gt;\nÖrnek: /ara cüzdan");
      } else {
        const { data } = await supabase
          .from("items")
          .select("id, title, type, category, location")
          .eq("status", "active")
          .ilike("title", `%${args}%`)
          .limit(5);

        if (!data || data.length === 0) {
          await sendTelegram(chatId, `"${args}" için ilan bulunamadı.`);
        } else {
          const lines = data.map((item: { id: string; title: string; type: string; category: string | null; location: string | null }) =>
            `• [${item.type === "lost" ? "Kayıp" : "Bulundu"}] <b>${item.title}</b>\n  📍 ${item.location || "—"}\n  🔗 https://bulanvarmi.vercel.app/items/${item.id}`
          );
          await sendTelegram(chatId, `🔎 <b>"${args}" sonuçları</b>\n\n` + lines.join("\n\n"));
        }
      }
    } else if (cmd === "/site") {
      await sendTelegram(chatId, "🌐 BulanVarMı? platform: https://bulanvarmi.vercel.app");
    } else {
      await sendTelegram(chatId, "Bilinmeyen komut. /yardim yazarak komut listesini görebilirsiniz.");
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

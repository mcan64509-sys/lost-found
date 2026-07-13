import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic();
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegram(chatId: number | string, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

type ItemRow = {
  id: string;
  title: string;
  type: string;
  category: string | null;
  location: string | null;
  date: string | null;
  description: string | null;
};

const tools: Anthropic.Tool[] = [
  {
    name: "search_items",
    description: "Kayıp veya bulundu ilanlarını arar. Kullanıcının sorgusu, konum, kategori veya türe göre filtreler.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Aranacak kelime (başlık veya açıklamada arar)" },
        type: { type: "string", enum: ["lost", "found", "all"], description: "Kayıp, bulundu veya hepsi" },
        category: { type: "string", description: "Kategori filtresi (opsiyonel): Telefon, Cüzdan, Anahtar, Çanta, Laptop, Evcil Hayvan vb." },
        location: { type: "string", description: "Konum filtresi (opsiyonel)" },
        limit: { type: "number", description: "Maksimum sonuç sayısı (varsayılan 5, max 10)" },
      },
      required: ["type"],
    },
  },
  {
    name: "get_recent_items",
    description: "En son eklenen ilanları getirir.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: { type: "string", enum: ["lost", "found", "all"] },
        limit: { type: "number", description: "Kaç ilan (varsayılan 5)" },
      },
      required: ["type"],
    },
  },
];

async function executeTool(name: string, input: Record<string, string | number>): Promise<string> {
  if (name === "search_items") {
    const { query, type, category, location, limit = 5 } = input as {
      query?: string; type: string; category?: string; location?: string; limit?: number;
    };

    let q = supabase
      .from("items")
      .select("id, title, type, category, location, date, description")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(Math.min(Number(limit), 10));

    if (type !== "all") q = q.eq("type", type);
    if (query) q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    if (category) q = q.ilike("category", `%${category}%`);
    if (location) q = q.ilike("location", `%${location}%`);

    const { data } = await q;
    if (!data || data.length === 0) return "Sonuç bulunamadı.";

    return (data as ItemRow[]).map((item) =>
      `• [${item.type === "lost" ? "Kayıp" : "Bulundu"}] ${item.title} | ${item.category ?? "-"} | ${item.location ?? "-"} | ${APP_URL}/items/${item.id}`
    ).join("\n");
  }

  if (name === "get_recent_items") {
    const { type, limit = 5 } = input as { type: string; limit?: number };

    let q = supabase
      .from("items")
      .select("id, title, type, category, location, date")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(Math.min(Number(limit), 10));

    if (type !== "all") q = q.eq("type", type);

    const { data } = await q;
    if (!data || data.length === 0) return "Hiç ilan yok.";

    return (data as ItemRow[]).map((item) =>
      `• [${item.type === "lost" ? "Kayıp" : "Bulundu"}] ${item.title} | ${item.category ?? "-"} | ${item.location ?? "-"} | ${APP_URL}/items/${item.id}`
    ).join("\n");
  }

  return "Bilinmeyen araç";
}

async function handleWithAgent(userMessage: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return "AI servisi şu an kullanılamıyor.";
  }

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  for (let turn = 0; turn < 5; turn++) {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: `Sen BulanVarMı? platformunun Telegram botusun. Türkiye'de kayıp ve bulundu eşyaları bulmaya yardım ediyorsun.

Görevlerin:
- Kullanıcının doğal dil sorgusunu anlayıp ilgili ilanları ara
- Türkçe, kısa ve yardımsever yanıt ver
- Sonuçları düzenli listele, her ilanın linkini ekle
- Bulunamazsa alternatif öner (daha geniş arama, site linki vb.)

Platform: ${APP_URL}`,
      tools,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock ? (textBlock as Anthropic.TextBlock).text : "Bir sorun oluştu.";
    }

    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await executeTool(block.name, block.input as Record<string, string | number>);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
        }
      }
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    } else {
      break;
    }
  }

  return "Yanıt oluşturulamadı.";
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-telegram-bot-api-secret-token");
    if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ ok: true });
    }
    const body = await req.json();
    const message = body?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId: number = message.chat?.id;
    const text: string = (message.text || "").trim();
    if (!text || !chatId) return NextResponse.json({ ok: true });

    const cmd = text.split(" ")[0].toLowerCase();

    // Sabit komutlar
    if (cmd === "/start" || cmd === "/yardim" || cmd === "/help") {
      await sendTelegram(chatId,
        "🔍 <b>BulanVarMı? Bot</b>\n\n" +
        "Doğal dilde yazabilirsin:\n" +
        "• \"Kadıköy'de bulunan telefon var mı?\"\n" +
        "• \"Dün kaybolan siyah kedi ilanı\"\n" +
        "• \"İstanbul çanta kayıp\"\n\n" +
        "Komutlar:\n" +
        "/kayip — Son kayıp ilanları\n" +
        "/buldum — Son bulundu ilanları\n" +
        `/site — ${APP_URL}`
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/site") {
      await sendTelegram(chatId, `🌐 BulanVarMı?: ${APP_URL}`);
      return NextResponse.json({ ok: true });
    }

    // Tüm diğer mesajlar (komutlar dahil) Claude agent'a gider
    const agentInput = cmd === "/kayip"
      ? "Son kayıp ilanlarını listele"
      : cmd === "/buldum"
        ? "Son bulundu ilanlarını listele"
        : text;

    const reply = await handleWithAgent(agentInput);
    await sendTelegram(chatId, reply);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

// Yeni ilan kanalına bildirimi — ?itemId=xxx + x-agent-secret header (veya eski ?secret=xxx)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = req.headers.get("x-agent-secret") || searchParams.get("secret");
  const itemId = searchParams.get("itemId");

  if (secret !== process.env.CRON_SECRET || !itemId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!channelId || !BOT_TOKEN) {
    return NextResponse.json({ skipped: "kanal veya token yok" });
  }

  const { data: item } = await supabase
    .from("items")
    .select("id, title, type, category, location")
    .eq("id", itemId)
    .single();

  if (!item) return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });

  const typeLabel = item.type === "lost" ? "🔴 Kayıp" : "🟢 Bulundu";

  const text =
    `${typeLabel} Yeni İlan\n\n` +
    `<b>${item.title}</b>\n` +
    `📂 ${item.category ?? "-"}  📍 ${item.location ?? "-"}\n\n` +
    `🔗 ${APP_URL}/items/${item.id}`;

  await sendTelegram(channelId, text);

  return NextResponse.json({ ok: true });
}

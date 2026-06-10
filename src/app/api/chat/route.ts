import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit, getClientIp } from "../../../lib/ratelimit";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Sen BulanVarMı? platformunun yardımcı asistanısın. Bu platform Türkiye'de kayıp ve bulunmuş eşyaları sahipleriyle buluşturuyor.

Kullanıcılara şu konularda yardım edebilirsin:
- Kayıp eşya ararken ne yapmalılar (ilan verme, arama uyarısı kurma, yakın bürolara bildirme)
- Bulunan eşyayı sahibine ulaştırma süreci
- Platform özellikleri (harita, AI eşleştirme, talep sistemi, favoriler, uyarılar)
- Pratik ipuçları (iyi bir ilan nasıl yazılır, hangi bilgileri eklemeli)
- Yasal bilgiler (kayıp eşya bildirimi, kayıp büroları)

YAZIM KURALLARI:
- Sade, düz metin kullan. Markdown işaretleri kullanma (** * # gibi).
- Emoji kullanma.
- Kısa ve net ol, 2-4 cümle yeterli.
- Türkçe yaz.
- Platform dışı konularda kibarca platform konularına yönlendir.`;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`chat:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Çok fazla istek gönderdiniz. Lütfen bekleyin." }, { status: 429 });
    }

    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Geçersiz mesaj" }, { status: 400 });
    }

    const filtered = messages
      .filter((m: { role: string; content: string }) =>
        (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
      )
      .slice(-10);

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: filtered,
    });

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    return NextResponse.json({ reply: text });
  } catch {
    return NextResponse.json({ error: "Yanıt alınamadı" }, { status: 500 });
  }
}

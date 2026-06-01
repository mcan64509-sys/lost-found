import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { title, category, type } = await req.json();
    if (!title || !category) {
      return NextResponse.json({ error: "title ve category gerekli" }, { status: 400 });
    }

    const typeLabel = type === "lost" ? "kayıp" : "bulundu";
    const prompt = `Türkiye'deki kayıp & bulundu platformu için bir ${typeLabel} ilanı açıklaması yaz.

İlan başlığı: "${title}"
Kategori: ${category}

Kurallar:
- Türkçe yaz, samimi ve açıklayıcı ol
- 3-5 cümle, 80-150 kelime arası
- Eşyanın özelliklerini, durumunu ve nasıl tanınabileceğini belirt
- ${type === "lost" ? "Sahibinin ne kadar endişeli olduğunu, önemini vurgula" : "Bulan kişinin eşyayı teslim etmek istediğini belirt"}
- Sadece açıklama metnini yaz, başka hiçbir şey ekleme`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    return NextResponse.json({ description: text });
  } catch {
    return NextResponse.json({ error: "AI önerisi alınamadı" }, { status: 500 });
  }
}

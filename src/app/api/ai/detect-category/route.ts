import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const CATEGORIES = ["Telefon", "Cüzdan", "Anahtar", "Çanta", "Laptop", "Saat / Takı", "Kimlik / Evrak", "Evcil Hayvan", "Diğer"];

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: "imageBase64 ve mimeType gerekli" }, { status: 400 });
    }

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(mimeType)) {
      return NextResponse.json({ error: "Geçersiz görsel formatı" }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Bu görseldeki kayıp/bulundu ilanı eşyasını Türkçe analiz et.
Şu kategorilerden birini seç: ${CATEGORIES.join(", ")}
Ayrıca eşya için kısa bir Türkçe başlık öner (max 60 karakter).

SADECE JSON formatında yanıt ver, başka hiçbir şey yazma:
{"category": "...", "title": "..."}`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    const jsonMatch = text.match(/\{[^}]+\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI yanıtı ayrıştırılamadı" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : "Diğer";
    const title = typeof parsed.title === "string" ? parsed.title.slice(0, 60) : "";

    return NextResponse.json({ category, title });
  } catch (err) {
    console.error("AI detect-category error:", err);
    return NextResponse.json({ error: "Kategori tespiti başarısız" }, { status: 500 });
  }
}

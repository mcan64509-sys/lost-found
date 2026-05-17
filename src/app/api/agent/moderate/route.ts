import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic();
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

type ModerateResult = {
  appropriate: boolean;
  reason?: string;
  suggested_category?: string;
  detected_description?: string;
  pet_species?: string;
  pet_color?: string;
};

async function analyzeWithVision(imageUrl: string, title: string, category: string | null): Promise<ModerateResult> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: imageUrl },
          },
          {
            type: "text",
            text: `Bu görsel kayıp/bulundu eşya ilan platformu için yüklendi.
İlan başlığı: "${title}"
İlan kategorisi: "${category ?? "belirtilmemiş"}"

Lütfen JSON formatında değerlendir:
{
  "appropriate": true/false,
  "reason": "uygunsuzsa neden (uygunsa boş bırak)",
  "suggested_category": "Telefon/Cüzdan/Anahtar/Çanta/Laptop/Saat/Kimlik/Evcil Hayvan/Diğer",
  "detected_description": "görselden kısa Türkçe açıklama (renk, marka, özellik)",
  "pet_species": "evcil hayvan ise tür (Kedi/Köpek/Kuş vb.), değilse boş",
  "pet_color": "evcil hayvan ise renk, değilse boş"
}

Uygunsuz sayılacaklar: müstehcen, şiddet, kişisel belge bilgisi açık şekilde görünen (TC, banka kartı numarası), tamamen alakasız görsel.`,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Claude yanıt vermedi");

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("JSON parse edilemedi");

  return JSON.parse(jsonMatch[0]) as ModerateResult;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-agent-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await req.json();
  if (!itemId) return NextResponse.json({ error: "itemId gerekli" }, { status: 400 });

  const { data: item, error } = await supabase
    .from("items")
    .select("id, title, category, image_url, moderation_status, created_by_email")
    .eq("id", itemId)
    .single();

  if (error || !item) return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
  if (!item.image_url) return NextResponse.json({ skipped: "görsel yok" });

  let result: ModerateResult;
  try {
    result = await analyzeWithVision(item.image_url, item.title, item.category);
  } catch {
    return NextResponse.json({ error: "Görsel analiz hatası" }, { status: 500 });
  }

  const updates: Record<string, string | null> = {};

  if (!result.appropriate) {
    updates.moderation_status = "flagged";

    // Admin'e bildirim
    for (const adminEmail of ADMIN_EMAILS) {
      await supabase.from("notifications").insert({
        user_email: adminEmail,
        type: "report",
        title: "🚨 İlan otomatik işaretlendi",
        message: `"${item.title}" — ${result.reason ?? "uygunsuz görsel"}`,
        item_id: itemId,
        is_read: false,
      });
    }
  } else {
    // Kategori önerisi (mevcut kategori "Diğer" veya boşsa uygula)
    if (result.suggested_category && (!item.category || item.category === "Diğer")) {
      updates.category = result.suggested_category;
    }
    // Açıklama yoksa veya çok kısaysa ekle
    if (result.detected_description) {
      updates.ai_description = result.detected_description;
    }
    // Evcil hayvan alanları
    if (result.pet_species) updates.pet_species = result.pet_species;
    if (result.pet_color) updates.pet_color = result.pet_color;
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("items").update(updates).eq("id", itemId);
  }

  return NextResponse.json({ appropriate: result.appropriate, updates });
}

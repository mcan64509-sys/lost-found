import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { normalizeEmail } from "../../../../lib/utils";
import { sendItemMatchEmail } from "../../../../lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic();
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

type MatchCandidate = {
  id: string;
  title: string;
  type: string;
  category: string | null;
  location: string | null;
  date: string | null;
  description: string | null;
  created_by_email: string | null;
  score: number;
};

type NotifyInput = {
  user_email: string;
  their_item_id: string;
  matched_item_id: string;
  matched_item_title: string;
  explanation: string;
};

const tools: Anthropic.Tool[] = [
  {
    name: "send_match_notification",
    description:
      "Kullanıcıya eşleşme bildirimi ve email gönderir. Gerçekten anlamlı eşleşmelerde çağır — skoru yüksek, kategori/konum/tarih örtüşüyor, açıklama benzer.",
    input_schema: {
      type: "object" as const,
      properties: {
        user_email: { type: "string", description: "Bildirimi alacak kullanıcının email adresi" },
        their_item_id: { type: "string", description: "Bildirimi alan kullanıcının ilan ID'si" },
        matched_item_id: { type: "string", description: "Eşleşen ilanın ID'si" },
        matched_item_title: { type: "string", description: "Eşleşen ilanın başlığı" },
        explanation: {
          type: "string",
          description: "Türkçe, 1-2 cümle eşleşme açıklaması. Neden eşleştiğini belirt (konum, tarih, kategori, açıklama benzerliği).",
        },
      },
      required: ["user_email", "their_item_id", "matched_item_id", "matched_item_title", "explanation"],
    },
  },
];

async function handleNotify(input: NotifyInput, newItemTitle: string): Promise<string> {
  const { user_email, their_item_id, matched_item_id, matched_item_title, explanation } = input;

  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_email", normalizeEmail(user_email))
    .eq("item_id", their_item_id)
    .eq("related_item_id", matched_item_id)
    .eq("type", "match")
    .maybeSingle();

  if (existing) return "zaten_var";

  await fetch(`${APP_URL}/api/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userEmail: normalizeEmail(user_email),
      type: "match",
      title: "🎯 Eşleşme bulundu!",
      message: explanation,
      itemId: their_item_id,
      relatedItemId: matched_item_id,
    }),
  }).catch(() => {});

  await fetch(`${APP_URL}/api/push/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userEmail: normalizeEmail(user_email),
      title: "🎯 Eşleşme bulundu!",
      body: explanation,
      url: `/items/${matched_item_id}`,
    }),
  }).catch(() => {});

  await sendItemMatchEmail({
    userEmail: normalizeEmail(user_email),
    matchedTitle: matched_item_title,
    originalTitle: newItemTitle,
    matchedItemId: matched_item_id,
    explanation,
  }).catch(() => {});

  return "gönderildi";
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-agent-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await req.json();
  if (!itemId) return NextResponse.json({ error: "itemId gerekli" }, { status: 400 });

  const { data: item, error } = await supabase.from("items").select("*").eq("id", itemId).single();
  if (error || !item) return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });

  // Use already-stored embedding (set by /api/embed); re-embed only if missing
  let embedding = item.embedding;
  if (!embedding) {
    const embedText = `${item.title} ${item.description ?? ""} ${item.category ?? ""} ${item.location ?? ""}`.trim();
    const { data: embedData, error: embedError } = await supabase.functions.invoke("embed", {
      body: { input: embedText },
      headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (embedError || !embedData?.embedding) {
      return NextResponse.json({ error: "Embedding hatası" }, { status: 500 });
    }
    embedding = embedData.embedding;
    await supabase.from("items").update({ embedding }).eq("id", itemId);
  }

  // Find candidates
  const { data: candidates, error: matchError } = await supabase.rpc("match_items", {
    query_embedding: embedding,
    query_type: item.type,
    query_category: item.category,
    query_lat: item.lat ?? 0,
    query_lng: item.lng ?? 0,
    query_date: item.date ?? null,
    query_item_id: item.id,
    query_owner_email: item.created_by_email ?? "",
    match_threshold: 0.35,
    match_count: 10,
  });

  if (matchError) return NextResponse.json({ error: "Eşleştirme hatası" }, { status: 500 });

  const ownerEmail = normalizeEmail(item.created_by_email);
  const validCandidates: MatchCandidate[] = (candidates ?? []).filter((m: MatchCandidate) => {
    if (m.id === item.id) return false;
    if (ownerEmail && normalizeEmail(m.created_by_email) === ownerEmail) return false;
    return true;
  });

  if (validCandidates.length === 0) return NextResponse.json({ matched: 0, notified: 0 });

  // Agent loop
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Yeni ilan:
Başlık: ${item.title}
Tip: ${item.type === "lost" ? "Kayıp" : "Bulundu"}
Kategori: ${item.category ?? "-"}
Konum: ${item.location ?? "-"}
Tarih: ${item.date ?? "-"}
Açıklama: ${item.description ?? "-"}
Sahibi: ${item.created_by_email}
ID: ${item.id}

Aday eşleşmeler (${validCandidates.length} adet):
${validCandidates
  .map(
    (m, i) =>
      `${i + 1}. Skor: ${(m.score * 100).toFixed(0)}% | "${m.title}" | ${m.type === "lost" ? "Kayıp" : "Bulundu"} | Konum: ${m.location ?? "-"} | Tarih: ${m.date ?? "-"} | Açıklama: ${m.description?.slice(0, 150) ?? "-"} | Sahibi: ${m.created_by_email} | ID: ${m.id}`
  )
  .join("\n")}

Her anlamlı eşleşme için iki yönlü bildirim gönder:
1. Yeni ilan sahibine (${item.created_by_email}): their_item_id="${item.id}", matched_item_id=eşleşen ilan ID'si
2. Eşleşen ilan sahibine: their_item_id=eşleşen ilan ID'si, matched_item_id="${item.id}"`,
    },
  ];

  let notified = 0;

  for (let turn = 0; turn < 10; turn++) {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: `Sen bir kayıp eşya eşleştirme ajanısın. Yeni eklenen bir ilan için anlamlı eşleşmeleri belirleyip sahiplerine bildirim gönderiyorsun.

Değerlendirme kriterleri:
- Skor 0.55+ → güçlü eşleşme, bildir
- Skor 0.45–0.54 → orta, diğer faktörlere bak (aynı kategori, yakın konum/tarih → bildir)
- Skor 0.35–0.44 → zayıf, sadece çok belirgin örtüşme varsa bildir
- Açıklama ve konum benzerliği skoru doğrulamak için kritik

Açıklama Türkçe, 1-2 cümle, somut ve özgün olsun (sadece "benzer ilan" yazma, neden benzer olduğunu belirt).
Şüpheli veya alakasız ilanlar için bildirim gönderme.`,
      tools,
      messages,
    });

    if (response.stop_reason === "end_turn") break;

    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use" && block.name === "send_match_notification") {
          const result = await handleNotify(block.input as NotifyInput, item.title);
          if (result === "gönderildi") notified++;
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
        }
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    } else {
      break;
    }
  }

  return NextResponse.json({ matched: validCandidates.length, notified });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/messages/system
// İlana ait tüm konuşmalara sistem mesajı ekler
export async function POST(req: NextRequest) {
  try {
    const { itemId, content } = await req.json();

    if (!itemId || !content) {
      return NextResponse.json({ error: "Eksik alanlar." }, { status: 400 });
    }

    // İlana ait tüm konuşmaları bul
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .eq("item_id", itemId);

    if (convError) {
      console.error("System message conversations fetch error:", convError);
      return NextResponse.json({ error: "Konuşmalar alınamadı." }, { status: 500 });
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ success: true, inserted: 0 });
    }

    const inserts = conversations.map((c) => ({
      conversation_id: c.id,
      sender_email: "system",
      content,
      is_read: true,
      is_system: true,
    }));

    const { error: insertError } = await supabase
      .from("messages")
      .insert(inserts);

    if (insertError) {
      console.error("System message insert error:", insertError);
      return NextResponse.json({ error: "Sistem mesajı eklenemedi." }, { status: 500 });
    }

    return NextResponse.json({ success: true, inserted: inserts.length });
  } catch (error) {
    console.error("System message route error:", error);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

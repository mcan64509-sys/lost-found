import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, senderEmail, content } = body;

    if (!conversationId || !senderEmail || !content?.trim()) {
      return NextResponse.json({ error: "Eksik alanlar." }, { status: 400 });
    }

    const normalizedSender = normalizeEmail(senderEmail);

    // Konuşma var mı ve gönderen katılımcı mı?
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, owner_email, claimant_email")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "Konuşma bulunamadı." }, { status: 404 });
    }

    const isParticipant =
      normalizeEmail(conversation.owner_email) === normalizedSender ||
      normalizeEmail(conversation.claimant_email) === normalizedSender;

    if (!isParticipant) {
      return NextResponse.json({ error: "Bu konuşmaya mesaj gönderme yetkin yok." }, { status: 403 });
    }

    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_email: normalizedSender,
        content: content.trim(),
        is_read: false,
      })
      .select()
      .single();

    if (insertError || !message) {
      console.error("Message insert error:", insertError);
      return NextResponse.json({ error: "Mesaj gönderilemedi." }, { status: 500 });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Messages send error:", error);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

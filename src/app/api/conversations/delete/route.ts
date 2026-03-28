import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export async function DELETE(req: NextRequest) {
  try {
    const { conversationId, userEmail } = await req.json();

    if (!conversationId || !userEmail) {
      return NextResponse.json({ error: "Eksik alanlar." }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(userEmail);

    // Kullanıcının bu sohbetin katılımcısı olduğunu doğrula
    const { data: conversation, error: fetchError } = await supabase
      .from("conversations")
      .select("id, owner_email, claimant_email")
      .eq("id", conversationId)
      .single();

    if (fetchError || !conversation) {
      return NextResponse.json({ error: "Sohbet bulunamadı." }, { status: 404 });
    }

    const isParticipant =
      normalizeEmail(conversation.owner_email) === normalizedEmail ||
      normalizeEmail(conversation.claimant_email) === normalizedEmail;

    if (!isParticipant) {
      return NextResponse.json({ error: "Bu sohbeti silme yetkin yok." }, { status: 403 });
    }

    // Önce mesajları sil
    const { error: msgError } = await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", conversationId);

    if (msgError) {
      console.error("Messages delete error:", msgError);
      return NextResponse.json({ error: "Mesajlar silinemedi." }, { status: 500 });
    }

    // Sonra sohbeti sil
    const { error: convError } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (convError) {
      console.error("Conversation delete error:", convError);
      return NextResponse.json({ error: "Sohbet silinemedi." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Conversation delete route error:", error);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

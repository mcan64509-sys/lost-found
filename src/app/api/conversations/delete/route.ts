import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeEmail } from "../../../../lib/utils";
import { getAuthenticatedUser } from "../../../../lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }

    const { conversationId } = await req.json();

    if (!conversationId) {
      return NextResponse.json({ error: "Eksik alanlar." }, { status: 400 });
    }

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
      normalizeEmail(conversation.owner_email) === authUser.email ||
      normalizeEmail(conversation.claimant_email) === authUser.email;

    if (!isParticipant) {
      return NextResponse.json({ error: "Bu sohbeti silme yetkin yok." }, { status: 403 });
    }

    // Önce mesajları sil
    const { error: msgError } = await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", conversationId);

    if (msgError) {
      return NextResponse.json({ error: "Mesajlar silinemedi." }, { status: 500 });
    }

    // Sonra sohbeti sil
    const { error: convError } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (convError) {
      return NextResponse.json({ error: "Sohbet silinemedi." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

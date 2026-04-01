import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeEmail } from "../../../../lib/utils";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { checkRateLimit } from "../../../../lib/ratelimit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }

    const rl = await checkRateLimit(`messages:${authUser.id}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Çok fazla mesaj. Lütfen bekleyin." }, { status: 429 });
    }

    const body = await req.json();
    const { conversationId, content } = body;

    if (!conversationId || !content?.trim()) {
      return NextResponse.json({ error: "Eksik alanlar." }, { status: 400 });
    }

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
      normalizeEmail(conversation.owner_email) === authUser.email ||
      normalizeEmail(conversation.claimant_email) === authUser.email;

    if (!isParticipant) {
      return NextResponse.json({ error: "Bu konuşmaya mesaj gönderme yetkin yok." }, { status: 403 });
    }

    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_email: authUser.email,
        content: content.trim(),
        is_read: false,
      })
      .select()
      .single();

    if (insertError || !message) {
      return NextResponse.json({ error: "Mesaj gönderilemedi." }, { status: 500 });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeEmail } from "../../../../lib/utils";
import { sendClaimApprovedEmail } from "../../../../lib/email";
import { getAuthenticatedUser } from "../../../../lib/auth";

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

    const body = await req.json();
    const { claimId } = body;

    if (!claimId) {
      return NextResponse.json({ error: "Eksik alanlar." }, { status: 400 });
    }

    // Talebi getir
    const { data: claim, error: fetchError } = await supabase
      .from("claims")
      .select("*")
      .eq("id", claimId)
      .single();

    if (fetchError || !claim) {
      return NextResponse.json({ error: "Talep bulunamadı." }, { status: 404 });
    }

    if (claim.status !== "pending") {
      return NextResponse.json({ error: "Bu talep zaten işleme alınmış." }, { status: 409 });
    }

    // JWT'den gelen kullanıcı ilan sahibi mi?
    const isOwner =
      (claim.owner_user_id && claim.owner_user_id === authUser.id) ||
      (!claim.owner_user_id && claim.owner_email && normalizeEmail(claim.owner_email) === authUser.email);

    if (!isOwner) {
      return NextResponse.json({ error: "Bu talebi onaylama yetkin yok." }, { status: 403 });
    }

    // Talebi onayla ve ilanı çözüldü olarak işaretle
    const [{ error: updateClaimError }, { error: updateItemError }] = await Promise.all([
      supabase.from("claims").update({ status: "approved" }).eq("id", claimId),
      supabase.from("items").update({ status: "resolved" }).eq("id", claim.item_id),
    ]);

    if (updateClaimError) {
      return NextResponse.json({ error: "Talep onaylanamadı." }, { status: 500 });
    }
    if (updateItemError) {
      // Non-critical, continue
    }

    // Talep edenin e-postasına bildirim gönder
    if (claim.claimer_email) {
      const { data: item } = await supabase
        .from("items")
        .select("title")
        .eq("id", claim.item_id)
        .single();

      const itemTitle = item?.title || "İlan";

      await supabase.from("notifications").insert({
        user_email: normalizeEmail(claim.claimer_email),
        type: "claim_approved",
        title: "✅ Sahiplik talebiniz onaylandı!",
        message: `"${itemTitle}" ilanı için gönderdiğiniz sahiplik talebi onaylandı.`,
        item_id: claim.item_id,
        is_read: false,
      });

      sendClaimApprovedEmail({
        claimerEmail: claim.claimer_email,
        itemTitle,
        itemId: claim.item_id,
      }).catch(() => {});
    }

    // Konuşmalara sistem mesajı ekle
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id")
      .eq("item_id", claim.item_id);

    if (conversations && conversations.length > 0) {
      const { data: item } = await supabase
        .from("items")
        .select("title")
        .eq("id", claim.item_id)
        .single();

      await supabase.from("messages").insert(
        conversations.map((c) => ({
          conversation_id: c.id,
          sender_email: "system",
          content: `✅ Sahiplik talebi onaylandı. "${item?.title ?? "İlan"}" çözüme kavuştu.`,
          is_read: true,
          is_system: true,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

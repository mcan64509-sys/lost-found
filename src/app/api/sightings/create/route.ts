import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { itemId, reporterEmail, lat, lng, locationText, note } = await req.json();

    if (!itemId || !reporterEmail || lat == null || lng == null) {
      return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });
    }

    const { error: insertError } = await supabase.from("sightings").insert({
      item_id: itemId,
      reporter_email: reporterEmail,
      lat,
      lng,
      location_text: locationText || null,
      note: note || null,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { data: item } = await supabase
      .from("items")
      .select("title, created_by_email")
      .eq("id", itemId)
      .single();

    if (item?.created_by_email && item.created_by_email !== reporterEmail) {
      const coordText = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      const notifMessage = locationText
        ? `"${locationText}" konumunda görüldü.`
        : `Haritada işaretlendi. Koordinatlar: ${coordText}`;

      await supabase.from("notifications").insert({
        user_email: item.created_by_email,
        type: "sighting",
        title: `👁 İlanınız görüldü: ${item.title}`,
        message: notifMessage,
        item_id: itemId,
        is_read: false,
      });

      // Find or create conversation between reporter and item owner
      const { data: existingConvs } = await supabase
        .from("conversations")
        .select("id")
        .eq("item_id", itemId)
        .or(
          `and(owner_email.eq.${item.created_by_email},claimant_email.eq.${reporterEmail}),and(owner_email.eq.${reporterEmail},claimant_email.eq.${item.created_by_email})`
        );

      let conversationId = existingConvs?.[0]?.id;

      if (!conversationId) {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({
            item_id: itemId,
            item_title: item.title,
            owner_email: item.created_by_email,
            claimant_email: reporterEmail,
          })
          .select("id")
          .single();
        conversationId = newConv?.id;
      }

      if (conversationId) {
        const msgParts = [`👁 Bu eşyayı/hayvanı gördüm!`];
        if (locationText) {
          msgParts.push(`\n📍 Konum: ${locationText}`);
        } else {
          msgParts.push(`\n📍 Koordinatlar: ${coordText}`);
        }
        if (note) msgParts.push(`\n📝 Not: ${note}`);

        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_email: reporterEmail,
          content: msgParts.join(""),
          is_read: false,
          is_system: false,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

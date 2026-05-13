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

    // Insert sighting
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

    // Get item + owner info to send notification
    const { data: item } = await supabase
      .from("items")
      .select("title, created_by_email")
      .eq("id", itemId)
      .single();

    if (item?.created_by_email) {
      const notifMessage = locationText
        ? `"${locationText}" konumunda görüldü. Harita konumu mevcut.`
        : `Haritada işaretlendi. Koordinatlar: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      await supabase.from("notifications").insert({
        user_email: item.created_by_email,
        type: "sighting",
        title: `👁 İlanınız görüldü: ${item.title}`,
        message: notifMessage,
        item_id: itemId,
        is_read: false,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

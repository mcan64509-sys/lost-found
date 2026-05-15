import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { item_id, rater_email, rated_email, score, comment } = await req.json();

  if (!item_id || !rater_email || !rated_email || !score) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }
  if (score < 1 || score > 5) {
    return NextResponse.json({ error: "Puan 1-5 arasında olmalı" }, { status: 400 });
  }
  if (rater_email === rated_email) {
    return NextResponse.json({ error: "Kendinizi değerlendiremezsiniz" }, { status: 400 });
  }

  const { data: item } = await supabase
    .from("items")
    .select("id, status, created_by_email")
    .eq("id", item_id)
    .maybeSingle();

  if (!item) {
    return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
  }
  if (item.status !== "resolved") {
    return NextResponse.json({ error: "Sadece çözülmüş ilanlarda değerlendirme yapılabilir" }, { status: 400 });
  }

  // Item owner can rate the claimant; claimants/sighters can rate the owner
  const isOwner = item.created_by_email === rater_email;

  if (isOwner) {
    // Owner rates claimant — verify rated_email has a claim
    const { data: claimCheck } = await supabase
      .from("claims").select("id").eq("item_id", item_id).eq("claimant_email", rated_email).maybeSingle();
    if (!claimCheck) {
      return NextResponse.json({ error: "Bu kişi bu ilan için talep göndermemiş" }, { status: 403 });
    }
  } else {
    // Non-owner must have a claim or sighting
    const [{ data: claim }, { data: sighting }] = await Promise.all([
      supabase.from("claims").select("id").eq("item_id", item_id).eq("claimant_email", rater_email).maybeSingle(),
      supabase.from("sightings").select("id").eq("item_id", item_id).eq("reporter_email", rater_email).maybeSingle(),
    ]);
    if (!claim && !sighting) {
      return NextResponse.json({ error: "Sadece talep veya görme bildirimi gönderenler değerlendirme yapabilir" }, { status: 403 });
    }
  }

  const { error } = await supabase.from("ratings").insert({
    rater_email,
    rated_email,
    item_id,
    score,
    comment: comment?.trim() || null,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Bu ilan için zaten değerlendirme yaptınız" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isValidEmail, normalizeEmail } from "../../../lib/utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_REASONS = [
  "spam",
  "yaniltici",
  "uygunsuz",
  "duplicate",
  "diger",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const itemId = (body.itemId || "").trim();
    const reporterEmail = normalizeEmail(body.reporterEmail);
    const reason = (body.reason || "").trim();
    const details = (body.details || "").trim().slice(0, 500);

    if (!itemId || !reporterEmail || !reason) {
      return NextResponse.json({ error: "Eksik alanlar." }, { status: 400 });
    }
    if (!isValidEmail(reporterEmail)) {
      return NextResponse.json({ error: "Geçersiz email." }, { status: 400 });
    }
    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Geçersiz şikayet sebebi." }, { status: 400 });
    }

    // Aynı kullanıcı aynı ilana zaten rapor gönderdi mi?
    const { data: existing } = await supabase
      .from("reports")
      .select("id")
      .eq("item_id", itemId)
      .eq("reporter_email", reporterEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Bu ilanı zaten şikayet etmişsiniz." },
        { status: 409 }
      );
    }

    const { error } = await supabase.from("reports").insert({
      item_id: itemId,
      reporter_email: reporterEmail,
      reason,
      details: details || null,
      status: "pending",
    });

    if (error) {
      return NextResponse.json({ error: "Şikayet gönderilemedi." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

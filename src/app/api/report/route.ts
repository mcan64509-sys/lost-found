import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "../../../lib/auth";

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
    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.email) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }
    const reporterEmail = authUser.email;

    const body = await req.json();
    const itemId = (body.itemId || "").trim() || null;
    const reportedUserEmail = (body.reportedUserEmail || "").trim().toLowerCase() || null;
    const reason = (body.reason || "").trim();
    const details = (body.details || "").trim().slice(0, 500);

    if ((!itemId && !reportedUserEmail) || !reason) {
      return NextResponse.json({ error: "Eksik alanlar." }, { status: 400 });
    }
    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Geçersiz şikayet sebebi." }, { status: 400 });
    }

    // Duplicate check
    const query = supabase
      .from("reports")
      .select("id")
      .eq("reporter_email", reporterEmail);

    if (itemId) query.eq("item_id", itemId);
    if (reportedUserEmail) query.eq("reported_user_email", reportedUserEmail);

    const { data: existing } = await query.maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "Bu içeriği zaten şikayet etmişsiniz." },
        { status: 409 }
      );
    }

    const { error } = await supabase.from("reports").insert({
      item_id: itemId,
      reported_user_email: reportedUserEmail,
      reporter_email: reporterEmail,
      reason,
      details: details || null,
      status: "pending",
    });

    if (error) {
      return NextResponse.json({ error: "Şikayet gönderilemedi." }, { status: 500 });
    }

    // Trigger AI analysis agent — fire-and-forget
    const { data: newReport } = await supabase
      .from("reports")
      .select("id")
      .eq("reporter_email", reporterEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (newReport?.id && process.env.CRON_SECRET && process.env.NEXT_PUBLIC_APP_URL) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agent/resolve-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-agent-secret": process.env.CRON_SECRET },
        body: JSON.stringify({ reportId: newReport.id }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

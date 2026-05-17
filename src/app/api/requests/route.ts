import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendContactToAdminEmail } from "../../../lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "bulanvarmi1@gmail.com";

const VALID_TYPES = ["feature_request", "bug_report", "complaint", "other"];

const TYPE_LABELS: Record<string, string> = {
  feature_request: "Özellik İsteği",
  bug_report: "Hata Bildirimi",
  complaint: "Şikayet",
  other: "Diğer",
};

export async function POST(req: NextRequest) {
  try {
    const { userEmail, type, title, description } = await req.json();
    if (!userEmail || !type || !title || !description) {
      return NextResponse.json({ error: "Eksik alanlar." }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Geçersiz tür." }, { status: 400 });
    }
    if (title.length > 120 || description.length > 1000) {
      return NextResponse.json({ error: "Çok uzun içerik." }, { status: 400 });
    }

    const { error } = await supabase.from("user_requests").insert({
      user_email: userEmail,
      type,
      title: title.trim(),
      description: description.trim(),
      status: "pending",
    });

    if (error) return NextResponse.json({ error: "Gönderilemedi." }, { status: 500 });

    sendContactToAdminEmail({
      fromName: userEmail,
      fromEmail: userEmail,
      subject: `${TYPE_LABELS[type] || type}: ${title.trim()}`,
      message: description.trim(),
      adminEmail: ADMIN_EMAIL,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

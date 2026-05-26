import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await req.json();
  if (!itemId) return NextResponse.json({ error: "itemId gerekli" }, { status: 400 });

  // İlanın bu kullanıcıya ait olduğunu doğrula
  const { data: item } = await supabase
    .from("items")
    .select("id, created_by_email")
    .eq("id", itemId)
    .single();

  if (!item || item.created_by_email?.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Moderation ajanını tetikle (fire-and-forget değil, hata logla)
  try {
    const res = await fetch(`${APP_URL}/api/agent/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-secret": process.env.CRON_SECRET || "",
      },
      body: JSON.stringify({ itemId }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Moderasyon hatası ilan yayınını engellememeli
    return NextResponse.json({ skipped: true, reason: "moderation_error" });
  }
}

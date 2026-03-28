import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/claims/outgoing?userId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId")?.trim();

    if (!userId) {
      return NextResponse.json({ error: "userId gerekli." }, { status: 400 });
    }

    const { data: claims, error } = await supabase
      .from("claims")
      .select("*, items(id, title, type, image_url, location, date)")
      .eq("claimer_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Outgoing claims fetch error:", error);
      return NextResponse.json({ error: "Talepler alınamadı." }, { status: 500 });
    }

    return NextResponse.json({ claims: claims ?? [] });
  } catch (error) {
    console.error("Claims outgoing error:", error);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

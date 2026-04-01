import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/claims/incoming?userId=...&userEmail=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId")?.trim();
    const userEmail = searchParams.get("userEmail")?.trim().toLowerCase();

    if (!userId && !userEmail) {
      return NextResponse.json({ error: "userId veya userEmail gerekli." }, { status: 400 });
    }

    let query = supabase
      .from("claims")
      .select("*, items(id, title, type, image_url, location, date)")
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("owner_user_id", userId);
    } else if (userEmail) {
      query = query.eq("owner_email", userEmail);
    }

    const { data: claims, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Talepler alınamadı." }, { status: 500 });
    }

    return NextResponse.json({ claims: claims ?? [] });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

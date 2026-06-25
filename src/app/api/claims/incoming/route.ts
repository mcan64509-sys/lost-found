import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/claims/incoming — returns incoming claims for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.email) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }

    const { data: claims, error } = await supabase
      .from("claims")
      .select("*, items(id, title, type, image_url, location, date)")
      .eq("owner_email", user.email.toLowerCase())
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Talepler alınamadı." }, { status: 500 });
    }

    return NextResponse.json({ claims: claims ?? [] });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

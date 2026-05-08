import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — kullanıcının alertlerini getir
export async function GET(req: NextRequest) {
  const userEmail = req.nextUrl.searchParams.get("userEmail");
  if (!userEmail) return NextResponse.json({ error: "userEmail gerekli" }, { status: 400 });

  const { data, error } = await supabase
    .from("search_alerts")
    .select("*")
    .eq("user_email", userEmail)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alerts: data });
}

// POST — yeni alert oluştur
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_email, keyword, category, item_type, location_name, lat, lng, radius_km } = body;

  if (!user_email) return NextResponse.json({ error: "user_email gerekli" }, { status: 400 });

  // Max 10 alert per user
  const { count } = await supabase
    .from("search_alerts")
    .select("*", { count: "exact", head: true })
    .eq("user_email", user_email);

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: "En fazla 10 arama uyarısı oluşturabilirsin." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("search_alerts")
    .insert({
      user_email,
      keyword: keyword || "",
      category: category || "",
      item_type: item_type || "all",
      location_name: location_name || "",
      lat: lat || null,
      lng: lng || null,
      radius_km: radius_km || 50,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alert: data });
}

// DELETE — alert sil
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const userEmail = req.nextUrl.searchParams.get("userEmail");
  if (!id || !userEmail) return NextResponse.json({ error: "id ve userEmail gerekli" }, { status: 400 });

  const { error } = await supabase
    .from("search_alerts")
    .delete()
    .eq("id", id)
    .eq("user_email", userEmail);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH — aktif/pasif toggle
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, user_email, is_active } = body;
  if (!id || !user_email) return NextResponse.json({ error: "id ve user_email gerekli" }, { status: 400 });

  const { error } = await supabase
    .from("search_alerts")
    .update({ is_active })
    .eq("id", id)
    .eq("user_email", user_email);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

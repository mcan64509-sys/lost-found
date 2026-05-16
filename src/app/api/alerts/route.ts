import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAuthEmail(req: NextRequest): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user?.email?.toLowerCase() ?? null;
}

// GET — kullanıcının alertlerini getir
export async function GET(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { data, error } = await supabase
    .from("search_alerts")
    .select("*")
    .eq("user_email", email)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  return NextResponse.json({ alerts: data });
}

// POST — yeni alert oluştur
export async function POST(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const { keyword, category, item_type, location_name, lat, lng, radius_km } = body;

  const { count } = await supabase
    .from("search_alerts")
    .select("*", { count: "exact", head: true })
    .eq("user_email", email);

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: "En fazla 10 arama uyarısı oluşturabilirsin." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("search_alerts")
    .insert({
      user_email: email,
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

  if (error) return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  return NextResponse.json({ alert: data });
}

// DELETE — alert sil
export async function DELETE(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const { error } = await supabase
    .from("search_alerts")
    .delete()
    .eq("id", id)
    .eq("user_email", email);

  if (error) return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH — aktif/pasif toggle
export async function PATCH(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const { id, is_active } = body;
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const { error } = await supabase
    .from("search_alerts")
    .update({ is_active })
    .eq("id", id)
    .eq("user_email", email);

  if (error) return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  return NextResponse.json({ success: true });
}

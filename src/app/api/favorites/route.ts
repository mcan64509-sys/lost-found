import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "../../../lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser?.email) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }
  const userEmail = authUser.email;
  const { searchParams } = new URL(req.url);
  const withItems = searchParams.get("withItems") === "true";

  const { data, error } = await supabase
    .from("favorites")
    .select("item_id")
    .eq("user_email", userEmail)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const itemIds = (data ?? []).map((r) => r.item_id);

  if (!withItems || itemIds.length === 0) {
    return NextResponse.json({ itemIds });
  }

  // Favori ilanların detaylarını da çek
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id, title, type, category, location, date, image_url, status, created_at")
    .in("id", itemIds);

  if (itemsError) {
    return NextResponse.json({ itemIds, items: [] });
  }

  // Favorites sırasını koru
  const itemMap = new Map((items ?? []).map((i) => [i.id, i]));
  const sortedItems = itemIds.map((id) => itemMap.get(id)).filter(Boolean);

  return NextResponse.json({ itemIds, items: sortedItems });
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.email) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }
    const userEmail = authUser.email;
    const body = await req.json();
    const itemId = (body.itemId || "").trim();

    if (!itemId) {
      return NextResponse.json({ error: "itemId gerekli" }, { status: 400 });
    }

    // Zaten favoride var mı?
    const { data: existing } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_email", userEmail)
      .eq("item_id", itemId)
      .maybeSingle();

    if (existing) {
      await supabase.from("favorites").delete().eq("id", existing.id);
      return NextResponse.json({ favorited: false, itemId });
    } else {
      await supabase.from("favorites").insert({ user_email: userEmail, item_id: itemId });
      return NextResponse.json({ favorited: true, itemId });
    }
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: items, error } = await supabase
    .from("items")
    .select("id, title, type, status, view_count, created_at, expires_at")
    .eq("created_by_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!items || items.length === 0) return NextResponse.json({ stats: [] });

  const itemIds = items.map((i) => i.id);

  const [{ data: favData }, { data: claimData }] = await Promise.all([
    supabase
      .from("favorites")
      .select("item_id")
      .in("item_id", itemIds),
    supabase
      .from("claims")
      .select("item_id, status")
      .in("item_id", itemIds),
  ]);

  const favCounts: Record<string, number> = {};
  for (const f of favData ?? []) {
    favCounts[f.item_id] = (favCounts[f.item_id] ?? 0) + 1;
  }

  const claimCounts: Record<string, number> = {};
  for (const c of claimData ?? []) {
    claimCounts[c.item_id] = (claimCounts[c.item_id] ?? 0) + 1;
  }

  const stats = items.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    status: item.status,
    created_at: item.created_at,
    expires_at: item.expires_at,
    view_count: item.view_count ?? 0,
    favorite_count: favCounts[item.id] ?? 0,
    claim_count: claimCounts[item.id] ?? 0,
  }));

  return NextResponse.json({ stats });
}

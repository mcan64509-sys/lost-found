import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCriticalAlert } from "../../../../lib/criticalAlert";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAILS = ((process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS) || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function getAdminEmail(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const { data } = await supabaseAdmin.auth.getUser(token);
  const email = data?.user?.email?.toLowerCase().trim() || "";
  return ADMIN_EMAILS.includes(email) ? email : null;
}

export async function GET(req: NextRequest) {
  const adminEmail = await getAdminEmail(req);
  if (!adminEmail) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = 30;
  const offset = (page - 1) * limit;
  const search = req.nextUrl.searchParams.get("search") || "";

  // Fetch profiles
  let query = supabaseAdmin
    .from("profiles")
    .select("email, full_name, avatar_url, created_at, is_banned")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data: profiles, error } = await query;

  if (error) {
    await sendCriticalAlert("Admin Profiles Hatası", error.message, "/api/admin/profiles");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const emails = (profiles ?? []).map((p) => p.email);

  if (emails.length === 0) {
    return NextResponse.json({ profiles: [] });
  }

  // Batch fetch ratings + items for all profiles at once
  const [{ data: allRatings }, { data: allItems }] = await Promise.all([
    supabaseAdmin.from("ratings").select("rated_email, score").in("rated_email", emails),
    supabaseAdmin.from("items").select("created_by_email, status, type").in("created_by_email", emails),
  ]);

  const ratingsMap = new Map<string, number[]>();
  for (const r of allRatings ?? []) {
    if (!ratingsMap.has(r.rated_email)) ratingsMap.set(r.rated_email, []);
    ratingsMap.get(r.rated_email)!.push(r.score);
  }

  type ItemRow = { created_by_email: string; type: string; status: string };
  const itemsMap = new Map<string, ItemRow[]>();
  for (const i of (allItems ?? []) as ItemRow[]) {
    if (!itemsMap.has(i.created_by_email)) itemsMap.set(i.created_by_email, []);
    itemsMap.get(i.created_by_email)!.push(i);
  }

  const enriched = (profiles ?? []).map((profile) => {
    const scores = ratingsMap.get(profile.email) ?? [];
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const itemList = itemsMap.get(profile.email) ?? [];
    return {
      ...profile,
      ratingAvg: avg,
      ratingCount: scores.length,
      totalItems: itemList.length,
      lostCount: itemList.filter((i) => i.type === "lost").length,
      foundCount: itemList.filter((i) => i.type === "found").length,
      resolvedCount: itemList.filter((i) => i.status === "resolved").length,
      helpedCount: itemList.filter((i) => i.type === "found" && i.status === "resolved").length,
    };
  });

  return NextResponse.json({ profiles: enriched });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdmin(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return ADMIN_EMAILS.length > 0;
}

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with ratings + item counts
  const enriched = await Promise.all(
    (profiles ?? []).map(async (profile) => {
      const [{ data: ratings }, { data: items }] = await Promise.all([
        supabaseAdmin
          .from("ratings")
          .select("score")
          .eq("rated_email", profile.email),
        supabaseAdmin
          .from("items")
          .select("status, type")
          .eq("created_by_email", profile.email),
      ]);

      const scores = (ratings ?? []).map((r: { score: number }) => r.score);
      const avg = scores.length > 0
        ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
        : null;

      const itemList = items ?? [];
      const lostCount = itemList.filter((i: { type: string }) => i.type === "lost").length;
      const foundCount = itemList.filter((i: { type: string }) => i.type === "found").length;
      const resolvedCount = itemList.filter((i: { status: string }) => i.status === "resolved").length;
      const helpedCount = itemList.filter(
        (i: { type: string; status: string }) => i.type === "found" && i.status === "resolved"
      ).length;

      return {
        ...profile,
        ratingAvg: avg,
        ratingCount: scores.length,
        totalItems: itemList.length,
        lostCount,
        foundCount,
        resolvedCount,
        helpedCount,
      };
    })
  );

  return NextResponse.json({ profiles: enriched });
}

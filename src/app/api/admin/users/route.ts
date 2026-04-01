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

async function getCallerEmail(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user?.email) return null;
  return user.email.toLowerCase().trim();
}

export async function GET(req: NextRequest) {
  const callerEmail = await getCallerEmail(req);
  if (!callerEmail || (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(callerEmail))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, avatar_url, created_at, is_banned")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: items } = await supabaseAdmin
    .from("items")
    .select("created_by_email, status");

  const itemMap: Record<string, { total: number; resolved: number }> = {};
  for (const item of items ?? []) {
    const e = item.created_by_email;
    if (!e) continue;
    if (!itemMap[e]) itemMap[e] = { total: 0, resolved: 0 };
    itemMap[e].total++;
    if (item.status === "resolved") itemMap[e].resolved++;
  }

  const users = (profiles ?? []).map((p) => ({
    ...p,
    item_count: itemMap[p.email ?? ""]?.total ?? 0,
    resolved_count: itemMap[p.email ?? ""]?.resolved ?? 0,
  }));

  return NextResponse.json({ users });
}

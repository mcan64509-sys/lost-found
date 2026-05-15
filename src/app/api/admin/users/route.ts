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

  const [{ data: authData, error: authError }, { data: profiles }, { data: blacklistData }, { data: items }] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin.from("profiles").select("id, email, full_name, avatar_url, is_banned"),
    supabaseAdmin.from("blacklisted_emails").select("email"),
    supabaseAdmin.from("items").select("created_by_email, status"),
  ]);

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const profileMap: Record<string, { full_name: string | null; avatar_url: string | null; is_banned: boolean | null }> = {};
  for (const p of profiles ?? []) {
    if (p.email) profileMap[p.email.toLowerCase()] = { full_name: p.full_name, avatar_url: p.avatar_url, is_banned: p.is_banned };
  }

  const blacklistSet = new Set((blacklistData ?? []).map((r) => r.email.toLowerCase()));

  const itemMap: Record<string, { total: number; resolved: number }> = {};
  for (const item of items ?? []) {
    const e = item.created_by_email;
    if (!e) continue;
    if (!itemMap[e]) itemMap[e] = { total: 0, resolved: 0 };
    itemMap[e].total++;
    if (item.status === "resolved") itemMap[e].resolved++;
  }

  const users = (authData.users ?? []).map((u) => {
    const email = u.email?.toLowerCase() ?? "";
    const profile = profileMap[email] ?? {};
    return {
      id: u.id,
      email: u.email ?? "",
      full_name: profile.full_name ?? u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
      avatar_url: profile.avatar_url ?? u.user_metadata?.avatar_url ?? null,
      created_at: u.created_at,
      is_banned: profile.is_banned ?? false,
      item_count: itemMap[email]?.total ?? 0,
      resolved_count: itemMap[email]?.resolved ?? 0,
      is_blacklisted: blacklistSet.has(email),
    };
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ users });
}

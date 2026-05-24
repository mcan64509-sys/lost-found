import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "../../../../lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(user.email);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { status } = Object.fromEntries(new URL(req.url).searchParams);

  let query = supabase
    .from("support_sessions")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);

  query = status ? query.eq("status", status) : query.in("status", ["waiting", "active"]);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sessions: data ?? [] });
}

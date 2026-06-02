import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyPermission } from "../../../../lib/adminAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const adminEmail = await verifyPermission(req, "manage_support");
  if (!adminEmail) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

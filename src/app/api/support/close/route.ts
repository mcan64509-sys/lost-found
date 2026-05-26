import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "../../../../lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAILS = ((process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS) || "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export async function POST(req: NextRequest) {
  const [user, body] = await Promise.all([
    getAuthenticatedUser(req),
    req.json(),
  ]);

  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = body;
  if (!sessionId) return NextResponse.json({ error: "sessionId gerekli" }, { status: 400 });

  const isAdmin = ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(user.email);

  const { data: session } = await supabase
    .from("support_sessions")
    .select("id, user_email, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return NextResponse.json({ error: "Session bulunamadı" }, { status: 404 });
  if (!isAdmin && session.user_email !== user.email) {
    return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
  }

  await supabase
    .from("support_sessions")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", sessionId);

  return NextResponse.json({ ok: true });
}

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
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId gerekli" }, { status: 400 });

  const [user, sessionData] = await Promise.all([
    getAuthenticatedUser(req),
    supabase.from("support_sessions").select("id, user_email").eq("id", sessionId).maybeSingle(),
  ]);

  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sessionData.data) return NextResponse.json({ error: "Session bulunamadı" }, { status: 404 });

  const isAdmin = ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(user.email);
  if (!isAdmin && sessionData.data.user_email !== user.email) {
    return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Okunmamış mesajları arka planda işaretle (yanıtı bloklamıyor)
  supabase
    .from("support_messages")
    .update({ is_read: true })
    .eq("session_id", sessionId)
    .eq("is_read", false)
    .neq("sender_type", isAdmin ? "admin" : "user")
    .then(() => {});

  return NextResponse.json({ messages: data ?? [] });
}

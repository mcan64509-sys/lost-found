import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId gerekli" }, { status: 400 });

  const userEmail = user.email.toLowerCase().trim();
  const isAdmin = ADMIN_EMAILS.includes(userEmail);

  // Session erişim kontrolü
  const { data: session } = await supabase
    .from("support_sessions")
    .select("id, user_email")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return NextResponse.json({ error: "Session bulunamadı" }, { status: 404 });
  if (!isAdmin && session.user_email !== userEmail) {
    return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Okunmamış mesajları oku
  await supabase
    .from("support_messages")
    .update({ is_read: true })
    .eq("session_id", sessionId)
    .eq("is_read", false)
    .neq("sender_type", isAdmin ? "admin" : "user");

  return NextResponse.json({ messages: data ?? [] });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "../../../../lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export async function POST(req: NextRequest) {
  const [user, body] = await Promise.all([
    getAuthenticatedUser(req),
    req.json(),
  ]);

  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, content } = body;
  if (!sessionId || !content?.trim()) {
    return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });
  }

  const userEmail = user.email;
  const isAdmin = ADMIN_EMAILS.length === 0 ? false : ADMIN_EMAILS.includes(userEmail);

  const { data: session } = await supabase
    .from("support_sessions")
    .select("id, user_email, status, user_name")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return NextResponse.json({ error: "Session bulunamadı" }, { status: 404 });
  if (session.status === "closed") return NextResponse.json({ error: "Oturum kapalı" }, { status: 400 });
  if (!isAdmin && session.user_email !== userEmail) {
    return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
  }

  // Session güncelleme + mesaj ekleme paralel
  const insertPromise = supabase
    .from("support_messages")
    .insert({
      session_id: sessionId,
      sender_type: isAdmin ? "admin" : "user",
      sender_email: userEmail,
      content: content.trim(),
    })
    .select()
    .single();

  const updatePromise = isAdmin && session.status === "waiting"
    ? supabase.from("support_sessions").update({ status: "active", admin_email: userEmail }).eq("id", sessionId)
    : Promise.resolve(null);

  const [{ data: message, error }] = await Promise.all([insertPromise, updatePromise]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Push bildirimi fire-and-forget
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com";
  const notifyEmail = isAdmin ? session.user_email : ADMIN_EMAILS[0];
  if (notifyEmail) {
    fetch(`${APP_URL}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.CRON_SECRET || "",
      },
      body: JSON.stringify({
        userEmail: notifyEmail,
        title: isAdmin ? "Destekten yanıt geldi" : "Kullanıcıdan mesaj",
        body: content.trim().slice(0, 100),
        url: isAdmin ? "/admin?tab=support" : "/",
        tag: `support-msg-${sessionId}`,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ message });
}

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

export async function POST(req: NextRequest) {
  const callerEmail = await getCallerEmail(req);
  if (!callerEmail || (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(callerEmail))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { targetEmail, ban } = await req.json();

  if (!targetEmail) {
    return NextResponse.json({ error: "targetEmail gerekli" }, { status: 400 });
  }
  if (targetEmail.toLowerCase() === callerEmail) {
    return NextResponse.json({ error: "Kendinizi engelleyemezsiniz" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_banned: !!ban })
    .eq("email", targetEmail);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, banned: !!ban });
}

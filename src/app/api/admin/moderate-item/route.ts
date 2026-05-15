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
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user?.email?.toLowerCase().trim() ?? null;
}

export async function POST(req: NextRequest) {
  const callerEmail = await getCallerEmail(req);
  if (!callerEmail || (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(callerEmail))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { itemId, action } = await req.json();
  if (!itemId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  if (action === "approve") {
    const { error } = await supabaseAdmin
      .from("items")
      .update({ moderation_status: "approved" })
      .eq("id", itemId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, status: "approved" });
  } else {
    const { error } = await supabaseAdmin.from("items").delete().eq("id", itemId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, status: "deleted" });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyPermission } from "../../../../lib/adminAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — pending stories
export async function GET(req: NextRequest) {
  if (!await verifyPermission(req, "manage_stories")) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("success_stories")
    .select("*")
    .eq("approved", false)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stories: data });
}

// PATCH — approve
export async function PATCH(req: NextRequest) {
  if (!await verifyPermission(req, "manage_stories")) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { storyId } = await req.json();
  if (!storyId) return NextResponse.json({ error: "storyId gerekli" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("success_stories")
    .update({ approved: true })
    .eq("id", storyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — reject
export async function DELETE(req: NextRequest) {
  if (!await verifyPermission(req, "manage_stories")) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { storyId } = await req.json();
  if (!storyId) return NextResponse.json({ error: "storyId gerekli" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("success_stories")
    .delete()
    .eq("id", storyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

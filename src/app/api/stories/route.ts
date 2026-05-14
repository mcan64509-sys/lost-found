import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("success_stories")
    .select("id, user_email, item_title, story, created_at")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stories: data });
}

export async function POST(req: NextRequest) {
  const { user_email, item_title, story } = await req.json();

  if (!user_email || !item_title?.trim() || !story?.trim()) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  const { error } = await supabase.from("success_stories").insert({
    user_email,
    item_title: item_title.trim(),
    story: story.trim(),
    approved: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "email gerekli" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ratings")
    .select("id, rater_email, score, comment, created_at, item_id")
    .eq("rated_email", email)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ratings = data ?? [];
  const scores = ratings.map((r: { score: number }) => r.score);
  const avg = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null;

  return NextResponse.json({ ratings, avg, count: scores.length });
}

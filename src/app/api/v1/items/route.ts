import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getProfileByApiKey(apiKey: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, email, account_type")
    .eq("api_key", apiKey)
    .maybeSingle();
  return data;
}

function extractApiKey(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return req.nextUrl.searchParams.get("api_key");
}

export async function GET(req: NextRequest) {
  const apiKey = extractApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "API anahtarı gerekli" }, { status: 401 });

  const profile = await getProfileByApiKey(apiKey);
  if (!profile) return NextResponse.json({ error: "Geçersiz API anahtarı" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  let query = supabaseAdmin
    .from("items")
    .select("id, title, description, type, category, location, date, status, created_at, image_url, lat, lng")
    .eq("created_by_email", profile.email)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq("type", type);
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data, count: data?.length ?? 0 });
}

export async function POST(req: NextRequest) {
  const apiKey = extractApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "API anahtarı gerekli" }, { status: 401 });

  const profile = await getProfileByApiKey(apiKey);
  if (!profile) return NextResponse.json({ error: "Geçersiz API anahtarı" }, { status: 401 });

  const body = await req.json();
  const { title, description, type, category, location, date } = body;

  if (!title || !type || !["lost", "found"].includes(type)) {
    return NextResponse.json({ error: "title ve type (lost|found) gerekli" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("items").insert({
    title,
    description: description ?? null,
    type,
    category: category ?? null,
    location: location ?? null,
    date: date ?? null,
    created_by_email: profile.email,
    status: "active",
    moderation_status: "approved",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item: data }, { status: 201 });
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getToken(req: Request) {
  return req.headers.get("authorization")?.replace("Bearer ", "").trim() ?? "";
}

async function getUser(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// GET: varsayılan + kullanıcının kendi şablonları
export async function GET(req: Request) {
  const token = getToken(req);
  const user = token ? await getUser(token) : null;

  const query = supabase
    .from("message_templates")
    .select("id, content, is_default, user_id, created_at")
    .order("created_at", { ascending: true });

  if (user) {
    query.or(`user_id.is.null,user_id.eq.${user.id}`);
  } else {
    query.is("user_id", null);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

// POST: kullanıcı özel şablon ekle
export async function POST(req: Request) {
  const token = getToken(req);
  const user = await getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "İçerik gerekli" }, { status: 400 });
  if (content.length > 500) return NextResponse.json({ error: "Çok uzun" }, { status: 400 });

  const { data, error } = await supabase
    .from("message_templates")
    .insert({ user_id: user.id, content: content.trim(), is_default: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

// DELETE: kullanıcı kendi şablonunu siler
export async function DELETE(req: Request) {
  const token = getToken(req);
  const user = await getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

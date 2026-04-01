import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemId, title, description, category, location } = body;
    const text = `${title} ${description} ${category} ${location}`;

    const { data, error } = await supabase.functions.invoke("embed", {
      body: { input: text },
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (error) throw error;
    if (!data?.embedding) throw new Error("Embedding boş geldi");

    const { error: updateError } = await supabase
      .from("items")
      .update({ embedding: data.embedding })
      .eq("id", itemId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Embedding hatası", detail: String(error) }, { status: 500 });
  }
}
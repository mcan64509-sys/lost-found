import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from "../../../../lib/ratelimit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`view:${ip}`);
    if (!rl.allowed) return NextResponse.json({ ok: false });

    const { itemId } = await req.json();
    if (!itemId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId)) {
      return NextResponse.json({ ok: false });
    }

    const { error: rpcError } = await supabase.rpc("increment_view_count", { item_id: itemId });
    if (rpcError) {
      // RPC yoksa direkt SQL ile artır
      const { data: existingItem } = await supabase.from("items").select("view_count").eq("id", itemId).single();
      if (existingItem) {
        await supabase.from("items").update({ view_count: (existingItem.view_count || 0) + 1 }).eq("id", itemId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}

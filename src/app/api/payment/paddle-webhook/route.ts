import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";
import { PADDLE_PRODUCTS, type PaddleProductType } from "../../../../lib/paddle-products";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifyPaddleSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const parts = Object.fromEntries(signatureHeader.split(";").map((p) => p.split("=")));
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;
  const computed = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(h1, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (!verifyPaddleSignature(rawBody, req.headers.get("paddle-signature"))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const eventType = body.event_type as string;

    if (eventType !== "transaction.completed") {
      return NextResponse.json({ ok: true });
    }

    const data = body.data as Record<string, unknown>;
    const customData = data?.custom_data as Record<string, string> | undefined;
    const productType = customData?.productType as PaddleProductType | undefined;
    const itemId = customData?.itemId;
    const userEmail = customData?.userEmail;
    const transactionId = data?.id as string;

    if (!productType || !userEmail) return NextResponse.json({ ok: true });

    const product = PADDLE_PRODUCTS[productType];
    if (!product) return NextResponse.json({ ok: true });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + product.days);

    await supabase.from("payments").insert({
      user_email: userEmail,
      item_id: itemId || null,
      product_type: productType,
      priority_level: product.priority_level,
      amount_cents: product.price_cents,
      currency: "try",
      stripe_session_id: transactionId,
      status: "paid",
      expires_at: expiresAt.toISOString(),
    });

    if (itemId) {
      await supabase.from("items")
        .update({
          priority_level: product.priority_level,
          is_featured: true,
          is_urgent: product.is_urgent,
        })
        .eq("id", itemId)
        .eq("created_by_email", userEmail);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Paddle webhook error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

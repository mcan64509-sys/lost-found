import { NextRequest, NextResponse } from "next/server";
import { stripe, PRODUCTS, type ProductType } from "../../../../lib/stripe";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body);
    }
  } catch (err) {
    return NextResponse.json({ error: "Webhook hatası" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { productType, itemId, userEmail } = session.metadata || {};

    if (!productType || !userEmail) return NextResponse.json({ ok: true });

    const product = PRODUCTS[productType as ProductType];
    if (!product) return NextResponse.json({ ok: true });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + product.days);

    // Ödeme kaydını güncelle
    await supabase.from("payments")
      .update({
        status: "paid",
        stripe_subscription_id: session.subscription as string || null,
        expires_at: expiresAt.toISOString(),
      })
      .eq("stripe_session_id", session.id);

    // İlan varsa priority_level ve is_urgent güncelle
    if (itemId) {
      const updateFields: Record<string, unknown> = {
        priority_level: product.priority_level,
      };
      if ("is_urgent" in product) {
        updateFields.is_urgent = product.is_urgent;
      }
      await supabase.from("items")
        .update(updateFields)
        .eq("id", itemId)
        .eq("created_by_email", userEmail);
    }
  }

  return NextResponse.json({ ok: true });
}

export const config = { api: { bodyParser: false } };

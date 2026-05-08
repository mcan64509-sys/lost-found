import { NextRequest, NextResponse } from "next/server";
import { stripe, PRODUCTS, type ProductType } from "../../../../lib/stripe";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    const { productType, itemId, userEmail } = await req.json() as {
      productType: ProductType;
      itemId?: string;
      userEmail: string;
    };

    const product = PRODUCTS[productType];
    if (!product) return NextResponse.json({ error: "Geçersiz ürün" }, { status: 400 });

    const isSubscription = productType === "subscription_monthly";

    let session;

    if (isSubscription) {
      // Abonelik için recurring price oluştur
      const stripePrice = await stripe.prices.create({
        currency: product.currency,
        unit_amount: product.price_cents,
        recurring: { interval: "month" },
        product_data: { name: product.label },
      });

      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        success_url: `${APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/payment/cancel`,
        customer_email: userEmail,
        metadata: { productType, itemId: itemId || "", userEmail },
      });
    } else {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          quantity: 1,
          price_data: {
            currency: product.currency,
            unit_amount: product.price_cents,
            product_data: {
              name: product.label,
              description: product.desc,
            },
          },
        }],
        success_url: `${APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/payment/cancel`,
        customer_email: userEmail,
        metadata: { productType, itemId: itemId || "", userEmail },
      });
    }

    // Pending ödeme kaydı oluştur
    await supabase.from("payments").insert({
      user_email: userEmail,
      item_id: itemId || null,
      product_type: productType,
      priority_level: product.priority_level,
      amount_cents: product.price_cents,
      currency: product.currency,
      stripe_session_id: session.id,
      status: "pending",
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

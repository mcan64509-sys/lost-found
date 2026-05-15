import Stripe from "stripe";
export { PRODUCTS, type ProductType } from "./stripe-products";

// Lazy init — build sırasında env eksikse crash etmez, sadece runtime'da hata verir
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
  });
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop: string) {
    return getStripe()[prop as keyof Stripe];
  },
});

import Stripe from "stripe";
export { PRODUCTS, type ProductType } from "./stripe-products";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

import Stripe from "stripe";
import { env } from "./env";

let stripeInstance: Stripe | null = null;

export const getStripeInstance = (): Stripe => {
  if (!stripeInstance) {
    stripeInstance = new Stripe(env.stripe.secretKey, {
      apiVersion: "2025-05-28.basil",
      typescript: true,
    });
  }
  return stripeInstance;
};

export const stripe = getStripeInstance();

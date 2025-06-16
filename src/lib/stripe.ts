import { Config } from "@/config";
import "server-only";

import Stripe from "stripe";

export const stripe = new Stripe(Config.stripe.secretKey(), {
  apiVersion: "2025-05-28.basil",
});

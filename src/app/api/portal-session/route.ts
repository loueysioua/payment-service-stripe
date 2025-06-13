import { stripe } from "@/lib/stripe";
import { NextRequest } from "next/server";

export async function getSession(req: NextRequest) {
  console.log("-----------req TExt-----------------", req.text());
  console.log("-------------req formData---------------", req.formData());
  console.log("-------------req Body---------------", req.body());
  console.log("---------------------req Json---------------", req.json());
  // const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
  // const portalSession = await stripe.billingPortal.sessions.create({
  //   customer: sessionId,
  // });
}

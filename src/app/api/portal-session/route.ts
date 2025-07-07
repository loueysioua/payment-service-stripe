import { user } from "@/data/seed/users.seed";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/config/stripe";

export async function GET(req: NextRequest) {
  const customerList = await stripe.customers.list({
    email: user.email,
  });

  const headersList = await headers();
  const origin = headersList.get("origin");

  let customer = customerList.data[0];
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
  });

  return NextResponse.redirect(portalSession.url, 303);
}

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import stripe, { Stripe } from "stripe";
import { user } from "@/data/mocked-user";
import { Config } from "@/config";

const endpointSecret = Config.stripe.webhookKey();

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();

  //needed to get the event after
  const sig = headersList.get("stripe-signature");

  let event: Stripe.Event;

  //get the event
  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: `Webhook Error: ${err}` },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.metadata?.type === "credit_purchase") {
        await handleCreditPurchase(session);
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

//update the datatbasee
async function handleCreditPurchase(
  session: Stripe.Checkout.Session
): Promise<void> {
  try {
    const { userId, credits } = session.metadata!;
    const creditsToAdd = parseInt(credits);

    user.credits += creditsToAdd;
    console.log(`Added ${creditsToAdd} credits to user ${userId}`);
  } catch (error) {
    console.error("Error processing credit purchase:", error);
  }
}

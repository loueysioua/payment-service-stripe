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

  let subscription;
  let status;

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.metadata?.type === "credit_purchase") {
        await handleCreditPurchase(session);
      }
      break;

    case "customer.subscription.trial_will_end":
      subscription = event.data.object;
      status = subscription.status;
      console.log(`Subscription status is ${status}.`);
      // Then define and call a method to handle the subscription trial ending.
      // handleSubscriptionTrialEnding(subscription);
      break;
    case "customer.subscription.deleted":
      subscription = event.data.object;
      status = subscription.status;
      console.log(`Subscription status is ${status}.`);
      // Then define and call a method to handle the subscription deleted.
      // handleSubscriptionDeleted(subscriptionDeleted);
      break;
    case "customer.subscription.created":
      subscription = event.data.object;
      status = subscription.status;
      console.log(`Subscription status is ${status}.`);
      // Then define and call a method to handle the subscription created.
      // handleSubscriptionCreated(subscription);
      break;
    case "customer.subscription.updated":
      subscription = event.data.object;
      status = subscription.status;
      console.log(`Subscription status is ${status}.`);
      // Then define and call a method to handle the subscription update.
      // handleSubscriptionUpdated(subscription);
      break;
    case "entitlements.active_entitlement_summary.updated":
      subscription = event.data.object;
      console.log(`Active entitlement summary updated for ${subscription}.`);
      // Then define and call a method to handle active entitlement summary updated
      // handleEntitlementUpdated(subscription);
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

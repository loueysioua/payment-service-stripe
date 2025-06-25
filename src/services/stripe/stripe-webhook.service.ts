import { getStripeInstance } from "@/config/stripe";
import { env } from "@/config/env";
import type Stripe from "stripe";
import { UserService } from "../user.service";
import { StripeError } from "@/lib/errors/api-errors";

export class StripeWebhookService {
  private readonly stripe = getStripeInstance();
  private readonly userService = UserService.getInstance();
  public static instance: StripeWebhookService;
  private constructor() {}
  static getInstance() {
    if (!this.instance) {
      this.instance = new StripeWebhookService();
    }
    return this.instance;
  }

  async constructEvent(body: any, signature: string): Promise<Stripe.Event> {
    try {
      return this.stripe.webhooks.constructEvent(
        body,
        signature,
        env.stripe.webhookSecret
      );
    } catch (error) {
      throw new StripeError(
        `Webhook signature verification failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "customer.subscription.created":
        await this.handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    if (
      session.mode === "payment" &&
      session.metadata?.type === "credit_purchase"
    ) {
      await this.handleCreditPurchase(session);

      // Generate invoice
      if (session.metadata?.customerId) {
        await this.generateInvoice(session);
      }
    }
  }

  private async handleCreditPurchase(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const { userId, creditsBought } = session.metadata!;
    const creditsToAdd = parseInt(creditsBought);

    await this.userService.addCredits(userId, creditsToAdd);
    console.log(`Added ${creditsToAdd} credits to user ${userId}`);
  }

  private async generateInvoice(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    try {
      const { customerId, quantity, unitPrice, productId } = session.metadata!;
    } catch (error) {
      console.error("Error creating invoice:", error);
    }
  }

  private async handleSubscriptionCreated(
    subscription: Stripe.Subscription
  ): Promise<void> {
    console.log(
      `Subscription created: ${subscription.id}, status: ${subscription.status}`
    );
    // Add subscription handling logic
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription
  ): Promise<void> {
    console.log(
      `Subscription updated: ${subscription.id}, status: ${subscription.status}`
    );
    // Add subscription update handling logic
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription
  ): Promise<void> {
    console.log(
      `Subscription deleted: ${subscription.id}, status: ${subscription.status}`
    );
    // Add subscription deletion handling logic
  }
}

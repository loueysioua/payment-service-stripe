import { getStripeInstance } from "@/config/stripe";
import type Stripe from "stripe";

export class StripeSubscriptionRepository {
  private readonly stripe = getStripeInstance();
  private static instance: StripeSubscriptionRepository;
  private constructor() {}
  static getInstance() {
    if (!this.instance) {
      this.instance = new StripeSubscriptionRepository();
    }
    return this.instance;
  }

  async findActiveByCustomerAndProduct(
    customerId: string,
    productId: string
  ): Promise<Stripe.Subscription | null> {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });

    return (
      subscriptions.data.find((subscription) => {
        const isActive = ["active", "trialing", "past_due"].includes(
          subscription.status
        );
        const hasProduct = subscription.items.data.some(
          (item) => item.price.product === productId
        );
        return isActive && hasProduct;
      }) || null
    );
  }

  async hasActiveSubscription(
    customerId: string,
    productId: string
  ): Promise<boolean> {
    const subscription = await this.findActiveByCustomerAndProduct(
      customerId,
      productId
    );
    return !!subscription;
  }
}

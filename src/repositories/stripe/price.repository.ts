import { getStripeInstance } from "@/config/stripe";
import type Stripe from "stripe";

export class StripePriceRepository {
  private readonly stripe = getStripeInstance();
  private static instance: StripePriceRepository;

  private constructor() {}
  static getInstance() {
    if (!this.instance) {
      this.instance = new StripePriceRepository();
    }
    return this.instance;
  }

  async findByProductId(productId: string): Promise<Stripe.Price | null> {
    const prices = await this.stripe.prices.list({
      product: productId,
      active: true,
      limit: 1,
      expand: ["data.product"],
    });
    return prices.data[0] || null;
  }

  async create(
    productId: string,
    unitAmount: number,
    currency: string = "eur",
    recurring?: { interval: "month" | "year" }
  ): Promise<Stripe.Price> {
    return this.stripe.prices.create({
      unit_amount: unitAmount,
      currency,
      product: productId,
      ...(recurring && { recurring }),
    });
  }
}

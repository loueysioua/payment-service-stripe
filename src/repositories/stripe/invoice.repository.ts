import { stripe } from "@/config/stripe";
import Stripe from "stripe";

export class StripeInvoiceRepository {
  private static instance: StripeInvoiceRepository;

  private constructor() {}

  static getInstance(): StripeInvoiceRepository {
    if (!this.instance) {
      this.instance = new StripeInvoiceRepository();
    }
    return this.instance;
  }

  async findById(stripeInvoiceId: string): Promise<Stripe.Invoice | null> {
    return await stripe.invoices.retrieve(stripeInvoiceId);
  }
}

import { getStripeInstance } from "@/config/stripe";
import type Stripe from "stripe";

export class StripeCustomerRepository {
  private readonly stripe = getStripeInstance();
  private static instance: StripeCustomerRepository;

  private constructor() {}
  static getInstance() {
    if (!this.instance) {
      this.instance = new StripeCustomerRepository();
    }
    return this.instance;
  }

  async findByEmail(email: string): Promise<Stripe.Customer | null> {
    const customers = await this.stripe.customers.list({
      email,
      limit: 1,
    });
    return customers.data[0] || null;
  }

  async create(email: string, userId: string): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email,
      metadata: { userId },
    });
  }

  async getOrCreate(email: string, userId: string): Promise<Stripe.Customer> {
    const existingCustomer = await this.findByEmail(email);
    if (existingCustomer) {
      return existingCustomer;
    }
    return this.create(email, userId);
  }
}

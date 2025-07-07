import { getStripeInstance } from "@/config/stripe";
import { UserService } from "@/services/user.service";
import type Stripe from "stripe";

export class StripeCustomerRepository {
  private readonly stripe = getStripeInstance();
  private readonly userService = UserService.getInstance();
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
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const customer = await this.stripe.customers.create({
      email,
      metadata: { userId },
      address: {
        city: user.city,
        country: user.country,
        postal_code: user.postal,
        state: user.state,
        line1: user.street,
      },
    });

    // Update user with Stripe customer ID
    await this.userService.updateStripeCustomerId(userId, customer.id);

    return customer;
  }

  async getOrCreate(email: string, userId: string): Promise<Stripe.Customer> {
    // First check if user already has a Stripe customer ID
    const user = await this.userService.getUserByEmail(email);
    if (user?.stripeCustomerId) {
      try {
        const customer = await this.stripe.customers.retrieve(
          user.stripeCustomerId
        );
        if (customer && !customer.deleted) {
          return customer as Stripe.Customer;
        }
      } catch (error) {
        console.warn("Stripe customer not found, creating new one");
      }
    }

    // Check if customer exists in Stripe by email
    const existingCustomer = await this.findByEmail(email);
    if (existingCustomer) {
      // Update user with existing customer ID
      if (user) {
        await this.userService.updateStripeCustomerId(
          user.id,
          existingCustomer.id
        );
      }
      return existingCustomer;
    }

    return this.create(email, userId);
  }
}

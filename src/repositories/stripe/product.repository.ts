import { getStripeInstance } from "@/config/stripe";
import type Stripe from "stripe";

export class StripeProductRepository {
  private readonly stripe = getStripeInstance();
  private static instance: StripeProductRepository;

  private constructor() {}

  static getInstance(): StripeProductRepository {
    if (!this.instance) {
      this.instance = new StripeProductRepository();
    }
    return this.instance;
  }

  async create(productData: {
    name: string;
    description?: string;
    images?: string[];
  }): Promise<Stripe.Product> {
    return this.stripe.products.create(productData);
  }

  async findById(productId: string): Promise<Stripe.Product | null> {
    try {
      const product = await this.stripe.products.retrieve(productId);
      return product;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "resource_missing"
      ) {
        return null;
      }
      throw error;
    }
  }

  async list(params?: {
    active?: boolean;
    limit?: number;
  }): Promise<Stripe.Product[]> {
    const products = await this.stripe.products.list({
      active: params?.active,
      limit: params?.limit || 10,
    });
    return products.data;
  }
}

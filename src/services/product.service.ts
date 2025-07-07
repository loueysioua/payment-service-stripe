import { PlanRepository } from "@/repositories/plan.repository";
import { StripeProductRepository } from "@/repositories/stripe/product.repository";
import { StripePriceRepository } from "@/repositories/stripe/price.repository";
import { Plan } from "@prisma/client";
import { ApiError } from "@/lib/errors/api-errors";

export class ProductService {
  private static instance: ProductService;
  private readonly planRepo = PlanRepository.getInstance();
  private readonly stripeProductRepo = StripeProductRepository.getInstance();
  private readonly stripePriceRepo = StripePriceRepository.getInstance();

  private constructor() {}

  static getInstance(): ProductService {
    if (!this.instance) {
      this.instance = new ProductService();
    }
    return this.instance;
  }

  async getAllPlans(): Promise<Plan[]> {
    return this.planRepo.findAll(true);
  }

  async getPlanById(planId: string): Promise<Plan | null> {
    return this.planRepo.findById(planId);
  }

  async createPlan(planData: {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    image?: string;
  }): Promise<Plan> {
    try {
      // Create product in Stripe first
      const stripeProduct = await this.stripeProductRepo.create({
        name: planData.name,
        description: planData.description,
        images: planData.image ? [planData.image] : undefined,
      });

      // Create price for the product
      const price = await this.stripePriceRepo.create(
        stripeProduct.id,
        planData.price,
        planData.currency || "eur",
        { interval: "month" }
      );

      // Create plan in database
      const plan = await this.planRepo.create({
        id: stripeProduct.id,
        name: planData.name,
        description: planData.description,
        price: planData.price * 100, // Store in cents
        currency: planData.currency || "eur",
        image: planData.image,
        priceId: price.id,
      });

      return plan;
    } catch (error) {
      console.error("Error creating plan:", error);
      throw new ApiError(500, "Failed to create plan");
    }
  }

  async ensurePlansExist(
    plans: Array<{
      id: string;
      name: string;
      description?: string;
      price: number;
      currency?: string;
      image?: string;
    }>
  ): Promise<Plan[]> {
    const results: Plan[] = [];

    for (const planData of plans) {
      let plan = await this.planRepo.findById(planData.id);

      if (!plan) {
        plan = await this.createPlan(planData);
      } else if (!plan.priceId) {
        // Update existing plan with Stripe price ID
        const price = await this.stripePriceRepo.create(
          plan.id,
          plan.price,
          plan.currency,
          { interval: "month" }
        );
        plan = await this.planRepo.updatePriceId(plan.id, price.id);
      }

      results.push(plan);
    }

    return results;
  }
}

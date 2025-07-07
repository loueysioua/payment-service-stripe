import { StripePriceRepository } from "@/repositories/stripe/price.repository";
import { StripeSubscriptionRepository } from "@/repositories/stripe/subscription.repository";
import { getStripeInstance } from "@/config/stripe";
import { env } from "@/config/env";
import type {
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  CheckoutSessionMetadata,
  MetadataRecord,
} from "@/types/stripe/checkout.types";
import { StripeCustomerRepository } from "@/repositories/stripe/customer.repository";
import { ApiError, StripeError } from "@/lib/errors/api-errors";

export class StripeCheckoutService {
  private readonly stripe = getStripeInstance();
  private static instance: StripeCheckoutService;
  private readonly customerRepo = StripeCustomerRepository.getInstance();
  private readonly priceRepo = StripePriceRepository.getInstance();
  private readonly subscriptionRepo =
    StripeSubscriptionRepository.getInstance();
  private constructor() {}
  static getInstance() {
    if (!this.instance) {
      this.instance = new StripeCheckoutService();
    }
    return this.instance;
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionParams
  ): Promise<CheckoutSessionResult> {
    try {
      // Validate price exists
      const price = await this.priceRepo.findByProductId(params.productId);
      if (!price) {
        throw new ApiError(404, "Product not found or inactive");
      }

      // Get or create customer
      const customer = await this.customerRepo.getOrCreate(
        params.customerEmail,
        params.userId
      );

      // Check for existing subscription if subscription mode
      if (params.paymentMode === "subscription") {
        const hasActiveSubscription =
          await this.subscriptionRepo.hasActiveSubscription(
            customer.id,
            params.productId
          );

        if (hasActiveSubscription) {
          throw new ApiError(
            409,
            "You already have an active subscription for this product.",
            "SUBSCRIPTION_EXISTS"
          );
        }
      }

      // Validate quantity for credit mode
      const quantity =
        params.paymentMode === "credit-purchase" ? params.quantity || 1 : 1;

      if (params.paymentMode === "credit-purchase" && quantity < 1) {
        throw new ApiError(400, "Invalid quantity");
      }

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        line_items: [
          {
            price: price.id,
            quantity: Math.floor(quantity),
          },
        ],
        mode:
          params.paymentMode === "credit-purchase" ? "payment" : "subscription",
        success_url: `${env.app.baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.app.baseUrl}/?canceled=true`,
        metadata: this.buildSessionMetadata(
          params,
          customer.id,
          price,
          quantity
        ),
      });

      if (!session.url) {
        throw new StripeError("Failed to create checkout session URL");
      }

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new StripeError(
        error instanceof Error ? error.message : "Unknown stripe error"
      );
    }
  }

  private buildSessionMetadata(
    params: CreateCheckoutSessionParams,
    customerId: string,
    price: any,
    quantity: number
  ): MetadataRecord {
    const metadata: CheckoutSessionMetadata = {
      userId: params.userId,
      creditsBought:
        params.paymentMode === "credit-purchase"
          ? quantity * price.unit_amount!
          : price.unit_amount,
      type:
        params.paymentMode === "credit-purchase"
          ? "credit_purchase"
          : "subscription_purchase",
      customerId,
      quantity,
      unitPrice: price.unit_amount,
      productId: params.productId,
    };

    // Convert all values to strings
    return Object.entries(metadata).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>);
  }
}

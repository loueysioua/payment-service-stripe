import { getStripeInstance } from "@/config/stripe";
import { env } from "@/config/env";
import type Stripe from "stripe";
import { UserService } from "../user.service";
import { CreditPurchaseRepository } from "@/repositories/credit-purchase.repository";
import { InvoiceRepository } from "@/repositories/invoice.repository";
import { PlanRepository } from "@/repositories/plan.repository";
import { StripeError } from "@/lib/errors/api-errors";
import { SubscriptionStatus, InvoiceStatus } from "@prisma/client";
import { UserSubscriptionRepository } from "@/repositories/user-subscription";

export class StripeWebhookService {
  private readonly stripe = getStripeInstance();
  private readonly userService = UserService.getInstance();
  private readonly creditPurchaseRepo = CreditPurchaseRepository.getInstance();
  private readonly userSubscriptionRepo =
    UserSubscriptionRepository.getInstance();
  private readonly invoiceRepo = InvoiceRepository.getInstance();
  private readonly planRepo = PlanRepository.getInstance();

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
      case "invoice.payment_succeeded":
        await this.handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice
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
    } else if (session.mode === "subscription") {
      await this.handleSubscriptionPurchase(session);
    }
  }

  private async handleCreditPurchase(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const { userId, creditsBought, productId, quantity, unitPrice } =
      session.metadata!;
    const creditsToAdd = parseInt(creditsBought);

    try {
      // Add credits to user
      await this.userService.addCredits(userId, creditsToAdd);

      // Create credit purchase record
      const plan = await this.planRepo.findById(productId);
      if (plan) {
        await this.creditPurchaseRepo.create({
          user: { connect: { id: userId } },
          plan: { connect: { id: productId } },
          quantity: parseInt(quantity),
          totalAmount: parseInt(unitPrice) * parseInt(quantity),
          stripePaymentIntentId: session.payment_intent as string,
        });
      }

      // Create invoice
      await this.invoiceRepo.create({
        creditPurchase: {
          connect: {
            stripePaymentIntentId: session.payment_intent as string,
          },
        },
        stripeInvoiceId: session.invoice as string,
        totalAmount: session.amount_total,
        status: InvoiceStatus.PAID,
      });

      console.log(`Added ${creditsToAdd} credits to user ${userId}`);
    } catch (error) {
      console.error("Error handling credit purchase:", error);
    }
  }

  private async handleSubscriptionPurchase(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const { userId, productId } = session.metadata!;

    try {
      const subscription: Stripe.Subscription =
        await this.stripe.subscriptions.retrieve(
          session.subscription as string
        );

      await this.userSubscriptionRepo.create({
        user: { connect: { id: userId } },
        plan: { connect: { id: productId } },
        stripeSubscriptionId: subscription.id,
        status: this.mapStripeSubscriptionStatus(subscription.status),
        startDate: new Date(subscription.start_date * 1000),
        endDate: new Date(subscription.items.data[0].current_period_end * 1000),
      });

      console.log(`Created subscription ${subscription.id} for user ${userId}`);
    } catch (error) {
      console.error("Error handling subscription purchase:", error);
    }
  }

  private async handleSubscriptionCreated(
    subscription: Stripe.Subscription
  ): Promise<void> {
    console.log(
      `Subscription created: ${subscription.id}, status: ${subscription.status}`
    );
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription
  ): Promise<void> {
    try {
      const userSubscription =
        await this.userSubscriptionRepo.findByStripeSubscriptionId(
          subscription.id
        );

      if (userSubscription) {
        await this.userSubscriptionRepo.updateStatus(
          userSubscription.id,
          this.mapStripeSubscriptionStatus(subscription.status)
        );
      }

      console.log(
        `Subscription updated: ${subscription.id}, status: ${subscription.status}`
      );
    } catch (error) {
      console.error("Error handling subscription update:", error);
    }
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription
  ): Promise<void> {
    try {
      const userSubscription =
        await this.userSubscriptionRepo.findByStripeSubscriptionId(
          subscription.id
        );

      if (userSubscription) {
        await this.userSubscriptionRepo.updateStatus(
          userSubscription.id,
          SubscriptionStatus.CANCELED
        );
      }

      console.log(
        `Subscription deleted: ${subscription.id}, status: ${subscription.status}`
      );
    } catch (error) {
      console.error("Error handling subscription deletion:", error);
    }
  }

  private async handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice
  ): Promise<void> {
    try {
      await this.invoiceRepo.create({
        stripeInvoiceId: invoice.id,
        totalAmount: invoice.amount_paid,
        status: InvoiceStatus.PAID,
        pdfUrl: invoice.invoice_pdf,
      });

      console.log(`Invoice payment succeeded: ${invoice.id}`);
    } catch (error) {
      console.error("Error handling invoice payment:", error);
    }
  }

  private mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
    switch (status) {
      case "active":
        return SubscriptionStatus.ACTIVE;
      case "inactive":
        return SubscriptionStatus.INACTIVE;
      case "past_due":
        return SubscriptionStatus.PAST_DUE;
      case "canceled":
        return SubscriptionStatus.CANCELED;
      case "unpaid":
        return SubscriptionStatus.UNPAID;
      case "trialing":
        return SubscriptionStatus.TRIALING;
      default:
        return SubscriptionStatus.INACTIVE;
    }
  }
}

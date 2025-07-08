import { StripeInvoiceRepository } from "@/repositories/stripe/invoice.repository";
import { StripeCustomerRepository } from "@/repositories/stripe/customer.repository";
import {
  InvoiceListQuery,
  InvoiceRepository,
} from "@/repositories/invoice.repository";
import { UserService } from "@/services/user.service";
import { PlanRepository } from "@/repositories/plan.repository";
import { CreditPurchaseRepository } from "@/repositories/credit-purchase.repository";
import { ApiError } from "@/lib/errors/api-errors";
import { InvoiceStatus } from "@prisma/client";
import type Stripe from "stripe";
import {
  InvoiceListResponse,
  InvoiceWithDetails,
} from "@/types/invoice/invoice.types";
import { th } from "zod/v4/locales";

export interface CreateCreditPurchaseInvoiceParams {
  userId: string;
  planId: string;
  quantity: number;
  unitPrice: number;
  description?: string;
  autoFinalize?: boolean;
  autoPay?: boolean;
}

export interface InvoiceSyncResult {
  localInvoiceId: string;
  stripeInvoiceId: string;
  status: InvoiceStatus;
  synchronized: boolean;
}

export class InvoiceService {
  private readonly stripeInvoiceRepo = StripeInvoiceRepository.getInstance();
  private readonly stripeCustomerRepo = StripeCustomerRepository.getInstance();
  private readonly invoiceRepo = InvoiceRepository.getInstance();
  private readonly userService = UserService.getInstance();
  private readonly planRepo = PlanRepository.getInstance();
  private readonly creditPurchaseRepo = CreditPurchaseRepository.getInstance();

  private static instance: InvoiceService;

  private constructor() {}

  static getInstance(): InvoiceService {
    if (!this.instance) {
      this.instance = new InvoiceService();
    }
    return this.instance;
  }

  async getUserInvoices(
    userId: string,
    query: InvoiceListQuery
  ): Promise<InvoiceListResponse> {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const invoicesData = await this.invoiceRepo.findByUserId(user.id, query);
    const stripeInvoices = await Promise.all(
      invoicesData.invoices.map((invoice) =>
        this.stripeInvoiceRepo.findById(invoice.stripeInvoiceId!)
      )
    );

    return {
      invoices: invoicesData.invoices.map((invoice, index) => ({
        ...invoice,
        stripeData: stripeInvoices[index],
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        totalCount: invoicesData.invoices.length,
        totalPages: Math.ceil(invoicesData.invoices.length / query.limit),
        hasNext: invoicesData.invoices.length > query.limit,
        hasPrev: invoicesData.invoices.length > query.limit,
      },
    };
  }

  async getInvoiceById(
    invoiceId: string,
    userId: string
  ): Promise<InvoiceWithDetails> {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    const stripeInvoice = await this.stripeInvoiceRepo.findById(
      invoice.stripeInvoiceId!
    );

    return {
      ...invoice,
      stripeData: stripeInvoice,
    };
  }

  async getInvoiceByStripeId(
    stripeInvoiceId: string,
    userId: string
  ): Promise<InvoiceWithDetails> {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const invoice = await this.invoiceRepo.findByStripeInvoiceId(
      stripeInvoiceId
    );
    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    const stripeInvoice = await this.stripeInvoiceRepo.findById(
      invoice.stripeInvoiceId!
    );

    return {
      ...invoice,
      stripeData: stripeInvoice,
    };
  }

  async getInvoiceDownloadUrl(
    invoiceId: string,
    userId: string
  ): Promise<string> {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    // Return local PDF URL if available
    if (invoice.pdfUrl) {
      return invoice.pdfUrl;
    }

    // Get from Stripe
    if (!invoice.stripeInvoiceId)
      throw new ApiError(404, "Stripe invoice not found");
    const pdfUrl = await this.stripeInvoiceRepo.getPdfUrl(
      invoice.stripeInvoiceId
    );
    if (!pdfUrl) throw new ApiError(404, "Stripe invoice PDF not available");
    const localInvoice = await this.invoiceRepo.updatePdfUrl(invoiceId, pdfUrl);
    return localInvoice.pdfUrl!;
  }

  /**
   * Create a Stripe invoice for credit purchase and sync to local database
   */
  async createCreditPurchaseInvoice(
    params: CreateCreditPurchaseInvoiceParams
  ): Promise<InvoiceSyncResult> {
    try {
      // 1. Validate user and plan
      const user = await this.userService.getUserById(params.userId);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      const plan = await this.planRepo.findById(params.planId);
      if (!plan) {
        throw new ApiError(404, "Plan not found");
      }

      // 2. Get or create Stripe customer
      const stripeCustomer = await this.stripeCustomerRepo.getOrCreate(
        user.email,
        user.id
      );

      // 3. Create Stripe invoice
      const stripeInvoice = await this.stripeInvoiceRepo.create({
        customerId: stripeCustomer.id,
        description: params.description || `Credits Purchase - ${plan.name}`,
        metadata: {
          userId: user.id,
          planId: plan.id,
          type: "credit_purchase",
          quantity: params.quantity.toString(),
        },
        autoAdvance: false, // We'll handle finalization manually
        collectionMethod: "charge_automatically",
        currency: plan.currency,
      });

      if (!stripeInvoice || !stripeInvoice.id) {
        throw new ApiError(500, "Stripe invoice creation error");
      }
      // 4. Add invoice item
      await this.stripeInvoiceRepo.addItem({
        customerId: stripeCustomer.id,
        invoiceId: stripeInvoice.id,
        priceId: plan.priceId || undefined,
        unitAmount: plan.priceId ? undefined : params.unitPrice,
        quantity: params.quantity,
        description: `${plan.name} - ${params.quantity} units`,
        metadata: {
          planId: plan.id,
          type: "credit_purchase",
        },
      });

      // 5. Create credit purchase record
      const creditPurchase = await this.creditPurchaseRepo.create({
        user: { connect: { id: user.id } },
        plan: { connect: { id: plan.id } },
        quantity: params.quantity,
        totalAmount: params.unitPrice * params.quantity,
      });

      // 6. Create local invoice record
      const localInvoice = await this.invoiceRepo.create({
        creditPurchase: { connect: { id: creditPurchase.id } },
        stripeInvoiceId: stripeInvoice.id,
        totalAmount: stripeInvoice.amount_due,
        status: this.mapStripeInvoiceStatus(stripeInvoice.status),
      });

      // 7. Finalize invoice if requested
      if (params.autoFinalize) {
        await this.stripeInvoiceRepo.finalize(stripeInvoice.id);

        // Update local status
        await this.invoiceRepo.updateStatus(localInvoice.id, {
          status: InvoiceStatus.PENDING,
        });
      }

      // 8. Auto-pay if requested
      if (params.autoPay && params.autoFinalize) {
        await this.stripeInvoiceRepo.pay(stripeInvoice.id);

        // The webhook will handle the payment success update
      }

      return {
        localInvoiceId: localInvoice.id,
        stripeInvoiceId: stripeInvoice.id,
        status: this.mapStripeInvoiceStatus(stripeInvoice.status),
        synchronized: true,
      };
    } catch (error) {
      console.error("Error creating credit purchase invoice:", error);
      throw error;
    }
  }

  /**
   * Sync a Stripe invoice to local database
   */
  async syncInvoiceFromStripe(
    stripeInvoiceId: string
  ): Promise<InvoiceSyncResult> {
    try {
      // 1. Get Stripe invoice
      const stripeInvoice = await this.stripeInvoiceRepo.findById(
        stripeInvoiceId
      );
      if (!stripeInvoice) {
        throw new ApiError(404, "Stripe invoice not found");
      }

      // 2. Check if local invoice exists
      let localInvoice = await this.invoiceRepo.findByStripeInvoiceId(
        stripeInvoiceId
      );

      if (!localInvoice) {
        // Create new local invoice if it doesn't exist
        localInvoice = await this.invoiceRepo.create({
          stripeInvoiceId,
          totalAmount: stripeInvoice.amount_due,
          status: this.mapStripeInvoiceStatus(stripeInvoice.status),
          pdfUrl: stripeInvoice.invoice_pdf,
        });
      } else {
        // Update existing invoice
        localInvoice = await this.invoiceRepo.updateFromStripe(
          localInvoice.id,
          {
            totalAmount: stripeInvoice.amount_due,
            status: this.mapStripeInvoiceStatus(stripeInvoice.status),
            pdfUrl: stripeInvoice.invoice_pdf ?? undefined,
          }
        );
      }

      return {
        localInvoiceId: localInvoice.id,
        stripeInvoiceId,
        status: localInvoice.status,
        synchronized: true,
      };
    } catch (error) {
      console.error("Error syncing invoice from Stripe:", error);
      throw error;
    }
  }

  /**
   * Finalize a draft invoice
   */
  async finalizeInvoice(localInvoiceId: string): Promise<void> {
    const localInvoice = await this.invoiceRepo.findById(localInvoiceId);
    if (!localInvoice || !localInvoice.stripeInvoiceId) {
      throw new ApiError(404, "Invoice not found");
    }

    // Finalize in Stripe
    await this.stripeInvoiceRepo.finalize(localInvoice.stripeInvoiceId);

    // Update local status
    await this.invoiceRepo.updateStatus(localInvoice.id, {
      status: InvoiceStatus.PENDING,
    });
  }

  /**
   * Send an invoice to customer
   */
  async sendInvoice(localInvoiceId: string): Promise<void> {
    const localInvoice = await this.invoiceRepo.findById(localInvoiceId);
    if (!localInvoice || !localInvoice.stripeInvoiceId) {
      throw new ApiError(404, "Invoice not found");
    }

    await this.stripeInvoiceRepo.send(localInvoice.stripeInvoiceId);
  }

  /**
   * Pay an invoice immediately
   */
  async payInvoice(localInvoiceId: string): Promise<void> {
    const localInvoice = await this.invoiceRepo.findById(localInvoiceId);
    if (!localInvoice || !localInvoice.stripeInvoiceId) {
      throw new ApiError(404, "Invoice not found");
    }

    await this.stripeInvoiceRepo.pay(localInvoice.stripeInvoiceId);

    // The webhook will handle the payment success update
  }

  /**
   * Void an invoice
   */
  async voidInvoice(localInvoiceId: string): Promise<void> {
    const localInvoice = await this.invoiceRepo.findById(localInvoiceId);
    if (!localInvoice || !localInvoice.stripeInvoiceId) {
      throw new ApiError(404, "Invoice not found");
    }

    await this.stripeInvoiceRepo.void(localInvoice.stripeInvoiceId);

    // Update local status
    await this.invoiceRepo.updateStatus(localInvoice.id, {
      status: InvoiceStatus.VOID,
    });
  }

  /**
   * Batch sync multiple invoices
   */
  async batchSyncInvoices(
    stripeInvoiceIds: string[]
  ): Promise<InvoiceSyncResult[]> {
    const results: InvoiceSyncResult[] = [];

    for (const stripeInvoiceId of stripeInvoiceIds) {
      try {
        const result = await this.syncInvoiceFromStripe(stripeInvoiceId);
        results.push(result);
      } catch (error) {
        console.error(`Error syncing invoice ${stripeInvoiceId}:`, error);
        results.push({
          localInvoiceId: "",
          stripeInvoiceId,
          status: InvoiceStatus.FAILED,
          synchronized: false,
        });
      }
    }

    return results;
  }

  /**
   * Get invoice PDF URL
   */
  async getInvoicePdfUrl(localInvoiceId: string): Promise<string | null> {
    const localInvoice = await this.invoiceRepo.findById(localInvoiceId);
    if (!localInvoice) {
      throw new ApiError(404, "Invoice not found");
    }

    // Return local PDF URL if available
    if (localInvoice.pdfUrl) {
      return localInvoice.pdfUrl;
    }

    // Get from Stripe
    if (localInvoice.stripeInvoiceId) {
      const pdfUrl = await this.stripeInvoiceRepo.getPdfUrl(
        localInvoice.stripeInvoiceId
      );

      if (pdfUrl) {
        // Update local record
        await this.invoiceRepo.updatePdfUrl(localInvoice.id, pdfUrl);
      }

      return pdfUrl;
    }

    return null;
  }

  /**
   * Map Stripe invoice status to local invoice status
   */
  private mapStripeInvoiceStatus(stripeStatus: string | null): InvoiceStatus {
    switch (stripeStatus) {
      case "draft":
        return InvoiceStatus.PENDING;
      case "open":
        return InvoiceStatus.OPEN;
      case "paid":
        return InvoiceStatus.PAID;
      case "uncollectible":
        return InvoiceStatus.FAILED;
      case "void":
        return InvoiceStatus.VOID;
      default:
        return InvoiceStatus.PENDING;
    }
  }
}

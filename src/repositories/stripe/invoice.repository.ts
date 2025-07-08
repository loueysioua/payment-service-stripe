import { getStripeInstance } from "@/config/stripe";
import Stripe from "stripe";

export interface CreateInvoiceParams {
  customerId: string;
  description?: string;
  metadata?: Record<string, string>;
  autoAdvance?: boolean;
  collectionMethod?: "charge_automatically" | "send_invoice";
  daysUntilDue?: number;
  footer?: string;
  currency?: string;
}

export interface AddInvoiceItemParams {
  invoiceId: string;
  priceId?: string;
  quantity?: number;
  unitAmount?: number;
  description?: string;
  metadata?: Record<string, string>;
  customerId: string;
}

export class StripeInvoiceRepository {
  private readonly stripe = getStripeInstance();
  private static instance: StripeInvoiceRepository;

  private constructor() {}

  static getInstance(): StripeInvoiceRepository {
    if (!this.instance) {
      this.instance = new StripeInvoiceRepository();
    }
    return this.instance;
  }

  /**
   * Create a new invoice in Stripe
   */
  async create(params: CreateInvoiceParams): Promise<Stripe.Invoice> {
    return await this.stripe.invoices.create({
      customer: params.customerId,
      description: params.description,
      metadata: params.metadata,
      auto_advance: params.autoAdvance ?? false,
      collection_method: params.collectionMethod ?? "charge_automatically",
      days_until_due: params.daysUntilDue,
      footer: params.footer,
      currency: params.currency ?? "eur",
    });
  }

  /**
   * Add an item to an existing invoice
   */
  async addItem(params: AddInvoiceItemParams): Promise<Stripe.InvoiceItem> {
    const invoiceItemParams: Stripe.InvoiceItemCreateParams = {
      customer: params.customerId,
      invoice: params.invoiceId,
      description: params.description,
      metadata: params.metadata,
    };

    if (params.unitAmount) {
      invoiceItemParams.unit_amount_decimal = params.unitAmount + "";
      invoiceItemParams.quantity = params.quantity ?? 1;
    }

    return await this.stripe.invoiceItems.create(invoiceItemParams);
  }

  /**
   * Finalize an invoice (makes it immutable and sends it)
   */
  async finalize(invoiceId: string): Promise<Stripe.Invoice> {
    return await this.stripe.invoices.finalizeInvoice(invoiceId);
  }

  /**
   * Send an invoice to the customer
   */
  async send(invoiceId: string): Promise<Stripe.Invoice> {
    return await this.stripe.invoices.sendInvoice(invoiceId);
  }

  /**
   * Pay an invoice immediately
   */
  async pay(invoiceId: string): Promise<Stripe.Invoice> {
    return await this.stripe.invoices.pay(invoiceId);
  }

  /**
   * Retrieve an invoice by ID
   */
  async findById(invoiceId: string): Promise<Stripe.Invoice | null> {
    try {
      return await this.stripe.invoices.retrieve(invoiceId, {
        expand: ["payment_intent", "subscription", "charge"],
      });
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

  /**
   * List invoices for a customer
   */
  async listByCustomer(
    customerId: string,
    options?: {
      limit?: number;
      status?: "draft" | "open" | "paid" | "uncollectible" | "void";
      startingAfter?: string;
    }
  ): Promise<Stripe.Invoice[]> {
    const invoices = await this.stripe.invoices.list({
      customer: customerId,
      limit: options?.limit ?? 10,
      status: options?.status,
      starting_after: options?.startingAfter,
    });
    return invoices.data;
  }

  /**
   * Update an invoice
   */
  async update(
    invoiceId: string,
    params: Partial<{
      description: string;
      metadata: Record<string, string>;
      footer: string;
      daysUntilDue: number;
    }>
  ): Promise<Stripe.Invoice> {
    return await this.stripe.invoices.update(invoiceId, {
      description: params.description,
      metadata: params.metadata,
      footer: params.footer,
      days_until_due: params.daysUntilDue,
    });
  }

  /**
   * Void an invoice
   */
  async void(invoiceId: string): Promise<Stripe.Invoice> {
    return await this.stripe.invoices.voidInvoice(invoiceId);
  }

  /**
   * Delete a draft invoice
   */
  async delete(invoiceId: string): Promise<Stripe.DeletedInvoice> {
    return await this.stripe.invoices.del(invoiceId);
  }

  /**
   * Get invoice PDF URL
   */
  async getPdfUrl(invoiceId: string): Promise<string | null> {
    const invoice = await this.findById(invoiceId);
    return invoice?.invoice_pdf || null;
  }

  /**
   * Mark invoice as uncollectible
   */
  async markUncollectible(invoiceId: string): Promise<Stripe.Invoice> {
    return await this.stripe.invoices.markUncollectible(invoiceId);
  }
}

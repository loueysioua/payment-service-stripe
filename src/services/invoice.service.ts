// src/services/invoice.service.ts
import { InvoiceRepository } from "@/repositories/invoice.repository";
import { UserService } from "@/services/user.service";
import { ApiError } from "@/lib/errors/api-errors";
import { Invoice, InvoiceStatus } from "@prisma/client";
import type {
  InvoiceListQuery,
  InvoiceListResponse,
  InvoiceWithDetails,
} from "@/types/invoice/invoice.types";
import { StripeInvoiceRepository } from "@/repositories/stripe/invoice.repository";

export class InvoiceService {
  private static instance: InvoiceService;
  private readonly invoiceRepo = InvoiceRepository.getInstance();
  private readonly stripeInvoiceRepo = StripeInvoiceRepository.getInstance();
  private readonly userService = UserService.getInstance();

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
    // Verify user exists
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Get invoices from database
    const { invoices, totalCount } = await this.invoiceRepo.findByUserId(
      userId,
      query
    );

    // Enrich with Stripe data if needed
    const enrichedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        if (invoice.stripeInvoiceId) {
          const stripeInvoice = await this.stripeInvoiceRepo.findById(
            invoice.stripeInvoiceId
          );
          return {
            ...invoice,
            stripeData: stripeInvoice,
          };
        }
        return { ...invoice, stripeData: null };
      })
    );

    const totalPages = Math.ceil(totalCount / query.limit);

    return {
      invoices: enrichedInvoices,
      pagination: {
        page: query.page,
        limit: query.limit,
        totalCount,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    };
  }

  async getInvoiceById(
    invoiceId: string,
    userId: string
  ): Promise<InvoiceWithDetails | null> {
    // Verify user exists
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Get invoice from database
    const invoice = await this.invoiceRepo.findByIdAndUserId(invoiceId, userId);
    if (!invoice) {
      return null;
    }

    // Enrich with Stripe data
    let stripeInvoice = null;
    if (invoice.stripeInvoiceId) {
      stripeInvoice = await this.stripeInvoiceRepo.findById(
        invoice.stripeInvoiceId
      );
    }

    return {
      ...invoice,
      stripeData: stripeInvoice,
    };
  }

  async getInvoiceByStripeId(
    stripeInvoiceId: string,
    userId: string
  ): Promise<InvoiceWithDetails | null> {
    // Verify user exists
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Get invoice from database
    const invoice = await this.invoiceRepo.findByStripeInvoiceIdAndUserId(
      stripeInvoiceId,
      userId
    );
    if (!invoice) {
      return null;
    }

    // Get Stripe invoice data
    const stripeInvoice = await this.stripeInvoiceRepo.findById(
      stripeInvoiceId
    );

    return {
      ...invoice,
      stripeData: stripeInvoice,
    };
  }

  async getInvoiceDownloadUrl(
    invoiceId: string,
    userId: string
  ): Promise<string | null> {
    // Get invoice
    const invoice = await this.getInvoiceById(invoiceId, userId);
    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    // Return direct PDF URL if available
    if (invoice.pdfUrl) {
      return invoice.pdfUrl;
    }

    // Get from Stripe if we have the invoice ID
    if (invoice.stripeInvoiceId) {
      const stripeInvoice = await this.stripeInvoiceRepo.findById(
        invoice.stripeInvoiceId
      );
      if (stripeInvoice?.invoice_pdf) {
        // Update our record with the PDF URL
        await this.invoiceRepo.updatePdfUrl(
          invoice.id,
          stripeInvoice.invoice_pdf
        );
        return stripeInvoice.invoice_pdf;
      }
    }

    return null;
  }

  async syncInvoiceWithStripe(invoiceId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice || !invoice.stripeInvoiceId) {
      throw new ApiError(404, "Invoice not found or no Stripe ID");
    }

    const stripeInvoice = await this.stripeInvoiceRepo.findById(
      invoice.stripeInvoiceId
    );
    if (!stripeInvoice) {
      throw new ApiError(404, "Stripe invoice not found");
    }

    // Update invoice with latest Stripe data
    const updatedInvoice = await this.invoiceRepo.updateFromStripe(invoice.id, {
      totalAmount: stripeInvoice.amount_paid || stripeInvoice.amount_due,
      status: this.mapStripeInvoiceStatus(stripeInvoice.status),
      pdfUrl: stripeInvoice.invoice_pdf ?? undefined,
      dueDate: stripeInvoice.due_date
        ? new Date(stripeInvoice.due_date * 1000)
        : undefined,
    });

    return updatedInvoice;
  }

  async markInvoiceAsPaid(
    stripeInvoiceId: string,
    amountPaid: number,
    pdfUrl?: string
  ): Promise<void> {
    const invoice = await this.invoiceRepo.findByStripeInvoiceId(
      stripeInvoiceId
    );
    if (!invoice) {
      console.warn(`Invoice not found for Stripe ID: ${stripeInvoiceId}`);
      return;
    }

    await this.invoiceRepo.updateStatus(invoice.id, {
      status: InvoiceStatus.PAID,
      totalAmount: amountPaid,
      pdfUrl,
      paidAt: new Date(),
    });
  }

  private mapStripeInvoiceStatus(stripeStatus: string | null): InvoiceStatus {
    switch (stripeStatus) {
      case "paid":
        return InvoiceStatus.PAID;
      case "open":
        return InvoiceStatus.PENDING;
      case "void":
        return InvoiceStatus.VOID;
      case "uncollectible":
        return InvoiceStatus.FAILED;
      default:
        return InvoiceStatus.PENDING;
    }
  }
}

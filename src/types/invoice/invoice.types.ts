import { Invoice, InvoiceStatus } from "@prisma/client";
import Stripe from "stripe";

export type InvoiceListQuery = {
  page: number;
  limit: number;
  status?: InvoiceStatus;
  dateFrom?: string;
  dateTo?: string;
};

export type InvoiceListResponse = {
  invoices: InvoiceWithDetails[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type InvoiceWithDetails = Invoice & {
  stripeData: Stripe.Invoice | null;
};

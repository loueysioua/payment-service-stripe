export interface Invoice {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName?: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
  dueDate?: Date;
  createdAt: Date;
  paidAt?: Date;
  items: InvoiceItem[];
  stripeInvoiceId?: string;
  paymentIntentId?: string;
  metadata?: Record<string, string>;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  productId?: string;
}

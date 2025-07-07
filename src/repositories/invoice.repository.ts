import { prisma } from "@/config/db";
import { Invoice, Prisma } from "@prisma/client";

export class InvoiceRepository {
  private static instance: InvoiceRepository;

  private constructor() {}

  static getInstance(): InvoiceRepository {
    if (!this.instance) {
      this.instance = new InvoiceRepository();
    }
    return this.instance;
  }

  async create(data: Prisma.InvoiceCreateInput): Promise<Invoice> {
    return prisma.invoice.create({
      data,
    });
  }

  async findByStripeInvoiceId(
    stripeInvoiceId: string
  ): Promise<Invoice | null> {
    return prisma.invoice.findUnique({
      where: { stripeInvoiceId },
    });
  }
}

import { prisma } from "@/config/db";
import { Invoice, InvoiceStatus, Prisma } from "@prisma/client";

export type InvoiceListQuery = {
  page: number;
  limit: number;
  status?: InvoiceStatus;
  dateFrom?: string;
  dateTo?: string;
};

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
      include: {
        creditPurchase: {
          include: {
            user: true,
            plan: true,
          },
        },
        userSubscription: {
          include: {
            user: true,
            plan: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<Invoice | null> {
    return prisma.invoice.findUnique({
      where: { id },
      include: {
        creditPurchase: {
          include: {
            user: true,
            plan: true,
          },
        },
        userSubscription: {
          include: {
            user: true,
            plan: true,
          },
        },
      },
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Invoice | null> {
    return prisma.invoice.findFirst({
      where: {
        id,
        OR: [{ creditPurchase: { userId } }, { userSubscription: { userId } }],
      },
      include: {
        creditPurchase: {
          include: {
            user: true,
            plan: true,
          },
        },
        userSubscription: {
          include: {
            user: true,
            plan: true,
          },
        },
      },
    });
  }

  async findByStripeInvoiceId(
    stripeInvoiceId: string
  ): Promise<Invoice | null> {
    return prisma.invoice.findUnique({
      where: { stripeInvoiceId },
      include: {
        creditPurchase: {
          include: {
            user: true,
            plan: true,
          },
        },
        userSubscription: {
          include: {
            user: true,
            plan: true,
          },
        },
      },
    });
  }

  async findByStripeInvoiceIdAndUserId(
    stripeInvoiceId: string,
    userId: string
  ): Promise<Invoice | null> {
    return prisma.invoice.findFirst({
      where: {
        stripeInvoiceId,
        OR: [{ creditPurchase: { userId } }, { userSubscription: { userId } }],
      },
      include: {
        creditPurchase: {
          include: {
            user: true,
            plan: true,
          },
        },
        userSubscription: {
          include: {
            user: true,
            plan: true,
          },
        },
      },
    });
  }

  async findByUserId(
    userId: string,
    query: InvoiceListQuery
  ): Promise<{ invoices: Invoice[]; totalCount: number }> {
    const { page, limit, status, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Prisma.InvoiceWhereInput = {
      OR: [{ creditPurchase: { userId } }, { userSubscription: { userId } }],
    };

    // Add status filter
    if (status) {
      whereClause.status = status as InvoiceStatus;
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.createdAt.lte = new Date(dateTo);
      }
    }

    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        include: {
          creditPurchase: {
            include: {
              user: true,
              plan: true,
            },
          },
          userSubscription: {
            include: {
              user: true,
              plan: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where: whereClause }),
    ]);

    return { invoices, totalCount };
  }

  async updateStatus(
    id: string,
    data: {
      status: InvoiceStatus;
      totalAmount?: number;
      pdfUrl?: string;
      paidAt?: Date;
      dueDate?: Date;
    }
  ): Promise<Invoice> {
    return prisma.invoice.update({
      where: { id },
      data,
      include: {
        creditPurchase: {
          include: {
            user: true,
            plan: true,
          },
        },
        userSubscription: {
          include: {
            user: true,
            plan: true,
          },
        },
      },
    });
  }

  async updateFromStripe(
    id: string,
    data: {
      totalAmount?: number;
      status?: InvoiceStatus;
      pdfUrl?: string;
      dueDate?: Date;
    }
  ): Promise<Invoice> {
    return prisma.invoice.update({
      where: { id },
      data,
      include: {
        creditPurchase: {
          include: {
            user: true,
            plan: true,
          },
        },
        userSubscription: {
          include: {
            user: true,
            plan: true,
          },
        },
      },
    });
  }

  async updatePdfUrl(id: string, pdfUrl: string): Promise<Invoice> {
    return prisma.invoice.update({
      where: { id },
      data: { pdfUrl },
    });
  }

  async getInvoicesSummary(userId: string): Promise<{
    totalCount: number;
    paidCount: number;
    pendingCount: number;
    totalAmount: number;
    paidAmount: number;
  }> {
    const whereClause: Prisma.InvoiceWhereInput = {
      OR: [{ creditPurchase: { userId } }, { userSubscription: { userId } }],
    };

    const [
      totalCount,
      paidCount,
      pendingCount,
      totalAmountResult,
      paidAmountResult,
    ] = await Promise.all([
      prisma.invoice.count({ where: whereClause }),
      prisma.invoice.count({
        where: { ...whereClause, status: InvoiceStatus.PAID },
      }),
      prisma.invoice.count({
        where: { ...whereClause, status: InvoiceStatus.PENDING },
      }),
      prisma.invoice.aggregate({
        where: whereClause,
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { ...whereClause, status: InvoiceStatus.PAID },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalCount,
      paidCount,
      pendingCount,
      totalAmount: totalAmountResult._sum.totalAmount || 0,
      paidAmount: paidAmountResult._sum.totalAmount || 0,
    };
  }
}

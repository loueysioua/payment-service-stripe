import { prisma } from "@/config/db";
import { CreditPurchase, Prisma } from "@prisma/client";

export class CreditPurchaseRepository {
  private static instance: CreditPurchaseRepository;

  private constructor() {}

  static getInstance(): CreditPurchaseRepository {
    if (!this.instance) {
      this.instance = new CreditPurchaseRepository();
    }
    return this.instance;
  }

  async create(
    data: Prisma.CreditPurchaseCreateInput
  ): Promise<CreditPurchase> {
    return prisma.creditPurchase.create({
      data,
    });
  }

  async findByStripePaymentIntentId(
    stripePaymentIntentId: string
  ): Promise<CreditPurchase | null> {
    return prisma.creditPurchase.findUnique({
      where: { stripePaymentIntentId },
      include: {
        user: true,
        plan: true,
      },
    });
  }

  async findByUserId(userId: string): Promise<CreditPurchase[]> {
    return prisma.creditPurchase.findMany({
      where: { userId },
      include: {
        plan: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

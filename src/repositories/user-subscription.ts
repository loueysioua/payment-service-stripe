import { prisma } from "@/config/db";
import { UserSubscription, Prisma, SubscriptionStatus } from "@prisma/client";

export class UserSubscriptionRepository {
  private static instance: UserSubscriptionRepository;

  private constructor() {}

  static getInstance(): UserSubscriptionRepository {
    if (!this.instance) {
      this.instance = new UserSubscriptionRepository();
    }
    return this.instance;
  }

  async create(
    data: Prisma.UserSubscriptionCreateInput
  ): Promise<UserSubscription> {
    return prisma.userSubscription.create({
      data,
    });
  }

  async findByStripeSubscriptionId(
    stripeSubscriptionId: string
  ): Promise<UserSubscription | null> {
    return prisma.userSubscription.findUnique({
      where: { stripeSubscriptionId },
      include: {
        user: true,
        plan: true,
      },
    });
  }

  async findActiveByUserAndPlan(
    userId: string,
    planId: string
  ): Promise<UserSubscription | null> {
    return prisma.userSubscription.findFirst({
      where: {
        userId,
        planId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
      },
      include: {
        plan: true,
      },
    });
  }

  async updateStatus(
    id: string,
    status: SubscriptionStatus
  ): Promise<UserSubscription> {
    return prisma.userSubscription.update({
      where: { id },
      data: { status },
    });
  }

  async findByUserId(userId: string): Promise<UserSubscription[]> {
    return prisma.userSubscription.findMany({
      where: { userId },
      include: {
        plan: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

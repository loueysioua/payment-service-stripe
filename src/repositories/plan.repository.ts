import { prisma } from "@/config/db";
import { Plan, Prisma } from "@prisma/client";

export class PlanRepository {
  private static instance: PlanRepository;

  private constructor() {}

  static getInstance(): PlanRepository {
    if (!this.instance) {
      this.instance = new PlanRepository();
    }
    return this.instance;
  }

  async findById(id: string): Promise<Plan | null> {
    return prisma.plan.findUnique({
      where: { id },
    });
  }

  async findAll(activeOnly: boolean = true): Promise<Plan[]> {
    return prisma.plan.findMany({
      where: activeOnly ? { active: true } : {},
      orderBy: { createdAt: "desc" },
    });
  }

  async create(planData: Prisma.PlanCreateInput): Promise<Plan> {
    return prisma.plan.create({
      data: planData,
    });
  }

  async updatePriceId(planId: string, priceId: string): Promise<Plan> {
    return prisma.plan.update({
      where: { id: planId },
      data: { priceId },
    });
  }
}

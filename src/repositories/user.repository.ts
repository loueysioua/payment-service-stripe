import { prisma } from "@/config/db";
import { User, Prisma } from "@prisma/client";

export class UserRepository {
  private static instance: UserRepository;

  private constructor() {}

  static getInstance(): UserRepository {
    if (!this.instance) {
      this.instance = new UserRepository();
    }
    return this.instance;
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async create(userData: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data: userData,
    });
  }

  async updateCredits(userId: string, credits: number): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: credits,
        },
      },
    });
  }

  async updateStripeCustomerId(
    userId: string,
    stripeCustomerId: string
  ): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId,
      },
    });
  }
}

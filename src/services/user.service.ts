import { UserRepository } from "@/repositories/user.repository";
import { User } from "@prisma/client";
import { ApiError } from "@/lib/errors/api-errors";

export class UserService {
  private static instance: UserService;
  private readonly userRepo = UserRepository.getInstance();

  private constructor() {}

  static getInstance(): UserService {
    if (!this.instance) {
      this.instance = new UserService();
    }
    return this.instance;
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.userRepo.findById(userId);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepo.findByEmail(email);
  }

  async createUser(userData: {
    nom: string;
    prenom: string;
    email: string;
    city: string;
    country: string;
    postal: string;
    state: string;
    street: string;
    stripeCustomerId?: string;
  }): Promise<User> {
    return this.userRepo.create(userData);
  }

  async addCredits(userId: string, credits: number): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return this.userRepo.updateCredits(userId, credits);
  }

  async getUserCredits(userId: string): Promise<number> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    return user.credits;
  }

  async updateStripeCustomerId(
    userId: string,
    stripeCustomerId: string
  ): Promise<User> {
    return this.userRepo.updateStripeCustomerId(userId, stripeCustomerId);
  }
}

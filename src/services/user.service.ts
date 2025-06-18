import { user } from "@/data/mocked-user";

export class UserService {
  public static instance: UserService;
  private constructor() {}
  static getInstance() {
    if (!this.instance) {
      this.instance = new UserService();
    }
    return this.instance;
  }

  async addCredits(userId: string, credits: number): Promise<void> {
    //TODO: replace with actual database operations
    user.credits += credits;
    console.log(`Added ${credits} credits to user ${userId}`);
  }

  async getUserCredits(userId: string): Promise<number> {
    //TODO: replace with actual database operations
    return user.credits;
  }
}

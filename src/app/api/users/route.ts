import { ApiResponseBuilder } from "@/lib/utils/api-response";
import { UserRepository } from "@/repositories/user.repository";

export async function GET() {
  return ApiResponseBuilder.success(
    UserRepository.getInstance().findByEmail("alice@prisma.io")
  );
}

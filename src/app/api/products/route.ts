import { ProductService } from "@/services/product.service";
import { ApiResponseBuilder } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/errors/error-handler";

// Mock data for initial setup - you can remove this once you have plans in your database
const initialPlans = [
  {
    id: "prenium_123456789",
    name: "subscription",
    description: "A premium credit package",
    price: 85 * 100,
    currency: "eur",
    image: "https://stripe.com/img/hello-world-image.png",
  },
  {
    id: "product_123456",
    name: "product test",
    description: "A basic credit package",
    price: 49 * 100,
    currency: "eur",
    image: "https://stripe.com/img/hello-world-image.png",
  },
];

export async function GET() {
  try {
    const productService = ProductService.getInstance();

    // Get all plans from database
    const plans = await productService.getAllPlans();

    return ApiResponseBuilder.success(plans);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const planData = await request.json();
    const productService = ProductService.getInstance();

    const newPlan = await productService.createPlan(planData);

    return ApiResponseBuilder.success(newPlan, "Plan created successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

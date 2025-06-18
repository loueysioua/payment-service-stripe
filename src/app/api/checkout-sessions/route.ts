import { NextRequest } from "next/server";
import { StripeCheckoutService } from "@/services/stripe/stripe-checkout.service";
import { checkoutSessionSchema } from "@/lib/validations/checkout.validation";
import { ApiResponseBuilder } from "@/lib/utils/api-response";
import { user } from "@/data/mocked-user";
import { ValidationError } from "@/lib/errors/api-errors";
import { handleApiError } from "@/lib/errors/error-handler";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Extract and validate form data
    const rawData = {
      productId: formData.get("productId") as string,
      paymentMode: formData.get("paymentMode") as
        | "credit-mode"
        | "subscription-mode",
      quantity: formData.get("quantity")
        ? parseInt(formData.get("quantity") as string)
        : undefined,
    };

    // Validate input
    const validatedData = checkoutSessionSchema.parse(rawData);

    // Validate quantity for credit mode
    if (
      validatedData.paymentMode === "credit-mode" &&
      !validatedData.quantity
    ) {
      throw new ValidationError("Quantity is required for credit mode");
    }

    // Create checkout session
    const checkoutService = StripeCheckoutService.getInstance();
    const result = await checkoutService.createCheckoutSession({
      ...validatedData,
      userId: user.id,
      customerEmail: user.email,
    });

    return ApiResponseBuilder.redirect(result.url);
  } catch (error) {
    return handleApiError(error);
  }
}

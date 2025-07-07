import { NextRequest } from "next/server";
import { ApiResponseBuilder } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/errors/error-handler";
import { ApiError } from "@/lib/errors/api-errors";
import { InvoiceService } from "@/services/invoice.service";

interface RouteParams {
  params: {
    stripeInvoiceId: string;
  };
}

const DEMO_USER = {
  id: "cmct55uwc0000ijs59cm86mej",
  email: "alice@gmail.com",
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { stripeInvoiceId } = params;

    if (!stripeInvoiceId) {
      throw new ApiError(400, "Stripe Invoice ID is required");
    }

    const invoiceService = InvoiceService.getInstance();
    const invoice = await invoiceService.getInvoiceByStripeId(
      stripeInvoiceId,
      DEMO_USER.id
    );

    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    return ApiResponseBuilder.success(invoice);
  } catch (error) {
    return handleApiError(error);
  }
}

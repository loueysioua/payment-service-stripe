import { NextRequest } from "next/server";
import { InvoiceService } from "@/services/invoice.service";
import { ApiResponseBuilder } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/errors/error-handler";
import { ApiError } from "@/lib/errors/api-errors";

interface RouteParams {
  params: {
    invoiceId: string;
  };
}

const DEMO_USER = {
  id: "cmct55uwc0000ijs59cm86mej",
  email: "alice@gmail.com",
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { invoiceId } = params;

    if (!invoiceId) {
      throw new ApiError(400, "Invoice ID is required");
    }

    const invoiceService = InvoiceService.getInstance();
    const invoice = await invoiceService.getInvoiceById(
      invoiceId,
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

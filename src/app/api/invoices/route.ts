import { NextRequest } from "next/server";
import { InvoiceService } from "@/services/invoice.service";
import { ApiResponseBuilder } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/errors/error-handler";
import { invoiceListQuerySchema } from "@/lib/validations/invoice.validation";

// For demo purposes - replace with actual user authentication
const DEMO_USER = {
  id: "cmct55uwc0000ijs59cm86mej",
  email: "alice@gmail.com",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Validate query parameters
    const queryData = {
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 10,
      status: searchParams.get("status")
        ? (searchParams.get("status") as string).toUpperCase()
        : undefined,
      dateFrom: searchParams.get("dateFrom") as string | undefined,
      dateTo: searchParams.get("dateTo") as string | undefined,
    };

    const validatedQuery = invoiceListQuerySchema.parse(queryData);

    const invoiceService = InvoiceService.getInstance();
    const result = await invoiceService.getUserInvoices(
      DEMO_USER.id,
      validatedQuery
    );

    return ApiResponseBuilder.success(result);
  } catch (error) {
    return handleApiError(error);
  }
}

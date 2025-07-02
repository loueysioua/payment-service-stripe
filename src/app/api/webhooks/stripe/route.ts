import { headers } from "next/headers";
import { StripeWebhookService } from "@/services/stripe/stripe-webhook.service";
import { ApiResponseBuilder } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/errors/error-handler";
import { NextRequest } from "next/server";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    console.log(
      "-------------------------event received----------------------"
    );
    const body = await request.body;
    const rawBody = (await body?.getReader().read())?.value;
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return ApiResponseBuilder.error("Missing stripe signature", 400);
    }

    const webhookService = StripeWebhookService.getInstance();
    const event = await webhookService.constructEvent(rawBody, signature);
    await webhookService.handleEvent(event);

    return ApiResponseBuilder.success({ received: true });
  } catch (error) {
    return handleApiError(error);
  }
}

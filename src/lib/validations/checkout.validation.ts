import { z } from "zod";

export const checkoutSessionSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  paymentMode: z.enum(["credit-purchase", "subscription"]),
  quantity: z.number().min(1).optional(),
});

export const webhookEventSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.record(z.any()),
  }),
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;

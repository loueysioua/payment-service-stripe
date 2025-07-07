import z from "zod";

export const invoiceListQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  status: z
    .enum([
      "OPEN",
      "PAID",
      "UNPAID",
      "VOID",
      "EXPIRED",
      "FAILED",
      "CANCELED",
      "PENDING",
    ])
    .optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;

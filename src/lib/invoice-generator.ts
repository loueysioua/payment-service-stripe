import { stripe } from "@/config/stripe";
import { Invoice } from "@/types/invoices/invoice.types";

export class InvoiceGenerator {
  /**
   * Create a new invoice in Stripe
   */
  static async createStripeInvoice(
    customerId: string,
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number; // in cents
      productId?: string;
    }>,
    options: {
      dueDate?: Date;
      autoAdvance?: boolean;
      collectionMethod?: "charge_automatically" | "send_invoice";
      metadata?: Record<string, string>;
    } = {}
  ) {
    try {
      // Add items to customer as invoice items
      for (const item of items) {
        await stripe.invoiceItems.create({
          customer: customerId,
          amount: item.unitPrice * item.quantity,
          currency: "eur",
          description: item.description,
          metadata: {
            productId: item.productId || "",
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
          },
        });
      }

      // Determine collection method
      const collectionMethod = options.collectionMethod || "send_invoice";

      // Create the invoice
      const invoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: collectionMethod,
        auto_advance: options.autoAdvance ?? true, // Use autoAdvance if provided, default to true
        ...(collectionMethod === "send_invoice" && options.dueDate
          ? { due_date: Math.floor(options.dueDate.getTime() / 1000) }
          : {}),
        metadata: options.metadata,
      });

      // Finalize and attempt payment based on collection method
      if (collectionMethod === "send_invoice") {
        if (invoice.id) {
          await stripe.invoices.finalizeInvoice(invoice.id);
        }
      } else if (
        collectionMethod === "charge_automatically" &&
        options.autoAdvance
      ) {
        // Finalize and attempt payment for charge_automatically
        if (invoice.id) {
          const finalizedInvoice = await stripe.invoices.finalizeInvoice(
            invoice.id
          );
          if (finalizedInvoice.status === "open") {
            await stripe.invoices.pay(invoice.id).catch((err) => {
              console.error(`Failed to pay invoice ${invoice.id}:`, err);
              throw err;
            });
          }
        }
      }

      return invoice;
    } catch (error) {
      console.error("Error creating Stripe invoice:", error);
      throw error;
    }
  }

  /**
   * Generate invoice number
   */
  static generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const timestamp = Date.now().toString().slice(-6);
    return `INV-${year}${month}-${timestamp}`;
  }

  /**
   * Convert Stripe invoice to our Invoice interface
   */
  static stripeToInvoice(stripeInvoice: any): Invoice {
    return {
      id: stripeInvoice.id,
      customerId: stripeInvoice.customer,
      customerEmail: stripeInvoice.customer_email,
      customerName: stripeInvoice.customer_name,
      invoiceNumber: stripeInvoice.number || this.generateInvoiceNumber(),
      amount: stripeInvoice.amount_due,
      currency: stripeInvoice.currency,
      status: stripeInvoice.status,
      dueDate: stripeInvoice.due_date
        ? new Date(stripeInvoice.due_date * 1000)
        : undefined,
      createdAt: new Date(stripeInvoice.created * 1000),
      paidAt: stripeInvoice.status_transitions?.paid_at
        ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
        : undefined,
      items: stripeInvoice.lines.data.map((line: any) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.price?.unit_amount || 0,
        amount: line.amount,
        productId: line.price?.product,
      })),
      stripeInvoiceId: stripeInvoice.id,
      paymentIntentId: stripeInvoice.payment_intent,
      metadata: stripeInvoice.metadata,
    };
  }
}

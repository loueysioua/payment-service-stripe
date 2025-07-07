export interface CreateCheckoutSessionParams {
  productId: string;
  paymentMode: "credit-purchase" | "subscription";
  quantity?: number;
  userId: string;
  customerEmail: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface CheckoutSessionMetadata {
  userId: string;
  creditsBought: number;
  type: "credit_purchase" | "subscription_purchase";
  customerId: string;
  quantity: number;
  unitPrice: number;
  productId: string;
}

export type CheckoutSessionMetadataAsRecord = Record<
  keyof CheckoutSessionMetadata,
  string
>;

export type MetadataRecord = Record<string, string>;

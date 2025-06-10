export interface CreditPackage {
  amount: number;
  credits: number;
  bonus?: number;
}

export interface CreditTransaction {
  userId: string;
  credits: number;
  amount?: number;
  sessionId?: string;
  productId?: string;
  type: "purchase" | "deduction";
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  credits: number;
}

export interface SearchParams {
  success?: string;
  canceled?: string;
  session_id?: string;
}

export interface CheckoutFormData {
  amount: string;
  credits: string;
  type: string;
}

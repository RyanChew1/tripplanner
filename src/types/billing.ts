export interface Subscription {
  id: string;
  customerId: string;
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  canceledAt?: number;
  trialStart?: number;
  trialEnd?: number;
  priceId: string;
  productId: string;
  createdAt: number;
  billingCycleAnchor?: number;
}

export interface Customer {
  id: string;
  email: string;
  name?: string;
  defaultPaymentMethod?: string;
  invoiceSettings?: {
    defaultPaymentMethod: string;
  };
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  billing_details: {
    name?: string;
    email?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
}

export interface Invoice {
  id: string;
  number: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  amountPaid: number;
  amountDue: number;
  currency: string;
  created: number;
  dueDate?: number;
  periodStart: number;
  periodEnd: number;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
}

export interface Price {
  id: string;
  productId: string;
  unitAmount: number;
  currency: string;
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount: number;
  };
  nickname?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  metadata?: Record<string, string>;
}

export interface BillingInfo {
  customer: Customer;
  subscription?: Subscription;
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
}

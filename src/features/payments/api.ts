// // src/features/payments/api.ts
// import {API} from '../../lib/api';

// export type CustomerSheetParams = {
//   customer: string;              // Stripe customer ID
//   ephemeralKey: string;          // ephemeral key secret
//   setupIntent: string;           // setup intent client_secret (for saving new cards)
// };

// export type PaymentMethodSummary = {
//   id: string;
//   brand: string;
//   last4: string;
//   isDefault?: boolean;
// };

// export async function getCustomerSheetParams(): Promise<CustomerSheetParams> {
//   // your backend should return { customer, ephemeralKey, setupIntent }
//   const {data} = await API.post<CustomerSheetParams>('/billing/customer-sheet');
//   return data;
// }

// export async function listPaymentMethods(): Promise<{data: PaymentMethodSummary[]}> {
//   // your backend should return array of pm summaries for the logged-in user
//   const {data} = await API.get<{data: PaymentMethodSummary[]}>('/billing/payment-methods');
//   return data;
// }


// src/features/payments/api.ts
import {API} from '../../lib/api';

export type CustomerSheetParams = {
  customer: string;
  ephemeralKey: string;
  setupIntent: string;
};

export type PaymentMethodSummary = {
  id: string;
  brand: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
};

export async function getCustomerSheetParams(): Promise<CustomerSheetParams> {
  // (Implement backend /billing/customer-sheet when needed)
  const {data} = await API.post<CustomerSheetParams>('/billing/customer-sheet');
  return data;
}

export async function listPaymentMethods(): Promise<PaymentMethodSummary[]> {
  // ✅ correct: baseURL already has /api, so this resolves to /api/billing/customer
  const { data } = await API.get('/billing/customer');

  const defaultId: string | null = data?.defaultPaymentMethod ?? null;
  const items: PaymentMethodSummary[] = (data?.cards ?? []).map((c: any) => ({
    id: c.id,
    brand: c.brand || 'card',
    last4: c.last4 || '',
    expMonth: c.expMonth,
    expYear: c.expYear,
    isDefault: c.id === defaultId,
  }));

  items.sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1));
  return items;
}

export async function setDefaultPaymentMethod(id: string): Promise<void> {
  // ✅ resolves to /api/billing/payment-methods/:id/default
  await API.post(`/billing/payment-methods/${id}/default`, {});
}

export async function deletePaymentMethod(id: string): Promise<void> {
  // Use POST alias to avoid DELETE routing quirks
  // ✅ resolves to /api/billing/payment-methods/:id/delete
  await API.post(`/billing/payment-methods/${id}/delete`, {});
}

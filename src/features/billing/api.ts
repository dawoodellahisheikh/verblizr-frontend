// src/features/billing/api.ts
// This file handle list of saved payment methods, setting a default, deleting, and requesting a SetupIntent.


// import {API} from '../../lib/api';

// export type PaymentMethod = {
//   id: string;
//   brand: string;
//   last4: string;
//   expMonth: number;
//   expYear: number;
//   isDefault?: boolean;
// };

// export async function getPaymentMethods(): Promise<PaymentMethod[]> {
//   // When backend is ready, uncomment the next two lines:
//   // const {data} = await API.get('/billing/payment-methods');
//   // return data as PaymentMethod[];

//   // TEMP mock to keep the UI working until backend is wired:
//   return [
//     {id: 'pm_1', brand: 'visa', last4: '4242', expMonth: 12, expYear: 28, isDefault: true},
//   ];
// }

// /**
//  * Request a Stripe SetupIntent for the logged-in user (server returns clientSecret).
//  * BillingScreen will use this with confirmSetupIntent(clientSecret, ...).
//  */
// export async function requestSetupIntent(): Promise<{clientSecret: string}> {
//   const {data} = await API.post('/api/billing/setup-intent', {});
//   // data = { clientSecret: string }
//   return data;
// }


// /**
//  * Make a PaymentMethod the default for future (off-session) charges.
//  * Matches your existing route style: /billing/payment-methods/:id/default
//  */
// export async function setDefaultPaymentMethod(id: string): Promise<void> {
//   await API.post(`/api/billing/payment-methods/${id}/default`, {});
// }

// export async function deletePaymentMethod(id: string): Promise<void> {
//   await API.delete(`/billing/payment-methods/${id}`);
// }

// /**
//  * Not used with SetupIntent flow (card is saved via SetupIntent confirmation).
//  * Keep as a placeholder if you later add a Customer Sheet flow.
//  */
// export async function addPaymentMethod(/* params */): Promise<void> {
//   // Intentionally empty: use SetupIntent (requestSetupIntent + confirmSetupIntent) instead.
// }


// import {API} from '../../lib/api';

// export type PaymentMethod = {
//   id: string;
//   brand: string;
//   last4: string;
//   expMonth: number;
//   expYear: number;
//   isDefault?: boolean;
// };

// export async function getPaymentMethods(): Promise<PaymentMethod[]> {
//   // When backend is ready, use:
//   const {data} = await API.get('/billing/payment-methods');
//   return data;
//   // return [
//   //   {id: 'pm_1', brand: 'visa', last4: '4242', expMonth: 12, expYear: 28, isDefault: true},
//   // ];
// }

// export async function deletePaymentMethod(id: string): Promise<void> {
//   await API.delete(`/billing/payment-methods/${id}`);
// }

// export async function setDefaultPaymentMethod(id: string): Promise<void> {
//   await API.post(`/billing/payment-methods/${id}/default`, {});
// }

// export async function requestSetupIntent(): Promise<{clientSecret: string}> {
//   const {data} = await API.post('/billing/setup-intent', {});
//   return data;
// }



// ~/verblizrRN/src/features/billing/api.ts
import {API} from '../../lib/api';

export type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault?: boolean;
};

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  // baseURL already includes /api, so this resolves to /api/billing/customer
  const { data } = await API.get('/billing/customer');

  const defaultId: string | null = data?.defaultPaymentMethod ?? null;
  const items: PaymentMethod[] = (data?.cards ?? []).map((c: any) => ({
    id: c.id,
    brand: c.brand || 'card',
    last4: c.last4 || '',
    expMonth: c.expMonth || 0,
    expYear: c.expYear || 0,
    isDefault: c.id === defaultId,
  }));

  // Default first
  items.sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1));
  return items;
}

export async function setDefaultPaymentMethod(id: string): Promise<void> {
  // resolves to /api/billing/payment-methods/:id/default
  await API.post(`/billing/payment-methods/${id}/default`, {});
}

export async function deletePaymentMethod(id: string): Promise<void> {
  // Try the POST alias (most reliable)
  try {
    await API.post(`/billing/payment-methods/${id}/delete`, {});
    return;
  } catch (e) {
    // Fallback to DELETE if POST alias isn't available
  }
  await API.delete(`/billing/payment-methods/${id}`);
}



export async function requestSetupIntent(): Promise<{ clientSecret: string }> {
  // resolves to /api/billing/setup-intent
  const { data } = await API.post('/billing/setup-intent', {});
  return data;
}
// src/features/billing/stripeService.ts
// Enhanced Stripe service with full payment processing, webhooks, and subscription management

import { API } from '../../lib/api';
import { STRIPE_CONFIG, isFeatureEnabled } from '../../screens/apis/keys';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault?: boolean;
  type: 'card' | 'apple_pay' | 'google_pay';
  billingDetails?: {
    name?: string;
    email?: string;
    phone?: string;
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

export interface Subscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    interval: 'month' | 'year';
  };
  paymentMethod?: PaymentMethod;
}

export interface Invoice {
  id: string;
  number: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: string;
  dueDate?: string;
  paidAt?: string;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
  description?: string;
  lineItems: {
    id: string;
    description: string;
    amount: number;
    quantity: number;
  }[];
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded';
  description?: string;
  metadata?: Record<string, string>;
}

export interface SetupIntent {
  id: string;
  clientSecret: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'canceled' | 'succeeded';
  usage: 'off_session' | 'on_session';
  paymentMethodId?: string;
}

export interface Customer {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  defaultPaymentMethod?: string;
  balance: number;
  currency: string;
  created: string;
  metadata?: Record<string, string>;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
    previous_attributes?: any;
  };
  created: number;
  livemode: boolean;
}

// =============================================================================
// PAYMENT METHODS
// =============================================================================

/**
 * Get all payment methods for the current user
 */
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    const { data } = await API.get('/billing/payment-methods');
    return data.paymentMethods || [];
  } catch (error) {
    console.error('[StripeService] Failed to get payment methods:', error);
    throw new Error('Failed to load payment methods');
  }
}

/**
 * Add a new payment method using Setup Intent
 */
export async function addPaymentMethod(paymentMethodData: {
  type: 'card' | 'apple_pay' | 'google_pay';
  billingDetails?: PaymentMethod['billingDetails'];
}): Promise<SetupIntent> {
  try {
    const { data } = await API.post('/billing/setup-intent', {
      paymentMethodType: paymentMethodData.type,
      billingDetails: paymentMethodData.billingDetails,
    });
    return data;
  } catch (error) {
    console.error('[StripeService] Failed to create setup intent:', error);
    throw new Error('Failed to add payment method');
  }
}

/**
 * Set a payment method as default
 */
export async function setDefaultPaymentMethod(paymentMethodId: string): Promise<void> {
  try {
    await API.post(`/billing/payment-methods/${paymentMethodId}/default`);
  } catch (error) {
    console.error('[StripeService] Failed to set default payment method:', error);
    throw new Error('Failed to set default payment method');
  }
}

/**
 * Delete a payment method
 */
export async function deletePaymentMethod(paymentMethodId: string): Promise<void> {
  try {
    await API.delete(`/billing/payment-methods/${paymentMethodId}`);
  } catch (error) {
    console.error('[StripeService] Failed to delete payment method:', error);
    throw new Error('Failed to delete payment method');
  }
}

/**
 * Update payment method billing details
 */
export async function updatePaymentMethod(
  paymentMethodId: string,
  billingDetails: PaymentMethod['billingDetails']
): Promise<PaymentMethod> {
  try {
    const { data } = await API.put(`/billing/payment-methods/${paymentMethodId}`, {
      billingDetails,
    });
    return data.paymentMethod;
  } catch (error) {
    console.error('[StripeService] Failed to update payment method:', error);
    throw new Error('Failed to update payment method');
  }
}

// =============================================================================
// PAYMENTS
// =============================================================================

/**
 * Create a payment intent for one-time payments
 */
export async function createPaymentIntent(params: {
  amount: number;
  currency?: string;
  description?: string;
  paymentMethodId?: string;
  confirmationMethod?: 'automatic' | 'manual';
  metadata?: Record<string, string>;
}): Promise<PaymentIntent> {
  try {
    const { data } = await API.post('/billing/payment-intent', {
      amount: params.amount,
      currency: params.currency || STRIPE_CONFIG.currency.toLowerCase(),
      description: params.description,
      paymentMethodId: params.paymentMethodId,
      confirmationMethod: params.confirmationMethod || 'automatic',
      metadata: params.metadata,
    });
    return data.paymentIntent;
  } catch (error) {
    console.error('[StripeService] Failed to create payment intent:', error);
    throw new Error('Failed to create payment');
  }
}

/**
 * Confirm a payment intent
 */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId?: string
): Promise<PaymentIntent> {
  try {
    const { data } = await API.post(`/billing/payment-intent/${paymentIntentId}/confirm`, {
      paymentMethodId,
    });
    return data.paymentIntent;
  } catch (error) {
    console.error('[StripeService] Failed to confirm payment intent:', error);
    throw new Error('Failed to confirm payment');
  }
}

/**
 * Cancel a payment intent
 */
export async function cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
  try {
    const { data } = await API.post(`/billing/payment-intent/${paymentIntentId}/cancel`);
    return data.paymentIntent;
  } catch (error) {
    console.error('[StripeService] Failed to cancel payment intent:', error);
    throw new Error('Failed to cancel payment');
  }
}

// =============================================================================
// SUBSCRIPTIONS
// =============================================================================

/**
 * Get current user's subscriptions
 */
export async function getSubscriptions(): Promise<Subscription[]> {
  try {
    const { data } = await API.get('/billing/subscriptions');
    return data.subscriptions || [];
  } catch (error) {
    console.error('[StripeService] Failed to get subscriptions:', error);
    throw new Error('Failed to load subscriptions');
  }
}

/**
 * Create a new subscription
 */
export async function createSubscription(params: {
  priceId: string;
  paymentMethodId?: string;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}): Promise<Subscription> {
  try {
    const { data } = await API.post('/billing/subscriptions', params);
    return data.subscription;
  } catch (error) {
    console.error('[StripeService] Failed to create subscription:', error);
    throw new Error('Failed to create subscription');
  }
}

/**
 * Update a subscription
 */
export async function updateSubscription(
  subscriptionId: string,
  params: {
    priceId?: string;
    paymentMethodId?: string;
    metadata?: Record<string, string>;
  }
): Promise<Subscription> {
  try {
    const { data } = await API.put(`/billing/subscriptions/${subscriptionId}`, params);
    return data.subscription;
  } catch (error) {
    console.error('[StripeService] Failed to update subscription:', error);
    throw new Error('Failed to update subscription');
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Subscription> {
  try {
    const { data } = await API.post(`/billing/subscriptions/${subscriptionId}/cancel`, {
      cancelAtPeriodEnd,
    });
    return data.subscription;
  } catch (error) {
    console.error('[StripeService] Failed to cancel subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(subscriptionId: string): Promise<Subscription> {
  try {
    const { data } = await API.post(`/billing/subscriptions/${subscriptionId}/reactivate`);
    return data.subscription;
  } catch (error) {
    console.error('[StripeService] Failed to reactivate subscription:', error);
    throw new Error('Failed to reactivate subscription');
  }
}

// =============================================================================
// INVOICES
// =============================================================================

/**
 * Get invoices for the current user
 */
export async function getInvoices(params?: {
  limit?: number;
  startingAfter?: string;
  status?: Invoice['status'];
}): Promise<{ invoices: Invoice[]; hasMore: boolean }> {
  try {
    const { data } = await API.get('/billing/invoices', { params });
    return {
      invoices: data.invoices || [],
      hasMore: data.hasMore || false,
    };
  } catch (error) {
    console.error('[StripeService] Failed to get invoices:', error);
    throw new Error('Failed to load invoices');
  }
}

/**
 * Get a specific invoice
 */
export async function getInvoice(invoiceId: string): Promise<Invoice> {
  try {
    const { data } = await API.get(`/billing/invoices/${invoiceId}`);
    return data.invoice;
  } catch (error) {
    console.error('[StripeService] Failed to get invoice:', error);
    throw new Error('Failed to load invoice');
  }
}

/**
 * Pay an invoice
 */
export async function payInvoice(
  invoiceId: string,
  paymentMethodId?: string
): Promise<Invoice> {
  try {
    const { data } = await API.post(`/billing/invoices/${invoiceId}/pay`, {
      paymentMethodId,
    });
    return data.invoice;
  } catch (error) {
    console.error('[StripeService] Failed to pay invoice:', error);
    throw new Error('Failed to pay invoice');
  }
}

// =============================================================================
// CUSTOMER
// =============================================================================

/**
 * Get current customer information
 */
export async function getCustomer(): Promise<Customer> {
  try {
    const { data } = await API.get('/billing/customer');
    return data.customer;
  } catch (error) {
    console.error('[StripeService] Failed to get customer:', error);
    throw new Error('Failed to load customer information');
  }
}

/**
 * Update customer information
 */
export async function updateCustomer(params: {
  name?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, string>;
}): Promise<Customer> {
  try {
    const { data } = await API.put('/billing/customer', params);
    return data.customer;
  } catch (error) {
    console.error('[StripeService] Failed to update customer:', error);
    throw new Error('Failed to update customer information');
  }
}

// =============================================================================
// WEBHOOKS
// =============================================================================

/**
 * Handle webhook events (typically called from backend)
 */
export async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  try {
    console.log(`[StripeService] Handling webhook event: ${event.type}`);
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event.data.object);
        break;
      default:
        console.log(`[StripeService] Unhandled webhook event: ${event.type}`);
    }
  } catch (error) {
    console.error('[StripeService] Failed to handle webhook event:', error);
    throw error;
  }
}

// =============================================================================
// WEBHOOK HANDLERS
// =============================================================================

async function handlePaymentSucceeded(paymentIntent: any): Promise<void> {
  console.log('[StripeService] Payment succeeded:', paymentIntent.id);
  // Implement payment success logic
  // e.g., update local state, show success message, etc.
}

async function handlePaymentFailed(paymentIntent: any): Promise<void> {
  console.log('[StripeService] Payment failed:', paymentIntent.id);
  // Implement payment failure logic
  // e.g., show error message, retry logic, etc.
}

async function handleInvoicePaymentSucceeded(invoice: any): Promise<void> {
  console.log('[StripeService] Invoice payment succeeded:', invoice.id);
  // Implement invoice payment success logic
}

async function handleInvoicePaymentFailed(invoice: any): Promise<void> {
  console.log('[StripeService] Invoice payment failed:', invoice.id);
  // Implement invoice payment failure logic
}

async function handleSubscriptionUpdated(subscription: any): Promise<void> {
  console.log('[StripeService] Subscription updated:', subscription.id);
  // Implement subscription update logic
}

async function handleSubscriptionDeleted(subscription: any): Promise<void> {
  console.log('[StripeService] Subscription deleted:', subscription.id);
  // Implement subscription deletion logic
}

async function handleSetupIntentSucceeded(setupIntent: any): Promise<void> {
  console.log('[StripeService] Setup intent succeeded:', setupIntent.id);
  // Implement setup intent success logic
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format amount for display (convert from cents to dollars)
 */
export function formatAmount(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/**
 * Convert amount to cents for Stripe API
 */
export function amountToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Get card brand display name
 */
export function getCardBrandName(brand: string): string {
  const brandNames: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
    unknown: 'Card',
  };
  return brandNames[brand.toLowerCase()] || 'Card';
}

/**
 * Check if payment method is expired
 */
export function isPaymentMethodExpired(paymentMethod: PaymentMethod): boolean {
  const now = new Date();
  const expiry = new Date(paymentMethod.expYear, paymentMethod.expMonth - 1);
  return expiry < now;
}

/**
 * Get payment method display string
 */
export function getPaymentMethodDisplay(paymentMethod: PaymentMethod): string {
  if (paymentMethod.type === 'card') {
    return `${getCardBrandName(paymentMethod.brand)} •••• ${paymentMethod.last4}`;
  }
  return paymentMethod.type === 'apple_pay' ? 'Apple Pay' : 'Google Pay';
}

/**
 * Validate Stripe configuration
 */
export function validateStripeConfig(): boolean {
  if (!STRIPE_CONFIG.publishableKey || STRIPE_CONFIG.publishableKey.includes('51234567890abcdef')) {
    console.warn('[StripeService] Stripe publishable key not configured');
    return false;
  }
  return true;
}

/**
 * Check if Stripe features are enabled
 */
export function isStripeEnabled(): boolean {
  return isFeatureEnabled('stripePayments') && validateStripeConfig();
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BillingInfo } from '@/types/billing';

// Create Stripe customer
export function useCreateCustomer() {
  return useMutation({
    mutationFn: async ({ email, name, userId }: { email: string; name: string; userId: string }) => {
      const response = await fetch('/api/stripe/create-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, userId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create customer');
      }
      
      return response.json();
    },
  });
}

// Create subscription
export function useCreateSubscription() {
  return useMutation({
    mutationFn: async ({ customerId, priceId, userId }: { customerId: string; priceId: string; userId: string }) => {
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, priceId, userId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }
      
      return response.json();
    },
  });
}

// Get billing information
export function useBillingInfo(customerId: string | undefined) {
  return useQuery({
    queryKey: ['billing-info', customerId],
    queryFn: async (): Promise<BillingInfo> => {
      if (!customerId) throw new Error('Customer ID is required');
      
      const response = await fetch(`/api/stripe/billing-info?customerId=${customerId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch billing info');
      }
      
      return response.json();
    },
    enabled: !!customerId,
  });
}

// Cancel subscription
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ subscriptionId, userId, immediately = false }: { subscriptionId: string; userId: string; immediately?: boolean }) => {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, userId, immediately }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate billing info to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['billing-info'] });
    },
  });
}

// Reactivate subscription
export function useReactivateSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ subscriptionId }: { subscriptionId: string }) => {
      const response = await fetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reactivate subscription');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate billing info to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['billing-info'] });
    },
  });
}

// Process payment with Stripe Checkout
export async function processPayment(checkoutUrl: string) {
  // Since redirectToCheckout is deprecated, use direct URL redirection
  // The checkoutUrl is the full Stripe Checkout URL
  window.location.href = checkoutUrl;
}

// Create checkout session
export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: async ({ customerId, priceId, userId }: { customerId: string; priceId: string; userId: string }) => {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, priceId, userId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      return response.json();
    },
  });
}

// Redirect to Stripe Checkout
export async function redirectToCheckout(sessionId: string) {
  // For server-side redirects, use window.location
  window.location.href = `/api/stripe/checkout?session_id=${sessionId}`;
}

// Get subscription period details
export function useSubscriptionPeriod(subscriptionId: string | undefined) {
  return useQuery({
    queryKey: ['subscription-period', subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) throw new Error('Subscription ID is required');
      
      const response = await fetch(`/api/stripe/subscription-period?subscriptionId=${subscriptionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription period');
      }
      
      return response.json();
    },
    enabled: !!subscriptionId,
  });
}

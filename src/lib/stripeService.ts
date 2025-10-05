import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Check if Stripe is properly configured
const isStripeConfigured = () => {
  return !!(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
};

// Server-side Stripe instance
export const stripe = isStripeConfigured() 
  ? new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY!, {
      apiVersion: '2025-09-30.clover',
    })
  : null;

// Client-side Stripe instance
export const getStripe = () => {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    console.warn('Stripe publishable key not configured');
    return null;
  }
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
};

// Helper function to check Stripe configuration
const checkStripeConfig = () => {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set up your Stripe API keys in environment variables.');
  }
};

// Create a Stripe customer
export async function createCustomer(email: string, name: string, userId: string) {
  checkStripeConfig();
  
  try {
    const customer = await stripe!.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

// Get customer by ID
export async function getCustomer(customerId: string, options?: { expand?: string[] }) {
  checkStripeConfig();
  
  try {
    const customer = await stripe!.customers.retrieve(customerId, {
      expand: options?.expand || []
    });
    return customer;
  } catch (error) {
    console.error('Error retrieving Stripe customer:', error);
    throw error;
  }
}

// Create a subscription
export async function createSubscription(customerId: string, priceId: string) {
  checkStripeConfig();
  
  try {
    const subscription = await stripe!.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });
    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

// Create a checkout session for subscription
export async function createCheckoutSession(customerId: string, priceId: string, userId: string) {
  checkStripeConfig();
  
  try {
    const session = await stripe!.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing?payment=cancelled`,
      metadata: {
        userId,
      },
    });
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Get subscription by ID
export async function getSubscription(subscriptionId: string) {
  checkStripeConfig();
  
  try {
    const subscription = await stripe!.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    throw error;
  }
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string, immediately = false) {
  checkStripeConfig();
  
  try {
    if (immediately) {
      const subscription = await stripe!.subscriptions.cancel(subscriptionId);
      return subscription;
    } else {
      const subscription = await stripe!.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return subscription;
    }
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

// Reactivate subscription
export async function reactivateSubscription(subscriptionId: string) {
  checkStripeConfig();
  
  try {
    const subscription = await stripe!.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
    return subscription;
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw error;
  }
}

// Get customer's payment methods
export async function getPaymentMethods(customerId: string) {
  checkStripeConfig();
  
  try {
    const paymentMethods = await stripe!.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return paymentMethods.data;
  } catch (error) {
    console.error('Error retrieving payment methods:', error);
    throw error;
  }
}

// Get customer's invoices
export async function getInvoices(customerId: string, limit = 10) {
  checkStripeConfig();
  
  try {
    const invoices = await stripe!.invoices.list({
      customer: customerId,
      limit,
    });
    return invoices.data;
  } catch (error) {
    console.error('Error retrieving invoices:', error);
    throw error;
  }
}

// Create payment intent for one-time payments
export async function createPaymentIntent(amount: number, currency = 'usd', customerId?: string) {
  checkStripeConfig();
  
  try {
    const paymentIntent = await stripe!.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

// Get products and prices
export async function getProducts() {
  checkStripeConfig();
  
  try {
    const products = await stripe!.products.list({
      active: true,
      expand: ['data.default_price'],
    });
    return products.data;
  } catch (error) {
    console.error('Error retrieving products:', error);
    throw error;
  }
}

// Get prices for a product
export async function getPrices(productId: string) {
  checkStripeConfig();
  
  try {
    const prices = await stripe!.prices.list({
      product: productId,
      active: true,
    });
    return prices.data;
  } catch (error) {
    console.error('Error retrieving prices:', error);
    throw error;
  }
}
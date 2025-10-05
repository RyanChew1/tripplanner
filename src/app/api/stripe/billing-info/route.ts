import { NextRequest, NextResponse } from 'next/server';
import { getCustomer, getPaymentMethods, getInvoices, getSubscription } from '@/lib/stripeService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'Missing customer ID' },
        { status: 400 }
      );
    }

    // Get customer with expanded subscriptions, payment methods, and invoices in parallel
    const [customer, paymentMethods, invoices] = await Promise.all([
      getCustomer(customerId, { expand: ['subscriptions'] }),
      getPaymentMethods(customerId),
      getInvoices(customerId),
    ]);

    // Get the first active subscription if customer has one
    let subscription = null;
    if (customer && 'subscriptions' in customer && customer.subscriptions?.data?.[0]) {
      // Find the first active subscription
      const activeSubscription = customer.subscriptions.data.find(sub => 
        sub.status === 'active' || sub.status === 'trialing'
      );
      if (activeSubscription) {
        subscription = activeSubscription;
      }
    }

    return NextResponse.json({
      customer,
      subscription,
      paymentMethods,
      invoices,
    });
  } catch (error) {
    console.error('Error fetching billing info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing info' },
      { status: 500 }
    );
  }
}

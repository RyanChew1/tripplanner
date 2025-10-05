import { NextRequest, NextResponse } from 'next/server';
import { createCustomer } from '@/lib/stripeService';
import { updateStripeCustomerId } from '@/lib/userService';

export async function POST(request: NextRequest) {
  try {
    // Debug: Check environment variables
    console.log('STRIPE_SECRET_KEY exists:', !!process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);
    console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY exists:', !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    console.log('NEXT_PUBLIC_STRIPE_SECRET_KEY exists:', !!process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);
    
    const { email, name, userId } = await request.json();

    if (!email || !name || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    // Create Stripe customer
    const customer = await createCustomer(email, name, userId);

    // Update user with Stripe customer ID
    await updateStripeCustomerId(userId, customer.id);

    return NextResponse.json({ customerId: customer.id });
  } catch (error) {
    console.error('Error creating customer:', error);
    
    // Check if it's a Stripe configuration error
    if (error instanceof Error && error.message.includes('Stripe is not configured')) {
      return NextResponse.json(
        { error: 'Payment system is not configured. Please contact support.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}

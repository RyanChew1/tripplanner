import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripeService';

export async function POST(request: NextRequest) {
  try {
    const { customerId, priceId, userId } = await request.json();

    if (!customerId || !priceId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create checkout session
    const session = await createCheckoutSession(customerId, priceId, userId);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

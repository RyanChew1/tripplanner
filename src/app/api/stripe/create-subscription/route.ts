import { NextRequest, NextResponse } from 'next/server';
import { createSubscription } from '@/lib/stripeService';
import { updateSubscriptionId, updateUserTier } from '@/lib/userService';

export async function POST(request: NextRequest) {
  try {
    const { customerId, priceId, userId } = await request.json();

    if (!customerId || !priceId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create subscription
    const subscription = await createSubscription(customerId, priceId);

    // Update user with subscription ID and tier
    await updateSubscriptionId(userId, subscription.id);
    await updateUserTier(userId, 'premium');

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as { payment_intent?: { client_secret?: string } })?.payment_intent?.client_secret,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

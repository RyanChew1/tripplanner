import { NextRequest, NextResponse } from 'next/server';
import { cancelSubscription } from '@/lib/stripeService';
import { updateUserTier } from '@/lib/userService';

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, userId, immediately = false } = await request.json();

    if (!subscriptionId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Cancel subscription
    const subscription = await cancelSubscription(subscriptionId, immediately);

    // If canceling immediately, downgrade user to free tier
    if (immediately) {
      await updateUserTier(userId, 'free');
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionPeriod } from '@/lib/stripeService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing subscription ID' },
        { status: 400 }
      );
    }

    const periodDetails = await getSubscriptionPeriod(subscriptionId);

    return NextResponse.json(periodDetails);
  } catch (error) {
    console.error('Error fetching subscription period:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription period' },
      { status: 500 }
    );
  }
}

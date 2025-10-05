import { NextRequest, NextResponse } from 'next/server';
import { updateUserTier } from '@/lib/userService';

export async function POST(request: NextRequest) {
  try {
    const { userId, tier } = await request.json();

    if (!userId || !tier) {
      return NextResponse.json(
        { error: 'Missing userId or tier' },
        { status: 400 }
      );
    }

    if (tier !== 'free' && tier !== 'premium') {
      return NextResponse.json(
        { error: 'Tier must be "free" or "premium"' },
        { status: 400 }
      );
    }

    console.log(`🧪 Test: Updating user ${userId} to ${tier} tier`);
    const updatedUser = await updateUserTier(userId, tier);
    
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser?.id,
        tier: updatedUser?.tier,
        email: updatedUser?.email
      }
    });
  } catch (error) {
    console.error('Test tier update failed:', error);
    return NextResponse.json(
      { error: 'Failed to update tier' },
      { status: 500 }
    );
  }
}

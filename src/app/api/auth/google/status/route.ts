import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/userService';
import { hasValidTokens } from '@/lib/googleCalendarService';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user data
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has valid Google Calendar tokens
    const connected = hasValidTokens(user);

    return NextResponse.json({
      connected,
      hasTokens: !!(user.googleCalendarAccessToken && user.googleCalendarRefreshToken),
    });
  } catch (error) {
    console.error('Error checking Google Calendar status:', error);
    return NextResponse.json(
      { error: 'Failed to check Google Calendar status' },
      { status: 500 }
    );
  }
}

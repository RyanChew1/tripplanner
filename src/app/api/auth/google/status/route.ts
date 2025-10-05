import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/userService';
import { testGoogleCalendarConnection } from '@/lib/googleCalendarService';

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

    // Check if user has Google Calendar tokens
    const hasTokens = !!(user.googleCalendarAccessToken && user.googleCalendarRefreshToken);
    
    if (!hasTokens) {
      return NextResponse.json({
        connected: false,
        hasTokens: false,
      });
    }

    // Test the connection with a real API call
    const connectionTest = await testGoogleCalendarConnection(user);
    
    return NextResponse.json({
      connected: connectionTest.connected,
      hasTokens: true,
      error: connectionTest.error,
    });
  } catch (error) {
    console.error('Error checking Google Calendar status:', error);
    return NextResponse.json(
      { error: 'Failed to check Google Calendar status' },
      { status: 500 }
    );
  }
}

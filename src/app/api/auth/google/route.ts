import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/googleCalendarService';

export async function GET(request: NextRequest) {
  try {
    // Get the return URL and userId from query parameters
    const returnUrl = request.nextUrl.searchParams.get('returnUrl') || '/';
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Generate OAuth URL
    const authUrl = getAuthUrl();
    
    // Add return URL and userId as state parameter for later use
    const urlWithState = new URL(authUrl);
    urlWithState.searchParams.set('state', `${returnUrl}|${userId}`);
    
    // Redirect to Google OAuth
    return NextResponse.redirect(urlWithState.toString());
  } catch (error) {
    console.error('Error generating Google OAuth URL:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google Calendar authentication' },
      { status: 500 }
    );
  }
}

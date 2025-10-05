import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/googleCalendarService';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      const returnUrl = state?.split('|')[0] || '/';
      return NextResponse.redirect(`${returnUrl}?error=google_auth_failed`);
    }

    if (!code) {
      return NextResponse.redirect('/?error=no_authorization_code');
    }

    if (!state) {
      return NextResponse.redirect('/?error=no_state');
    }

    // Parse state parameter (format: "returnUrl|userId")
    const [returnUrl, userId] = state.split('|');
    
    if (!userId) {
      return NextResponse.redirect('/?error=no_user_id');
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect('/?error=invalid_tokens');
    }

    // Calculate token expiry
    const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600000); // 1 hour default

    // Update user document with Google Calendar tokens
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      googleCalendarAccessToken: tokens.access_token,
      googleCalendarRefreshToken: tokens.refresh_token,
      googleCalendarTokenExpiry: expiryDate,
    });

    // Redirect back to the original page
    return NextResponse.redirect(`${returnUrl}?success=google_calendar_connected`);
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return NextResponse.redirect('/?error=google_auth_callback_failed');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { revokeGoogleCalendarAccess } from '@/lib/googleCalendarService';
import { getUserById } from '@/lib/userService';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

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

    // Revoke Google Calendar access
    if (user.googleCalendarAccessToken) {
      await revokeGoogleCalendarAccess(user);
    }

    // Clear tokens from user document
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      googleCalendarAccessToken: null,
      googleCalendarRefreshToken: null,
      googleCalendarTokenExpiry: null,
    });

    return NextResponse.json({
      success: true,
      message: 'Google Calendar access revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking Google Calendar access:', error);
    return NextResponse.json(
      { error: 'Failed to revoke Google Calendar access' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { exportTripToGoogleCalendar, testGoogleCalendarConnection } from '@/lib/googleCalendarService';
import { getTripById } from '@/lib/tripService';
import { getCalendarEvents } from '@/lib/calendarService';
import { getUserById } from '@/lib/userService';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
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
    if (!user.googleCalendarAccessToken || !user.googleCalendarRefreshToken) {
      return NextResponse.json(
        { error: 'Google Calendar not connected', needsAuth: true },
        { status: 401 }
      );
    }

    // Skip the connection test here since it's causing sync issues
    // The exportTripToGoogleCalendar function will handle token validation
    console.log('Skipping connection test in export API, proceeding directly to export');

    // Get trip data
    const trip = await getTripById(tripId);
    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this trip (verify group membership)
    const groupRef = doc(db, 'groups', trip.groupId);
    const groupSnap = await getDoc(groupRef);
    
    if (!groupSnap.exists()) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const group = groupSnap.data();
    if (!group.groupMembers || !group.groupMembers[userId]) {
      return NextResponse.json(
        { error: 'Access denied to this trip' },
        { status: 403 }
      );
    }

    // Get calendar events
    const calendarEvents = trip.calendarId ? await getCalendarEvents(trip.calendarId) : [];

    // Export to Google Calendar
    const result = await exportTripToGoogleCalendar(
      user,
      trip,
      calendarEvents,
      trip.flights || [],
      trip.hotels || []
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        eventsCreated: result.eventsCreated,
        message: `Successfully added ${result.eventsCreated} events to your Google Calendar`,
      });
    } else {
      return NextResponse.json(
        { 
          error: result.error || 'Failed to export to Google Calendar',
          needsAuth: result.error?.includes('token') || result.error?.includes('auth')
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error exporting trip to Google Calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { User } from '@/types/users';
import { Trip } from '@/types/trips';
import { CalendarEvent } from '@/types/calendars';
import { FlightOffer } from '@/types/flights';
import { HotelOffer } from '@/types/hotels';

// Initialize OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
  process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
);

// Google Calendar API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly'
];

/**
 * Generate OAuth URL for user authentication
 */
export function getAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent screen to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Error getting tokens from code:', error);
    throw new Error('Failed to exchange authorization code for tokens');
  }
}

/**
 * Create Google Calendar client with user's tokens
 */
function createCalendarClient(user: User) {
  if (!user.googleCalendarAccessToken || !user.googleCalendarRefreshToken) {
    throw new Error('User has not connected Google Calendar');
  }

  const client = new OAuth2Client(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
  );

  client.setCredentials({
    access_token: user.googleCalendarAccessToken,
    refresh_token: user.googleCalendarRefreshToken,
  });

  return google.calendar({ version: 'v3', auth: client });
}

/**
 * Refresh user's access token if needed
 */
export async function refreshUserTokens(user: User): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryDate: Date;
}> {
  const client = new OAuth2Client(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
  );

  client.setCredentials({
    access_token: user.googleCalendarAccessToken,
    refresh_token: user.googleCalendarRefreshToken,
  });

  try {
    const { credentials } = await client.refreshAccessToken();
    return {
      accessToken: credentials.access_token!,
      refreshToken: credentials.refresh_token || user.googleCalendarRefreshToken!,
      expiryDate: new Date(credentials.expiry_date!),
    };
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    throw new Error('Failed to refresh Google Calendar tokens');
  }
}

/**
 * Check if user has valid Google Calendar tokens
 */
export function hasValidTokens(user: User): boolean {
  if (!user.googleCalendarAccessToken || !user.googleCalendarRefreshToken) {
    return false;
  }

  if (user.googleCalendarTokenExpiry) {
    const now = new Date();
    const expiry = new Date(user.googleCalendarTokenExpiry);
    return now < expiry;
  }

  return true; // If no expiry date, assume valid
}

/**
 * Transform calendar event to Google Calendar format
 */




function transformCalendarEvent(event: CalendarEvent): any {
  // Helper function to safely convert date
  const safeDate = (dateInput: any): Date => {
    if (!dateInput) {
      throw new Error('Invalid date: date is null or undefined');
    }
    
    // Handle Firestore Timestamp
    if (dateInput && typeof dateInput === 'object' && dateInput.seconds !== undefined) {
      return new Date(dateInput.seconds * 1000 + (dateInput.nanoseconds || 0) / 1000000);
    }
    
    // Handle regular Date object
    if (dateInput instanceof Date) {
      return dateInput;
    }
    
    // Handle date string
    if (typeof dateInput === 'string') {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date string: ${dateInput}`);
      }
      return date;
    }
    
    throw new Error(`Unsupported date format: ${typeof dateInput}`);
  };

  try {
    const startDateTime = safeDate(event.startDate.date);
    const endDateTime = safeDate(event.endDate.date);
    
    // Combine date and time
    const [startHour, startMinute] = event.startDate.time.split(':');
    const [endHour, endMinute] = event.endDate.time.split(':');
    
    startDateTime.setHours(parseInt(startHour), parseInt(startMinute));
    endDateTime.setHours(parseInt(endHour), parseInt(endMinute));

    return {
      summary: event.title,
      description: event.note || '',
      location: event.locationId || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC',
      },
      colorId: getColorIdForCategory(event.categories?.[0]),
    };
  } catch (error) {
    console.error('Error transforming calendar event:', error, event);
    throw new Error(`Failed to transform calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Transform flight to Google Calendar format
 */
function transformFlight(flight: FlightOffer): any {
  const itinerary = flight.itineraries[0];
  const firstSegment = itinerary.segments[0];
  const lastSegment = itinerary.segments[itinerary.segments.length - 1];

  // Safely convert flight times
  const departureTime = new Date(firstSegment.departure.at);
  const arrivalTime = new Date(lastSegment.arrival.at);
  
  // Validate dates
  if (isNaN(departureTime.getTime())) {
    throw new Error(`Invalid departure time: ${firstSegment.departure.at}`);
  }
  if (isNaN(arrivalTime.getTime())) {
    throw new Error(`Invalid arrival time: ${lastSegment.arrival.at}`);
  }

  const summary = `Flight ${firstSegment.carrierCode}${firstSegment.number} - ${firstSegment.departure.iataCode} → ${lastSegment.arrival.iataCode}`;
  
  const description = [
    `Duration: ${itinerary.duration}`,
    `Price: ${flight.price.currency} ${flight.price.total}`,
    `Seats: ${flight.numberOfBookableSeats} available`,
    `Segments: ${itinerary.segments.length}`,
  ].join('\n');

  return {
    summary,
    description,
    location: `${firstSegment.departure.iataCode} → ${lastSegment.arrival.iataCode}`,
    start: {
      dateTime: departureTime.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: arrivalTime.toISOString(),
      timeZone: 'UTC',
    },
    colorId: '2', // Blue for flights
  };
}

/**
 * Transform hotel to Google Calendar format
 */
function transformHotel(hotel: HotelOffer): any {
  // Safely convert hotel dates
  const checkInDate = new Date(hotel.offers[0].checkInDate);
  const checkOutDate = new Date(hotel.offers[0].checkOutDate);
  
  // Validate dates
  if (isNaN(checkInDate.getTime())) {
    throw new Error(`Invalid check-in date: ${hotel.offers[0].checkInDate}`);
  }
  if (isNaN(checkOutDate.getTime())) {
    throw new Error(`Invalid check-out date: ${hotel.offers[0].checkOutDate}`);
  }

  const summary = `Hotel: ${hotel.hotel.name}`;
  
  const description = [
    `Address: ${hotel.hotel.address?.lines?.[0] || 'N/A'}`,
    `Rating: ${hotel.hotel.rating ? '★'.repeat(Math.floor(hotel.hotel.rating)) : 'N/A'}`,
    `Room: ${hotel.offers[0].room?.typeEstimated?.category || 'Standard'}`,
    `Price: ${hotel.offers[0].price.currency} ${hotel.offers[0].price.total}`,
  ].join('\n');

  return {
    summary,
    description,
    location: hotel.hotel.address?.lines?.[0] || '',
    start: {
      date: checkInDate.toISOString().split('T')[0],
    },
    end: {
      date: checkOutDate.toISOString().split('T')[0],
    },
    colorId: '10', // Green for hotels
  };
}

/**
 * Get color ID for event category
 */
function getColorIdForCategory(category?: string): string {
  switch (category) {
    case 'excursion': return '5'; // Yellow
    case 'dining': return '6'; // Orange
    case 'transportation': return '2'; // Blue
    case 'accommodation': return '10'; // Green
    case 'leisure': return '11'; // Purple
    case 'event': return '4'; // Red
    default: return '1'; // Default
  }
}

/**
 * Export trip to Google Calendar
 */
export async function exportTripToGoogleCalendar(
  user: User,
  trip: Trip,
  calendarEvents: CalendarEvent[],
  flights: FlightOffer[],
  hotels: HotelOffer[]
): Promise<{ success: boolean; eventsCreated: number; error?: string }> {
  try {
    console.log('Starting export to Google Calendar for user:', user.id);
    
    // Check if user has tokens
    if (!user.googleCalendarAccessToken || !user.googleCalendarRefreshToken) {
      throw new Error('User has not connected Google Calendar');
    }

    // Create OAuth2 client
    const oauth2Client = new OAuth2Client(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
      process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: user.googleCalendarAccessToken,
      refresh_token: user.googleCalendarRefreshToken,
    });

    // Try to refresh tokens if they're expired
    if (!hasValidTokens(user)) {
      console.log('Tokens appear expired, attempting refresh...');
      try {
        const refreshedTokens = await refreshUserTokens(user);
        oauth2Client.setCredentials({
          access_token: refreshedTokens.accessToken,
          refresh_token: refreshedTokens.refreshToken,
        });
        console.log('Token refresh successful');
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw new Error('Failed to refresh Google Calendar tokens. Please reconnect.');
      }
    }

    // Create calendar client with potentially refreshed tokens
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Transform all events with error handling
    const googleEvents = [];

    // Add calendar events
    for (const event of calendarEvents) {
      try {
        googleEvents.push(transformCalendarEvent(event));
      } catch (error) {
        console.error('Error transforming calendar event:', error, event);
        throw new Error(`Failed to transform calendar event "${event.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Add flights
    for (const flight of flights) {
      try {
        googleEvents.push(transformFlight(flight));
      } catch (error) {
        console.error('Error transforming flight:', error, flight);
        throw new Error(`Failed to transform flight: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Add hotels
    for (const hotel of hotels) {
      try {
        googleEvents.push(transformHotel(hotel));
      } catch (error) {
        console.error('Error transforming hotel:', error, hotel);
        throw new Error(`Failed to transform hotel "${hotel.hotel.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Batch insert events
    const results = [];
    for (const event of googleEvents) {
      try {
        const result = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
        });
        results.push(result.data);
      } catch (error) {
        console.error('Error creating event:', error);
        // Continue with other events even if one fails
      }
    }

    return {
      success: true,
      eventsCreated: results.length,
    };
  } catch (error) {
    console.error('Error exporting to Google Calendar:', error);
    return {
      success: false,
      eventsCreated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test Google Calendar connection with a real API call
 */
export async function testGoogleCalendarConnection(user: User): Promise<{
  connected: boolean;
  error?: string;
}> {
  console.log('Testing Google Calendar connection for user:', user.id);
  try {
    if (!user.googleCalendarAccessToken || !user.googleCalendarRefreshToken) {
      console.log('No tokens available for user');
      return { connected: false, error: 'No tokens available' };
    }

    console.log('Creating OAuth2 client...');
    const client = new OAuth2Client(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
      process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
    );

    client.setCredentials({
      access_token: user.googleCalendarAccessToken,
      refresh_token: user.googleCalendarRefreshToken,
    });

    // Try to refresh tokens if they're expired
    if (!hasValidTokens(user)) {
      console.log('Tokens appear expired, attempting refresh...');
      try {
        const refreshedTokens = await refreshUserTokens(user);
        client.setCredentials({
          access_token: refreshedTokens.accessToken,
          refresh_token: refreshedTokens.refreshToken,
        });
        console.log('Token refresh successful');
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return { connected: false, error: 'Token refresh failed' };
      }
    } else {
      console.log('Tokens appear valid, proceeding with API test');
    }

    // Make a test API call - try to list events (which we have permission for)
    console.log('Making test API call to Google Calendar...');
    const calendar = google.calendar({ version: 'v3', auth: client });
    await calendar.events.list({ 
      calendarId: 'primary', 
      maxResults: 1,
      timeMin: new Date().toISOString()
    });

    console.log('Google Calendar connection test successful');
    return { connected: true };
  } catch (error) {
    console.error('Google Calendar connection test failed:', error);
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Revoke user's Google Calendar access
 */
export async function revokeGoogleCalendarAccess(user: User): Promise<boolean> {
  try {
    const client = new OAuth2Client(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
      process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
    );

    client.setCredentials({
      access_token: user.googleCalendarAccessToken,
      refresh_token: user.googleCalendarRefreshToken,
    });

    await client.revokeCredentials();
    return true;
  } catch (error) {
    console.error('Error revoking Google Calendar access:', error);
    return false;
  }
}

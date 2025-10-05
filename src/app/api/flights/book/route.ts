import { NextRequest, NextResponse } from 'next/server';
import { amadeusService } from '@/lib/amadeusService';
import { FlightBookingRequest } from '@/types/flights';

export async function POST(request: NextRequest) {
  try {
    const bookingData: FlightBookingRequest = await request.json();
    
    // Validate required fields
    if (!bookingData.data || !bookingData.data.flightOffers || !bookingData.data.travelers) {
      return NextResponse.json(
        { error: 'Missing required booking data' },
        { status: 400 }
      );
    }

    const result = await amadeusService.createFlightBooking(bookingData);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Flight booking error:', error);
    return NextResponse.json(
      { error: 'Failed to create flight booking' },
      { status: 500 }
    );
  }
}

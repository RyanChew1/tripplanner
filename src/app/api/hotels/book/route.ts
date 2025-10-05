import { NextRequest, NextResponse } from 'next/server';
import { amadeusService } from '@/lib/amadeusService';
import { HotelBookingRequest } from '@/types/hotels';

export async function POST(request: NextRequest) {
  try {
    const bookingData: HotelBookingRequest = await request.json();
    
    // Validate required fields
    if (!bookingData.data || !bookingData.data.hotelId || !bookingData.data.offerId || !bookingData.data.guests) {
      return NextResponse.json(
        { error: 'Missing required booking data' },
        { status: 400 }
      );
    }

    const result = await amadeusService.createHotelBooking(bookingData);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Hotel booking error:', error);
    return NextResponse.json(
      { error: 'Failed to create hotel booking' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { amadeusService } from '@/lib/amadeusService';
import { FlightSearchParams } from '@/types/flights';

export async function GET(request: NextRequest) {
  try {
    console.log('Flight search API called');
    const { searchParams } = new URL(request.url);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    const flightParams: FlightSearchParams = {
      origin: searchParams.get('origin') || '',
      destination: searchParams.get('destination') || '',
      departureDate: searchParams.get('departureDate') || '',
      returnDate: searchParams.get('returnDate') || undefined,
      adults: parseInt(searchParams.get('adults') || '1'),
      children: searchParams.get('children') ? parseInt(searchParams.get('children')!) : undefined,
      infants: searchParams.get('infants') ? parseInt(searchParams.get('infants')!) : undefined,
      travelClass: (searchParams.get('travelClass') as 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST') || 'ECONOMY',
      nonStop: searchParams.get('nonStop') === 'true',
      maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined,
      currencyCode: searchParams.get('currencyCode') || 'USD',
    };

    console.log('Flight params:', flightParams);

    // Validate required parameters
    if (!flightParams.origin || !flightParams.destination || !flightParams.departureDate) {
      console.log('Missing required parameters');
      return NextResponse.json(
        { error: 'Missing required parameters: origin, destination, departureDate' },
        { status: 400 }
      );
    }

    // Validate date is in the future
    const departureDate = new Date(flightParams.departureDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    if (departureDate < today) {
      console.log('Date is in the past:', flightParams.departureDate);
      return NextResponse.json(
        { error: 'Departure date must be in the future. Please select a date after today.' },
        { status: 400 }
      );
    }

    console.log('Calling Amadeus service...');
    const results = await amadeusService.searchFlights(flightParams);
    console.log('Amadeus service returned results');
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Flight search error:', error);
    
    // Handle specific Amadeus API date errors
    if (error instanceof Error && error.message.includes('INVALID DATE')) {
      return NextResponse.json(
        { error: 'The selected departure date is not valid. Please choose a date that is clearly in the future.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to search flights', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

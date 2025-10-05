import { NextRequest, NextResponse } from 'next/server';
import { amadeusService } from '@/lib/amadeusService';
import { HotelSearchParams } from '@/types/hotels';

export async function GET(request: NextRequest) {
  try {
    console.log('Hotel search API called');
    const { searchParams } = new URL(request.url);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    const hotelParams: HotelSearchParams = {
      cityCode: searchParams.get('cityCode') || '',
      checkInDate: searchParams.get('checkInDate') || '',
      checkOutDate: searchParams.get('checkOutDate') || '',
      roomQuantity: parseInt(searchParams.get('roomQuantity') || '1'),
      adults: parseInt(searchParams.get('adults') || '1'),
      children: searchParams.get('children') ? parseInt(searchParams.get('children')!) : undefined,
      infants: searchParams.get('infants') ? parseInt(searchParams.get('infants')!) : undefined,
      currencyCode: searchParams.get('currencyCode') || 'USD',
      view: (searchParams.get('view') as 'FULL' | 'LIGHT') || 'FULL',
    };

    // Parse price range if provided
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    if (minPrice && maxPrice) {
      hotelParams.priceRange = {
        min: parseInt(minPrice),
        max: parseInt(maxPrice),
      };
    }

    // Parse ratings if provided
    const ratings = searchParams.get('ratings');
    if (ratings) {
      hotelParams.ratings = ratings.split(',').map(r => parseInt(r));
    }

    // Parse amenities if provided
    const amenities = searchParams.get('amenities');
    if (amenities) {
      hotelParams.amenities = amenities.split(',');
    }

    // Parse hotel IDs if provided
    const hotelIds = searchParams.get('hotelIds');
    if (hotelIds) {
      hotelParams.hotelIds = hotelIds.split(',');
    }

    // Validate required parameters
    if (!hotelParams.cityCode || !hotelParams.checkInDate || !hotelParams.checkOutDate) {
      console.log('Missing required parameters');
      return NextResponse.json(
        { error: 'Missing required parameters: cityCode, checkInDate, checkOutDate' },
        { status: 400 }
      );
    }

    console.log('Hotel params:', hotelParams);
    console.log('Calling Amadeus service...');
    const results = await amadeusService.searchHotels(hotelParams);
    console.log('Amadeus service returned results');
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Hotel search error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: 'Failed to search hotels', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

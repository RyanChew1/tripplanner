import { NextRequest, NextResponse } from 'next/server';
import { amadeusService } from '@/lib/amadeusService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cityCode = searchParams.get('cityCode');
    
    if (!cityCode) {
      return NextResponse.json(
        { error: 'Missing cityCode parameter' },
        { status: 400 }
      );
    }

    const results = await amadeusService.getAirports(cityCode);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Airport search error:', error);
    return NextResponse.json(
      { error: 'Failed to search airports' },
      { status: 500 }
    );
  }
}

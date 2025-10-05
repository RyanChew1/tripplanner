import { NextRequest, NextResponse } from 'next/server';
import { amadeusService } from '@/lib/amadeusService';

export async function POST(request: NextRequest) {
  try {
    const { offerId } = await request.json();
    
    if (!offerId) {
      return NextResponse.json(
        { error: 'Missing offerId parameter' },
        { status: 400 }
      );
    }

    const result = await amadeusService.confirmFlightPrice(offerId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Flight price confirmation error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm flight price' },
      { status: 500 }
    );
  }
}

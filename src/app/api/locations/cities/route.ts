import { NextRequest, NextResponse } from 'next/server';
import { amadeusService } from '@/lib/amadeusService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    
    if (!keyword) {
      return NextResponse.json(
        { error: 'Missing keyword parameter' },
        { status: 400 }
      );
    }

    const results = await amadeusService.getCities(keyword);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('City search error:', error);
    return NextResponse.json(
      { error: 'Failed to search cities' },
      { status: 500 }
    );
  }
}

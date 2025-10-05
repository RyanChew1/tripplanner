import { FlightSearchParams, FlightSearchResponse, FlightBookingRequest } from '@/types/flights';
import { HotelSearchParams, HotelSearchResponse, HotelOffer, HotelBookingRequest } from '@/types/hotels';

class AmadeusService {
  private baseUrl = 'https://test.api.amadeus.com';
  private apiKey: string;
  private apiSecret: string;
  private accessToken: string = '';
  private tokenExpiry: number = 0;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_AMADEUS_API_KEY || '';
    this.apiSecret = process.env.NEXT_PUBLIC_AMADEUS_SECRET || '';
    console.log('Amadeus service initialized with API key:', this.apiKey ? 'Present' : 'Missing');
    console.log('Amadeus service initialized with API secret:', this.apiSecret ? 'Present' : 'Missing');
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    console.log('Getting new Amadeus access token...');
    console.log('API Key length:', this.apiKey.length);
    console.log('API Secret length:', this.apiSecret.length);

    try {
      const response = await fetch(`${this.baseUrl}/v1/security/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.apiKey,
          client_secret: this.apiSecret,
        }),
      });

      console.log('Amadeus auth response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Amadeus auth error response:', errorText);
        throw new Error(`Failed to get access token: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
      
      console.log('Successfully obtained Amadeus access token');
      return this.accessToken;
    } catch (error) {
      console.error('Error getting Amadeus access token:', error);
      throw new Error('Failed to authenticate with Amadeus API');
    }
  }

  private async makeRequest<T = unknown>(endpoint: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
    const token = await this.getAccessToken();
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Amadeus API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Flight Search Methods
  async searchFlights(params: FlightSearchParams): Promise<FlightSearchResponse> {
    const searchParams: Record<string, string | number | boolean | undefined> = {
      originLocationCode: params.origin,
      destinationLocationCode: params.destination,
      departureDate: params.departureDate,
      adults: params.adults,
      children: params.children,
      infants: params.infants,
      travelClass: params.travelClass || 'ECONOMY',
      nonStop: params.nonStop,
      maxPrice: params.maxPrice,
      currencyCode: params.currencyCode || 'USD',
    };

    console.log(searchParams);

    if (params.returnDate) {
      searchParams.returnDate = params.returnDate;
    }

    return this.makeRequest<FlightSearchResponse>('/v2/shopping/flight-offers', searchParams);
  }

  async getFlightOffers(params: FlightSearchParams): Promise<FlightSearchResponse> {
    const searchParams: Record<string, string | number | boolean | undefined> = {
      originLocationCode: params.origin,
      destinationLocationCode: params.destination,
      departureDate: params.departureDate,
      adults: params.adults,
      children: params.children,
      infants: params.infants,
      travelClass: params.travelClass || 'ECONOMY',
      nonStop: params.nonStop,
      maxPrice: params.maxPrice,
      currencyCode: params.currencyCode || 'USD',
    };

    if (params.returnDate) {
      searchParams.returnDate = params.returnDate;
    }

    return this.makeRequest<FlightSearchResponse>('/v2/shopping/flight-offers', searchParams);
  }

  async confirmFlightPrice(offerId: string): Promise<unknown> {
    return this.makeRequest(`/v1/shopping/flight-offers/${offerId}/pricing`);
  }

  async createFlightBooking(bookingData: FlightBookingRequest): Promise<unknown> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}/v1/booking/flight-orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Flight booking error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Hotel Search Methods
  async searchHotels(params: HotelSearchParams): Promise<HotelSearchResponse> {
    // First, get hotels by city code
    const hotelListParams: Record<string, string | number | boolean | undefined> = {
      cityCode: params.cityCode,
    };

    const hotelListResponse = await this.makeRequest<{ data: Array<{ hotelId: string }> }>('/v1/reference-data/locations/hotels/by-city', hotelListParams);
    
    if (!hotelListResponse.data || hotelListResponse.data.length === 0) {
      return {
        meta: { count: 0, links: { self: '' } },
        data: []
      };
    }

    // Get hotel IDs (limit to first 10 for performance)
    const hotelIds = hotelListResponse.data.slice(0, 10).map(hotel => hotel.hotelId);

    // Then get hotel offers using the hotel IDs
    const searchParams: Record<string, string | number | boolean | undefined> = {
      hotelIds: hotelIds.join(','),
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      roomQuantity: params.roomQuantity,
      adults: params.adults,
      children: params.children,
      infants: params.infants,
      priceRange: params.priceRange ? `${params.priceRange.min}-${params.priceRange.max}` : undefined,
      currencyCode: params.currencyCode || 'USD',
      ratings: params.ratings?.join(','),
      amenities: params.amenities?.join(','),
      view: params.view || 'FULL',
    };

    const hotelOffersResponse = await this.makeRequest<{ data: HotelOffer[] }>('/v3/shopping/hotel-offers', searchParams);
    
    // Return the response in the expected format
    return {
      data: hotelOffersResponse.data || [],
      meta: {
        count: hotelOffersResponse.data?.length || 0,
        links: { self: '' }
      }
    };
  }

  async getHotelOffers(hotelId: string, params: Partial<HotelSearchParams>): Promise<HotelSearchResponse> {
    const searchParams: Record<string, string | number | boolean | undefined> = {
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      roomQuantity: params.roomQuantity,
      adults: params.adults,
      children: params.children,
      infants: params.infants,
      priceRange: params.priceRange ? `${params.priceRange.min}-${params.priceRange.max}` : undefined,
      currencyCode: params.currencyCode || 'USD',
      ratings: params.ratings?.join(','),
      amenities: params.amenities?.join(','),
      view: params.view || 'FULL',
    };

    return this.makeRequest<HotelSearchResponse>(`/v3/shopping/hotel-offers/by-hotel`, {
      hotelIds: hotelId,
      ...searchParams,
    });
  }

  async createHotelBooking(bookingData: HotelBookingRequest): Promise<unknown> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}/v1/booking/hotel-bookings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hotel booking error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Location and Reference Data
  async getAirports(cityCode: string): Promise<unknown> {
    return this.makeRequest('/v1/reference-data/locations', {
      subType: 'AIRPORT',
      keyword: cityCode,
    });
  }

  async getCities(keyword: string): Promise<unknown> {
    return this.makeRequest('/v1/reference-data/locations', {
      subType: 'CITY',
      keyword: keyword,
    });
  }

  async getHotelList(cityCode: string): Promise<unknown> {
    return this.makeRequest('/v1/reference-data/locations/hotels/by-city', {
      cityCode: cityCode,
    });
  }

  async getAirlineCodes(): Promise<unknown> {
    return this.makeRequest('/v1/reference-data/airlines');
  }

  async getAircraftCodes(): Promise<unknown> {
    return this.makeRequest('/v1/reference-data/aircraft');
  }
}

export const amadeusService = new AmadeusService();

# Amadeus API Integration Setup

This project includes integration with the Amadeus API for flight and hotel booking functionality.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
NEXT_PUBLIC_AMADEUS_API_KEY=your_amadeus_api_key_here
NEXT_PUBLIC_AMADEUS_SECRET=your_amadeus_secret_here
```

## Getting Amadeus API Keys

1. Visit [Amadeus for Developers](https://developers.amadeus.com/)
2. Create a free account
3. Create a new app to get your API key and secret
4. Use the test environment keys for development

## Features Implemented

### Flight Search & Booking
- Search for flights by origin, destination, and dates
- Support for one-way and round-trip flights
- Multiple travel classes (Economy, Premium Economy, Business, First)
- Price confirmation and booking
- Airport and city code lookup

### Hotel Search & Booking
- Search for hotels by city code and dates
- Filter by price range, ratings, and amenities
- Room quantity and guest count options
- Hotel booking with guest information

### API Routes
- `/api/flights/search` - Search for flights
- `/api/flights/confirm-price` - Confirm flight pricing
- `/api/flights/book` - Create flight bookings
- `/api/hotels/search` - Search for hotels
- `/api/hotels/book` - Create hotel bookings
- `/api/locations/airports` - Search airports by city
- `/api/locations/cities` - Search cities by keyword

### React Hooks
- `useFlightSearch` - Search for flights
- `useConfirmFlightPrice` - Confirm flight pricing
- `useFlightBooking` - Create flight bookings
- `useHotelSearch` - Search for hotels
- `useHotelBooking` - Create hotel bookings
- `useAirportSearch` - Search airports
- `useCitySearch` - Search cities

## Usage Example

```tsx
import { useFlightSearch } from '@/hooks/useFlights';

function FlightSearchComponent() {
  const { data, isLoading, error } = useFlightSearch({
    origin: 'JFK',
    destination: 'LAX',
    departureDate: '2024-06-01',
    adults: 1,
    travelClass: 'ECONOMY'
  });

  if (isLoading) return <div>Searching...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.data.map(offer => (
        <div key={offer.id}>
          <h3>{offer.price.total} {offer.price.currency}</h3>
          {/* Render flight details */}
        </div>
      ))}
    </div>
  );
}
```

## Components

- `FlightSearch` - Complete flight search interface
- `HotelSearch` - Complete hotel search interface
- Booking page at `/booking` with tabbed interface

## TypeScript Types

All Amadeus API responses are fully typed in:
- `src/types/flights.ts` - Flight-related types
- `src/types/hotels.ts` - Hotel-related types

## Error Handling

The service includes comprehensive error handling for:
- API authentication failures
- Network errors
- Invalid parameters
- Booking failures

## Security Notes

- API keys are stored as public environment variables (required for client-side usage)
- Use test environment keys for development
- Implement proper validation on the server side for production
- Consider rate limiting for production use

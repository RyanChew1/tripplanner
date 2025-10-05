'use client';

import { useState } from 'react';
import { useFlightSearch } from '@/hooks/useFlights';
import { FlightSearchParams, FlightSearchResponse } from '@/types/flights';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export default function FlightSearch() {
  const [searchParams, setSearchParams] = useState<FlightSearchParams>({
    origin: '',
    destination: '',
    departureDate: '',
    adults: 1,
    travelClass: 'ECONOMY',
  });

  const flightSearch = useFlightSearch();
  const [flightResults, setFlightResults] = useState<FlightSearchResponse | undefined>();

  const handleSearch = async () => {
    if (!searchParams.origin || !searchParams.destination || !searchParams.departureDate) {
      return;
    }

    // Validate date is in the future
    const departureDate = new Date(searchParams.departureDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (departureDate < today) {
      alert('Please select a departure date that is in the future.');
      return;
    }

    try {
      const result = await flightSearch.mutateAsync(searchParams);
      setFlightResults(result);
    } catch (error) {
      console.error('Search error:', error);
      // Show user-friendly error message
      if (error instanceof Error) {
        alert(`Search failed: ${error.message}`);
      } else {
        alert('Search failed. Please try again.');
      }
    }
  };

  const handleInputChange = (field: keyof FlightSearchParams, value: string | number) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-4 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800">Flight Search</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From
          </label>
          <Input
            type="text"
            placeholder="City or Airport Code"
            value={searchParams.origin}
            onChange={(e) => handleInputChange('origin', e.target.value.toUpperCase())}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To
          </label>
          <Input
            type="text"
            placeholder="City or Airport Code"
            value={searchParams.destination}
            onChange={(e) => handleInputChange('destination', e.target.value.toUpperCase())}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Departure Date
          </label>
          <Input
            type="date"
            value={searchParams.departureDate}
            onChange={(e) => handleInputChange('departureDate', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Passengers
          </label>
          <Input
            type="number"
            min="1"
            max="9"
            value={searchParams.adults}
            onChange={(e) => handleInputChange('adults', parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Return Date (Optional)
          </label>
          <Input
            type="date"
            value={searchParams.returnDate || ''}
            onChange={(e) => handleInputChange('returnDate', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Travel Class
          </label>
          <Select
            value={searchParams.travelClass}
            onValueChange={(value) => handleInputChange('travelClass', value as 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST')}
          >
            <option value="ECONOMY">Economy</option>
            <option value="PREMIUM_ECONOMY">Premium Economy</option>
            <option value="BUSINESS">Business</option>
            <option value="FIRST">First</option>
          </Select>
        </div>
      </div>

      <Button onClick={handleSearch} disabled={flightSearch.isPending} className="w-full">
        {flightSearch.isPending ? 'Searching...' : 'Search Flights'}
      </Button>

      {flightSearch.error && (
        <div className="text-red-600 text-sm">
          Error: {flightSearch.error.message}
        </div>
      )}

      {flightResults && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">
            Found {flightResults.meta.count} flights
          </h3>
          
          <div className="space-y-4">
            {flightResults.data.map((offer, index) => (
              <div key={offer.id || index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold">
                      {offer.itineraries[0]?.segments[0]?.departure.iataCode} → 
                      {offer.itineraries[0]?.segments[offer.itineraries[0].segments.length - 1]?.arrival.iataCode}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {offer.itineraries[0]?.duration}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {offer.price.currency} {offer.price.total}
                    </p>
                    <p className="text-sm text-gray-500">
                      {offer.numberOfBookableSeats} seats available
                    </p>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p>
                    {offer.itineraries[0]?.segments.map((segment, segIndex) => (
                      <span key={segIndex}>
                        {segment.departure.iataCode} → {segment.arrival.iataCode}
                        {segIndex < offer.itineraries[0].segments.length - 1 && ' • '}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

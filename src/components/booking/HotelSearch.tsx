'use client';

import { useState } from 'react';
import { useHotelSearch } from '@/hooks/useHotels';
import { HotelSearchParams, HotelSearchResponse } from '@/types/hotels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function HotelSearch() {
  const [searchParams, setSearchParams] = useState<HotelSearchParams>({
    cityCode: '',
    checkInDate: '',
    checkOutDate: '',
    roomQuantity: 1,
    adults: 1,
  });

  const hotelSearch = useHotelSearch();
  const [hotelResults, setHotelResults] = useState<HotelSearchResponse | undefined>();

  const handleSearch = async () => {
    if (!searchParams.cityCode || !searchParams.checkInDate || !searchParams.checkOutDate) {
      return;
    }

    // Validate dates are in the future
    const checkInDate = new Date(searchParams.checkInDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkInDate < today) {
      alert('Please select check-in and check-out dates that are in the future.');
      return;
    }

    try {
      const result = await hotelSearch.mutateAsync(searchParams);
      setHotelResults(result);
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

  const handleInputChange = (field: keyof HotelSearchParams, value: string | number) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-4 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800">Hotel Search</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City Code
          </label>
          <Input
            type="text"
            placeholder="e.g., NYC, LON, PAR"
            value={searchParams.cityCode}
            onChange={(e) => handleInputChange('cityCode', e.target.value.toUpperCase())}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Check-in Date
          </label>
          <Input
            type="date"
            value={searchParams.checkInDate}
            onChange={(e) => handleInputChange('checkInDate', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Check-out Date
          </label>
          <Input
            type="date"
            value={searchParams.checkOutDate}
            onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rooms
          </label>
          <Input
            type="number"
            min="1"
            max="9"
            value={searchParams.roomQuantity}
            onChange={(e) => handleInputChange('roomQuantity', parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adults
          </label>
          <Input
            type="number"
            min="1"
            max="9"
            value={searchParams.adults}
            onChange={(e) => handleInputChange('adults', parseInt(e.target.value) || 1)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Children
          </label>
          <Input
            type="number"
            min="0"
            max="9"
            value={searchParams.children || 0}
            onChange={(e) => handleInputChange('children', parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <Button onClick={handleSearch} disabled={hotelSearch.isPending} className="w-full">
        {hotelSearch.isPending ? 'Searching...' : 'Search Hotels'}
      </Button>

      {hotelSearch.error && (
        <div className="text-red-600 text-sm">
          Error: {hotelSearch.error.message}
        </div>
      )}

      {hotelResults && (
        <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">
          Found {hotelResults.data.length} hotels
          </h3>
          
          <div className="space-y-4">
            {hotelResults.data.map((hotelOffer, index) => (
              <div key={hotelOffer.hotel.hotelId || index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{hotelOffer.hotel.name}</h4>
                    <p className="text-sm text-gray-600">
                      {hotelOffer.hotel.address.cityName}, {hotelOffer.hotel.address.countryCode}
                    </p>
                    <div className="flex items-center mt-1">
                      <span className="text-yellow-500">★</span>
                      <span className="ml-1 text-sm">{hotelOffer.hotel.rating}/5</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {hotelOffer.offers[0]?.price.currency} {hotelOffer.offers[0]?.price.total}
                    </p>
                    <p className="text-sm text-gray-500">per night</p>
                  </div>
                </div>
                
                {hotelOffer.hotel.description && (
                  <p className="text-sm text-gray-600 mb-2">
                    {hotelOffer.hotel.description.text}
                  </p>
                )}
                
                {hotelOffer.hotel.amenities && hotelOffer.hotel.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {hotelOffer.hotel.amenities.slice(0, 5).map((amenity, amenityIndex) => (
                      <span
                        key={amenityIndex}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="text-sm text-gray-500">
                  <p>
                    Check-in: {hotelOffer.offers[0]?.checkInDate} | 
                    Check-out: {hotelOffer.offers[0]?.checkOutDate}
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

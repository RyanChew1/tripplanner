'use client';

import { useState } from 'react';
import { useHotelSearch, useItinerary } from '@/hooks';
import { HotelSearchParams, HotelSearchResponse, HotelOffer } from '@/types/hotels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Check } from 'lucide-react';

interface GroupMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface TripHotelSearchProps {
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  groupMembers: GroupMember[];
}

export default function TripHotelSearch({ 
  tripId,
  tripStartDate, 
  tripEndDate, 
  groupMembers 
}: TripHotelSearchProps) {
  const [activeSearch, setActiveSearch] = useState<'hotels' | 'custom'>('hotels');
  
  // Default hotel search for the trip dates
  const [searchParams, setSearchParams] = useState<HotelSearchParams>({
    cityCode: '',
    checkInDate: tripStartDate,
    checkOutDate: tripEndDate,
    roomQuantity: Math.ceil(groupMembers.length / 2), // Assume 2 people per room
    adults: groupMembers.length,
  });

  // Custom search parameters
  const [customSearchParams, setCustomSearchParams] = useState<HotelSearchParams>({
    cityCode: '',
    checkInDate: '',
    checkOutDate: '',
    roomQuantity: Math.ceil(groupMembers.length / 2),
    adults: groupMembers.length,
  });

  // Search mutations
  const hotelSearch = useHotelSearch();
  const customSearch = useHotelSearch();

  // State for search results
  const [hotelResults, setHotelResults] = useState<HotelSearchResponse | undefined>();
  const [customResults, setCustomResults] = useState<HotelSearchResponse | undefined>();
  const [savedHotels, setSavedHotels] = useState<Set<string>>(new Set());
  const { addHotel } = useItinerary();

  const handleSaveHotel = async (hotel: HotelOffer) => {
    try {
      await addHotel.mutateAsync({ tripId, hotel });
      setSavedHotels(prev => new Set([...prev, hotel.hotel.hotelId]));
    } catch (error) {
      console.error('Error saving hotel:', error);
    }
  };

  const handleInputChange = (field: keyof HotelSearchParams, value: string | number, searchType: 'hotels' | 'custom') => {
    if (searchType === 'hotels') {
      setSearchParams(prev => ({ ...prev, [field]: value }));
    } else {
      setCustomSearchParams(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSearch = async (searchType: 'hotels' | 'custom') => {
    setActiveSearch(searchType);
    
    let params: HotelSearchParams;
    let searchMutation;
    
    switch (searchType) {
      case 'hotels':
        params = searchParams;
        searchMutation = hotelSearch;
        break;
      case 'custom':
        params = customSearchParams;
        searchMutation = customSearch;
        break;
      default:
        return;
    }

    // Validate required fields
    if (!params.cityCode || !params.checkInDate || !params.checkOutDate) {
      return;
    }

    // Validate dates are in the future
    const checkInDate = new Date(params.checkInDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkInDate < today) {
      alert('Please select check-in and check-out dates that are in the future.');
      return;
    }

    try {
      const result = await searchMutation.mutateAsync(params);
      
      switch (searchType) {
        case 'hotels':
          setHotelResults(result);
          break;
        case 'custom':
          setCustomResults(result);
          break;
      }
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

  const formatPrice = (price: string, currency: string) => {
    return `${currency} ${parseFloat(price).toFixed(2)}`;
  };

  const renderHotelResults = (results: HotelSearchResponse | undefined, isLoading: boolean, error: unknown, title: string) => {
    if (isLoading) {
      return (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      );
    }

    if (!results || !results.data || results.data.length === 0) {
      return (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">No hotels found. Try adjusting your search criteria.</p>
        </div>
      );
    }

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">
          {title} ({results.data.length} hotels found)
        </h3>
        <div className="space-y-4">
          {results.data.map((hotel, index) => (
            <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{hotel.hotel.name}</h4>
                  <p className="text-gray-600 text-sm mb-2">{hotel.hotel.address?.lines?.[0]}</p>
                  
                  {hotel.hotel.rating && (
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm font-medium">{hotel.hotel.rating}</span>
                    </div>
                  )}

                  {hotel.offers && hotel.offers.length > 0 && (
                    <div className="space-y-2">
                      {hotel.offers.map((offer, offerIndex) => (
                        <div key={offerIndex} className="border-t pt-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{offer.room?.typeEstimated?.category || 'Standard Room'}</p>
                              <p className="text-sm text-gray-600">
                                {offer.room?.typeEstimated?.beds} bed(s) • {offer.room?.typeEstimated?.bedType}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                {formatPrice(offer.price.total, offer.price.currency)}
                              </p>
                              <p className="text-sm text-gray-500">total</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleSaveHotel(hotel)}
                    disabled={savedHotels.has(hotel.hotel.hotelId) || addHotel.isPending}
                    className="flex items-center space-x-1"
                  >
                    {savedHotels.has(hotel.hotel.hotelId) ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Save to Trip</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Type Tabs */}
      <div className="flex space-x-4 border-b">
        <button
          onClick={() => setActiveSearch('hotels')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeSearch === 'hotels'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Trip Hotels
        </button>
        <button
          onClick={() => setActiveSearch('custom')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeSearch === 'custom'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Custom Search
        </button>
      </div>

      {/* Trip Hotels Search */}
      {activeSearch === 'hotels' && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Search Hotels for Your Trip</h3>
            <p className="text-blue-700 text-sm">
              We&apos;ve pre-filled the check-in and check-out dates based on your trip dates. 
              Just enter the city code (e.g., NYC, LON, PAR) to search for hotels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City Code
              </label>
              <Input
                placeholder="e.g., NYC, LON, PAR"
                value={searchParams.cityCode}
                onChange={(e) => handleInputChange('cityCode', e.target.value.toUpperCase(), 'hotels')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-in Date
              </label>
              <Input
                type="date"
                value={searchParams.checkInDate}
                onChange={(e) => handleInputChange('checkInDate', e.target.value, 'hotels')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-out Date
              </label>
              <Input
                type="date"
                value={searchParams.checkOutDate}
                onChange={(e) => handleInputChange('checkOutDate', e.target.value, 'hotels')}
                min={searchParams.checkInDate}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => handleSearch('hotels')} 
                disabled={!searchParams.cityCode || !searchParams.checkInDate || !searchParams.checkOutDate || hotelSearch.isPending}
                className="w-full"
              >
                {hotelSearch.isPending ? 'Searching...' : 'Search Hotels'}
              </Button>
            </div>
          </div>

          {renderHotelResults(hotelResults, hotelSearch.isPending, hotelSearch.error, 'Trip Hotels')}
        </div>
      )}

      {/* Custom Search */}
      {activeSearch === 'custom' && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Custom Hotel Search</h3>
            <p className="text-gray-700 text-sm">
              Search for hotels with your own criteria. Enter any city code and dates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City Code
              </label>
              <Input
                placeholder="e.g., NYC, LON, PAR"
                value={customSearchParams.cityCode}
                onChange={(e) => handleInputChange('cityCode', e.target.value.toUpperCase(), 'custom')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-in Date
              </label>
              <Input
                type="date"
                value={customSearchParams.checkInDate}
                onChange={(e) => handleInputChange('checkInDate', e.target.value, 'custom')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-out Date
              </label>
              <Input
                type="date"
                value={customSearchParams.checkOutDate}
                onChange={(e) => handleInputChange('checkOutDate', e.target.value, 'custom')}
                min={customSearchParams.checkInDate}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rooms
              </label>
              <Input
                type="number"
                min="1"
                value={customSearchParams.roomQuantity}
                onChange={(e) => handleInputChange('roomQuantity', parseInt(e.target.value) || 1, 'custom')}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => handleSearch('custom')} 
                disabled={!customSearchParams.cityCode || !customSearchParams.checkInDate || !customSearchParams.checkOutDate || customSearch.isPending}
                className="w-full"
              >
                {customSearch.isPending ? 'Searching...' : 'Search Hotels'}
              </Button>
            </div>
          </div>

          {renderHotelResults(customResults, customSearch.isPending, customSearch.error, 'Custom Hotel Search Results')}
        </div>
      )}
    </div>
  );
}

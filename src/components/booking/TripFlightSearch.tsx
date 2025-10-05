'use client';

import { useState } from 'react';
import { useFlightSearch, useItinerary } from '@/hooks';
import { FlightSearchParams, FlightSearchResponse, FlightOffer } from '@/types/flights';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { MapPin, Clock, Plane, Search, Plus, Check } from 'lucide-react';

interface TripFlightSearchProps {
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  groupMembers: Array<{ id: string; firstName: string; lastName: string; email: string }>;
}

export default function TripFlightSearch({ tripId, tripStartDate, tripEndDate, groupMembers }: TripFlightSearchProps) {
  const [searchParams, setSearchParams] = useState<FlightSearchParams>({
    origin: '',
    destination: '',
    departureDate: tripStartDate,
    adults: groupMembers.length,
    travelClass: 'ECONOMY',
  });

  const [returnSearchParams, setReturnSearchParams] = useState<FlightSearchParams>({
    origin: '',
    destination: '',
    departureDate: tripEndDate,
    adults: groupMembers.length,
    travelClass: 'ECONOMY',
  });

  const [activeSearch, setActiveSearch] = useState<'departure' | 'return' | 'custom'>('departure');
  const [customSearchParams, setCustomSearchParams] = useState<FlightSearchParams>({
    origin: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    adults: groupMembers.length,
    travelClass: 'ECONOMY',
  });

  const [savedFlights, setSavedFlights] = useState<Set<string>>(new Set());
  const { addFlight } = useItinerary();

  const handleSaveFlight = async (flight: FlightOffer) => {
    try {
      await addFlight.mutateAsync({ tripId, flight });
      setSavedFlights(prev => new Set([...prev, flight.id]));
    } catch (error) {
      console.error('Error saving flight:', error);
    }
  };

  // Search mutations
  const departureSearch = useFlightSearch();
  const returnSearch = useFlightSearch();
  const customSearch = useFlightSearch();

  // State for search results
  const [departureResults, setDepartureResults] = useState<FlightSearchResponse | undefined>();
  const [returnResults, setReturnResults] = useState<FlightSearchResponse | undefined>();
  const [customResults, setCustomResults] = useState<FlightSearchResponse | undefined>();

  const handleInputChange = (field: keyof FlightSearchParams, value: string | number, searchType: 'departure' | 'return' | 'custom') => {
    if (searchType === 'departure') {
      setSearchParams(prev => ({ ...prev, [field]: value }));
    } else if (searchType === 'return') {
      setReturnSearchParams(prev => ({ ...prev, [field]: value }));
    } else {
      setCustomSearchParams(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSearch = async (searchType: 'departure' | 'return' | 'custom') => {
    setActiveSearch(searchType);
    
    let params: FlightSearchParams;
    let searchMutation;
    
    switch (searchType) {
      case 'departure':
        params = searchParams;
        searchMutation = departureSearch;
        break;
      case 'return':
        params = returnSearchParams;
        searchMutation = returnSearch;
        break;
      case 'custom':
        params = customSearchParams;
        searchMutation = customSearch;
        break;
      default:
        return;
    }

    // Validate required fields
    if (!params.origin || !params.destination || !params.departureDate) {
      return;
    }

    // Validate date is in the future
    const departureDate = new Date(params.departureDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (departureDate < today) {
      alert('Please select a departure date that is in the future.');
      return;
    }

    try {
      const result = await searchMutation.mutateAsync(params);
      
      switch (searchType) {
        case 'departure':
          setDepartureResults(result);
          break;
        case 'return':
          setReturnResults(result);
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

  const formatFlightTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatFlightDate = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const renderFlightResults = (results: FlightSearchResponse | undefined, loading: boolean, error: unknown, title: string) => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-red-600 text-sm p-4 bg-red-50 rounded-lg">
          Error: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      );
    }

    if (!results?.data?.length) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Plane className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p>No flights found. Try adjusting your search criteria.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {results.data.map((offer, index: number) => (
          <div key={offer.id || index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-2">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatFlightTime(offer.itineraries[0]?.segments[0]?.departure.at)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {offer.itineraries[0]?.segments[0]?.departure.iataCode}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatFlightDate(offer.itineraries[0]?.segments[0]?.departure.at)}
                    </div>
                  </div>
                  
                  <div className="flex-1 text-center">
                    <div className="text-sm text-gray-500 mb-1">
                      {offer.itineraries[0]?.duration}
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <Plane className="h-4 w-4 text-gray-400" />
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {offer.itineraries[0]?.segments.length === 1 ? 'Direct' : `${offer.itineraries[0]?.segments.length - 1} stop(s)`}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatFlightTime(offer.itineraries[0]?.segments[offer.itineraries[0].segments.length - 1]?.arrival.at)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {offer.itineraries[0]?.segments[offer.itineraries[0].segments.length - 1]?.arrival.iataCode}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatFlightDate(offer.itineraries[0]?.segments[offer.itineraries[0].segments.length - 1]?.arrival.at)}
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{offer.itineraries[0]?.duration}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {offer.itineraries[0]?.segments.map((segment, segIndex: number) => (
                          <span key={segIndex}>
                            {segment.departure.iataCode} → {segment.arrival.iataCode}
                            {segIndex < offer.itineraries[0].segments.length - 1 && ' • '}
                          </span>
                        ))}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-right ml-4">
                <div className="text-2xl font-bold text-green-600">
                  {offer.price.currency} {offer.price.total}
                </div>
                <div className="text-sm text-gray-500">
                  {offer.numberOfBookableSeats} seats available
                </div>
                <div className="flex space-x-2 mt-2">
                  <Button 
                    size="sm" 
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Select Flight
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleSaveFlight(offer)}
                    disabled={savedFlights.has(offer.id) || addFlight.isPending}
                    className="flex items-center space-x-1"
                  >
                    {savedFlights.has(offer.id) ? (
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
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Tabs */}
      <div className="flex space-x-4 border-b">
        {[
          { id: 'departure', label: 'Departure Flights', icon: Plane },
          { id: 'return', label: 'Return Flights', icon: Plane },
          { id: 'custom', label: 'Custom Search', icon: Search }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSearch(tab.id as 'departure' | 'return' | 'custom')}
              className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors ${
                activeSearch === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Departure Flights Search */}
      {activeSearch === 'departure' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Departure Flights</h3>
            <p className="text-blue-800 text-sm">
              Search for flights departing on your trip start date: {new Date(tripStartDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From
              </label>
              <Input
                type="text"
                placeholder="City or Airport Code"
                value={searchParams.origin}
                onChange={(e) => handleInputChange('origin', e.target.value.toUpperCase(), 'departure')}
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
                onChange={(e) => handleInputChange('destination', e.target.value.toUpperCase(), 'departure')}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => handleSearch('departure')} 
                disabled={!searchParams.origin || !searchParams.destination || departureSearch.isPending}
                className="w-full"
              >
                {departureSearch.isPending ? 'Searching...' : 'Search Departure'}
              </Button>
            </div>
          </div>

          {renderFlightResults(departureResults, departureSearch.isPending, departureSearch.error, 'Departure Flights')}
        </div>
      )}

      {/* Return Flights Search */}
      {activeSearch === 'return' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-2">Return Flights</h3>
            <p className="text-green-800 text-sm">
              Search for flights departing on your trip end date: {new Date(tripEndDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From
              </label>
              <Input
                type="text"
                placeholder="City or Airport Code"
                value={returnSearchParams.origin}
                onChange={(e) => handleInputChange('origin', e.target.value.toUpperCase(), 'return')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To
              </label>
              <Input
                type="text"
                placeholder="City or Airport Code"
                value={returnSearchParams.destination}
                onChange={(e) => handleInputChange('destination', e.target.value.toUpperCase(), 'return')}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => handleSearch('return')} 
                disabled={!returnSearchParams.origin || !returnSearchParams.destination || returnSearch.isPending}
                className="w-full"
              >
                {returnSearch.isPending ? 'Searching...' : 'Search Return'}
              </Button>
            </div>
          </div>

          {renderFlightResults(returnResults, returnSearch.isPending, returnSearch.error, 'Return Flights')}
        </div>
      )}

      {/* Custom Search */}
      {activeSearch === 'custom' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Custom Flight Search</h3>
            <p className="text-purple-800 text-sm">
              Search for flights with your own criteria and dates
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From
              </label>
              <Input
                type="text"
                placeholder="City or Airport Code"
                value={customSearchParams.origin}
                onChange={(e) => handleInputChange('origin', e.target.value.toUpperCase(), 'custom')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To
              </label>
              <Input
                type="text"
                placeholder="City or Airport Code"
                value={customSearchParams.destination}
                onChange={(e) => handleInputChange('destination', e.target.value.toUpperCase(), 'custom')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departure Date
              </label>
              <Input
                type="date"
                value={customSearchParams.departureDate}
                onChange={(e) => handleInputChange('departureDate', e.target.value, 'custom')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Return Date (Optional)
              </label>
              <Input
                type="date"
                value={customSearchParams.returnDate || ''}
                onChange={(e) => handleInputChange('returnDate', e.target.value, 'custom')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passengers
              </label>
              <Input
                type="number"
                min="1"
                max="9"
                value={customSearchParams.adults}
                onChange={(e) => handleInputChange('adults', parseInt(e.target.value) || 1, 'custom')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Travel Class
              </label>
              <Select
                value={customSearchParams.travelClass}
                onValueChange={(value) => handleInputChange('travelClass', value as 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST', 'custom')}
              >
                <option value="ECONOMY">Economy</option>
                <option value="PREMIUM_ECONOMY">Premium Economy</option>
                <option value="BUSINESS">Business</option>
                <option value="FIRST">First</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => handleSearch('custom')} 
                disabled={!customSearchParams.origin || !customSearchParams.destination || !customSearchParams.departureDate || customSearch.isPending}
                className="w-full"
              >
                {customSearch.isPending ? 'Searching...' : 'Search Flights'}
              </Button>
            </div>
          </div>

          {renderFlightResults(customResults, customSearch.isPending, customSearch.error, 'Custom Flight Search Results')}
        </div>
      )}
    </div>
  );
}

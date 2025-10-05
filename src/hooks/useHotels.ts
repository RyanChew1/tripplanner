import { useMutation, useQueryClient } from '@tanstack/react-query';
import { HotelSearchParams, HotelSearchResponse, HotelBookingRequest } from '@/types/hotels';

// Hotel Search Hook - Now uses mutation instead of query
export function useHotelSearch() {
  return useMutation({
    mutationFn: async (params: HotelSearchParams): Promise<HotelSearchResponse> => {
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'priceRange' && typeof value === 'object') {
            searchParams.append('minPrice', value.min.toString());
            searchParams.append('maxPrice', value.max.toString());
          } else if (key === 'ratings' && Array.isArray(value)) {
            searchParams.append('ratings', value.join(','));
          } else if (key === 'amenities' && Array.isArray(value)) {
            searchParams.append('amenities', value.join(','));
          } else if (key === 'hotelIds' && Array.isArray(value)) {
            searchParams.append('hotelIds', value.join(','));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });

      console.log(searchParams.toString());
      const response = await fetch(`/api/hotels/search?${searchParams.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('API Error:', response.status, error);
        throw new Error(error.error || `Failed to search hotels (${response.status})`);
      }
      
      return response.json();
    },
  });
}

// Hotel Booking Hook
export function useHotelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingData: HotelBookingRequest) => {
      const response = await fetch('/api/hotels/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create hotel booking');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate hotel search queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
    },
  });
}

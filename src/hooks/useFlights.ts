import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FlightSearchParams, FlightSearchResponse, FlightBookingRequest } from '@/types/flights';

// Flight Search Hook - Now uses mutation instead of query
export function useFlightSearch() {
  return useMutation({
    mutationFn: async (params: FlightSearchParams): Promise<FlightSearchResponse> => {
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });

      console.log(searchParams.toString());
      const response = await fetch(`/api/flights/search?${searchParams.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('API Error:', response.status, error);
        throw new Error(error.error || `Failed to search flights (${response.status})`);
      }
      
      return response.json();
    },
  });
}

// Flight Price Confirmation Hook
export function useConfirmFlightPrice() {
  return useMutation({
    mutationFn: async (offerId: string) => {
      const response = await fetch('/api/flights/confirm-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ offerId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to confirm flight price');
      }

      return response.json();
    },
  });
}

// Flight Booking Hook
export function useFlightBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingData: FlightBookingRequest) => {
      const response = await fetch('/api/flights/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create flight booking');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate flight search queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['flights'] });
    },
  });
}

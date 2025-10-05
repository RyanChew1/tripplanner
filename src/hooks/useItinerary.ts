import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ItineraryService } from '@/lib/itineraryService';
import { FlightOffer } from '@/types/flights';
import { HotelOffer } from '@/types/hotels';

export function useItinerary() {
  const queryClient = useQueryClient();

  const addFlight = useMutation({
    mutationFn: async ({ tripId, flight }: { tripId: string; flight: FlightOffer }) => {
      return ItineraryService.addFlightToTrip(tripId, flight);
    },
    onSuccess: (_, { tripId }) => {
      // Invalidate and refetch trip data
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });

  const removeFlight = useMutation({
    mutationFn: async ({ tripId, flight }: { tripId: string; flight: FlightOffer }) => {
      return ItineraryService.removeFlightFromTrip(tripId, flight);
    },
    onSuccess: (_, { tripId }) => {
      // Invalidate and refetch trip data
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });

  const addHotel = useMutation({
    mutationFn: async ({ tripId, hotel }: { tripId: string; hotel: HotelOffer }) => {
      return ItineraryService.addHotelToTrip(tripId, hotel);
    },
    onSuccess: (_, { tripId }) => {
      // Invalidate and refetch trip data
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });

  const removeHotel = useMutation({
    mutationFn: async ({ tripId, hotel }: { tripId: string; hotel: HotelOffer }) => {
      return ItineraryService.removeHotelFromTrip(tripId, hotel);
    },
    onSuccess: (_, { tripId }) => {
      // Invalidate and refetch trip data
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });

  return {
    addFlight,
    removeFlight,
    addHotel,
    removeHotel,
  };
}

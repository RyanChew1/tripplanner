import { useQuery, useMutation } from "@tanstack/react-query";
import { createTrip, getTripById, updateTrip, deleteTrip } from "../lib/tripService";
import { Trip } from "../types/trips";

export function useCreateTrip() {
    return useMutation({
        mutationFn: (trip: Trip) => createTrip(trip),
    });
}

export function useGetTripById(id: string) {
    return useQuery({
        queryKey: ["trip", id],
        queryFn: () => getTripById(id),
        enabled: !!id,
    });
}

export function useUpdateTrip() {
    return useMutation({
        mutationFn: (trip: Trip) => updateTrip(trip),
    });
}

export function useDeleteTrip() {
    return useMutation({
        mutationFn: async ({ groupId, tripId }: { groupId: string, tripId: string }) => {
            await deleteTrip(groupId, tripId);
        },
    });
}
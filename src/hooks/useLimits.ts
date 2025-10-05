import { useAuth } from '@/contexts/AuthContext';
import { useGetUser } from '@/hooks/useUser';
import { useUserGroups } from './useGroups';
import { useQuery } from '@tanstack/react-query';
import { getTripById } from '@/lib/tripService';

// Hook to check if user has reached their limits
export function useUserLimits() {
  const { user: firebaseUser } = useAuth();
  const { data: user } = useGetUser(firebaseUser?.uid || '');
  
  // Get user's groups
  const { data: userGroups, isLoading: loadingGroups } = useUserGroups(
    user?.id || '',
    { enabled: !!user?.id }
  );

  // Get user's trips (we need to count trips across all groups)
  const { data: userTrips, isLoading: loadingTrips } = useQuery({
    queryKey: ['userTrips', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get all groups the user is a member of
      const groups = userGroups || [];
      const allTripIds = groups.flatMap(group => group.tripIds || []);
      
      // Get all trips
      const trips = await Promise.all(
        allTripIds.map(tripId => getTripById(tripId))
      );
      
      return trips.filter(trip => trip !== null);
    },
    enabled: !!user?.id && !!userGroups,
  });

  const isLoading = loadingGroups || loadingTrips;

  // Define limits based on user tier
  const limits = {
    free: {
      maxGroups: 1,
      maxTrips: 1,
    },
    premium: {
      maxGroups: Infinity,
      maxTrips: Infinity,
    },
  };

  const userTier = user?.tier || 'free';
  const currentLimits = limits[userTier];

  const groupCount = userGroups?.length || 0;
  const tripCount = userTrips?.length || 0;

  const canCreateGroup = groupCount < currentLimits.maxGroups;
  const canCreateTrip = tripCount < currentLimits.maxTrips;

  const groupLimitReached = !canCreateGroup && userTier === 'free';
  const tripLimitReached = !canCreateTrip && userTier === 'free';

  return {
    isLoading,
    userTier,
    limits: currentLimits,
    counts: {
      groups: groupCount,
      trips: tripCount,
    },
    canCreateGroup,
    canCreateTrip,
    groupLimitReached,
    tripLimitReached,
    // Helper functions
    checkGroupLimit: () => canCreateGroup,
    checkTripLimit: () => canCreateTrip,
  };
}

// Hook to get limit messages for UI
export function useLimitMessages() {
  const { groupLimitReached, tripLimitReached, userTier } = useUserLimits();

  const getGroupLimitMessage = () => {
    if (userTier === 'premium') return null;
    if (groupLimitReached) {
      return {
        type: 'error' as const,
        title: 'Group Limit Reached',
        message: 'Free users can create up to 1 group. Upgrade to Premium for unlimited groups.',
        action: 'upgrade',
      };
    }
    return null;
  };

  const getTripLimitMessage = () => {
    if (userTier === 'premium') return null;
    if (tripLimitReached) {
      return {
        type: 'error' as const,
        title: 'Trip Limit Reached',
        message: 'Free users can create up to 1 trip. Upgrade to Premium for unlimited trips.',
        action: 'upgrade',
      };
    }
    return null;
  };

  return {
    groupLimitMessage: getGroupLimitMessage(),
    tripLimitMessage: getTripLimitMessage(),
  };
}

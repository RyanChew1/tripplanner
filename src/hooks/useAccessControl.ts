import { useUserLimits } from './useLimits';
import { useAuth } from '@/contexts/AuthContext';
import { useGetUser } from './useUser';
import { useGetGroupById } from './useGroups';
import { useGetTripById } from './useTrip';

export function useAccessControl() {
  const { user: currentUser } = useAuth();
  const { data: user } = useGetUser(currentUser?.uid || '');
  const { 
    userTier, 
    counts, 
    groupLimitReached, 
    tripLimitReached,
    isLoading: limitsLoading 
  } = useUserLimits();

  const canAccessGroup = (groupId: string) => {
    // Premium users can always access
    if (userTier === 'premium') return true;
    
    // If still loading, allow access temporarily
    if (limitsLoading) return true;
    
    // Free users can only access if they haven't reached the limit
    return !groupLimitReached;
  };

  const canAccessTrip = (tripId: string) => {
    // Premium users can always access
    if (userTier === 'premium') return true;
    
    // If still loading, allow access temporarily
    if (limitsLoading) return true;
    
    // Free users can only access if they haven't reached the limit
    return !tripLimitReached;
  };

  const canCreateGroup = () => {
    if (userTier === 'premium') return true;
    if (limitsLoading) return true;
    return !groupLimitReached;
  };

  const canCreateTrip = () => {
    if (userTier === 'premium') return true;
    if (limitsLoading) return true;
    return !tripLimitReached;
  };

  return {
    userTier,
    counts,
    groupLimitReached,
    tripLimitReached,
    isLoading: limitsLoading,
    canAccessGroup,
    canAccessTrip,
    canCreateGroup,
    canCreateTrip,
  };
}

// Hook to check access for a specific group
export function useGroupAccess(groupId: string) {
  const { user: currentUser } = useAuth();
  const { data: group, isLoading: groupLoading } = useGetGroupById(groupId);
  const { canAccessGroup, userTier, groupLimitReached } = useAccessControl();

  const hasAccess = canAccessGroup(groupId);
  const isGroupOwner = group?.groupMembers && currentUser?.uid && 
    group.groupMembers[currentUser.uid] && 
    ['admin', 'manager'].includes(group.groupMembers[currentUser.uid]);

  return {
    hasAccess,
    isGroupOwner,
    userTier,
    groupLimitReached,
    isLoading: groupLoading,
    group,
  };
}

// Hook to check access for a specific trip
export function useTripAccess(tripId: string) {
  const { user: currentUser } = useAuth();
  const { data: trip, isLoading: tripLoading } = useGetTripById(tripId);
  const { data: group } = useGetGroupById(trip?.groupId || '');
  const { canAccessTrip, userTier, tripLimitReached } = useAccessControl();

  const hasAccess = canAccessTrip(tripId);
  const isTripOwner = group?.groupMembers && currentUser?.uid && 
    group.groupMembers[currentUser.uid] && 
    ['admin', 'manager'].includes(group.groupMembers[currentUser.uid]);

  return {
    hasAccess,
    isTripOwner,
    userTier,
    tripLimitReached,
    isLoading: tripLoading,
    trip,
    group,
  };
}

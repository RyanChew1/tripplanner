'use client';

import { useUserLimits } from '@/hooks/useLimits';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, MapPin } from 'lucide-react';

interface UsageIndicatorProps {
  className?: string;
}

export default function UsageIndicator({ className = '' }: UsageIndicatorProps) {
  const { 
    userTier, 
    counts, 
    limits, 
    isLoading 
  } = useUserLimits();

  if (isLoading || userTier === 'premium') {
    return null;
  }

  const groupUsage = counts.groups;
  const tripUsage = counts.trips;
  const maxGroups = limits.maxGroups;
  const maxTrips = limits.maxTrips;

  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Crown className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-800">Free Plan Usage</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">Groups</span>
          </div>
          <Badge 
            variant={groupUsage >= maxGroups ? "destructive" : "secondary"}
            className="text-xs text-white"
          >
            {groupUsage}/{maxGroups}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">Trips</span>
          </div>
          <Badge 
            variant={tripUsage >= maxTrips ? "destructive" : "secondary"}
            className="text-xs text-white"
          >
            {tripUsage}/{maxTrips}
          </Badge>
        </div>
      </div>
      
      {(groupUsage >= maxGroups || tripUsage >= maxTrips) && (
        <div className="mt-3 pt-3 border-t border-amber-200">
          <p className="text-xs text-amber-700">
            Upgrade to Premium for unlimited groups and trips
          </p>
        </div>
      )}
    </div>
  );
}

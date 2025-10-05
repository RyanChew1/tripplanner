'use client';

import { useAccessControl } from '@/hooks/useAccessControl';
import { useUserLimits } from '@/hooks/useLimits';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function AccessTest() {
  const { 
    userTier, 
    counts, 
    groupLimitReached, 
    tripLimitReached,
    canAccessGroup,
    canAccessTrip,
    canCreateGroup,
    canCreateTrip 
  } = useAccessControl();

  const { isLoading } = useUserLimits();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Control Test</CardTitle>
          <CardDescription>Loading access permissions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Status</CardTitle>
        <CardDescription>Your current usage and access permissions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Tier */}
        <div className="flex items-center justify-between">
          <span className="font-medium">User Tier:</span>
          <Badge variant={userTier === 'premium' ? 'default' : 'secondary'}>
            {userTier}
          </Badge>
        </div>

        {/* Current Usage */}
        <div className="space-y-2">
          <h4 className="font-medium">Current Usage:</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span>Groups:</span>
              <span className="font-mono">{counts.groups}/1</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Trips:</span>
              <span className="font-mono">{counts.trips}/1</span>
            </div>
          </div>
        </div>

        {/* Limits Status */}
        <div className="space-y-2">
          <h4 className="font-medium">Limits Status:</h4>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              {groupLimitReached ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              <span>Groups: {groupLimitReached ? 'Limit Reached' : 'Within Limit'}</span>
            </div>
            <div className="flex items-center space-x-2">
              {tripLimitReached ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              <span>Trips: {tripLimitReached ? 'Limit Reached' : 'Within Limit'}</span>
            </div>
          </div>
        </div>

        {/* Access Permissions */}
        <div className="space-y-2">
          <h4 className="font-medium">Access Permissions:</h4>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              {canAccessGroup('test-group') ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span>Can Access Groups</span>
            </div>
            <div className="flex items-center space-x-2">
              {canAccessTrip('test-trip') ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span>Can Access Trips</span>
            </div>
            <div className="flex items-center space-x-2">
              {canCreateGroup() ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span>Can Create Groups</span>
            </div>
            <div className="flex items-center space-x-2">
              {canCreateTrip() ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span>Can Create Trips</span>
            </div>
          </div>
        </div>

        {/* Warning for users who have surpassed limits */}
        {(groupLimitReached || tripLimitReached) && userTier === 'free' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                Access Restricted - You&apos;ve reached your free tier limits!
              </span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              You cannot access additional groups or trips. Upgrade to Premium to unlock unlimited access.
            </p>
            <div className="mt-2">
              <a 
                href="/billing" 
                className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
              >
                Upgrade to Premium
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useUserLimits } from '@/hooks/useLimits';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SubscriptionPrompt from './SubscriptionPrompt';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock, ArrowLeft } from 'lucide-react';

interface AccessRestrictionProps {
  children: React.ReactNode;
  resourceType: 'groups' | 'trips';
  resourceId?: string;
  className?: string;
}

export default function AccessRestriction({ 
  children, 
  resourceType, 
  resourceId,
  className 
}: AccessRestrictionProps) {
  const { user: currentUser } = useAuth();
  const { 
    userTier, 
    counts, 
    groupLimitReached, 
    tripLimitReached,
    isLoading 
  } = useUserLimits();
  const router = useRouter();

  // Check if user has exceeded their limits
  const isOverLimit = resourceType === 'groups' ? groupLimitReached : tripLimitReached;
  const currentCount = resourceType === 'groups' ? counts.groups : counts.trips;
  const maxCount = 1; // Free users get 1 of each

  // If user is premium, always allow access
  if (userTier === 'premium') {
    return <>{children}</>;
  }

  // If still loading, show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // If user is over limit, show restriction message
  if (isOverLimit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-amber-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-amber-800">
                Access Restricted
              </CardTitle>
              <CardDescription className="text-amber-700">
                You&apos;ve reached the maximum number of {resourceType} for free users.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Usage */}
              <div className="bg-white rounded-lg p-4 border border-amber-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Crown className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">
                      Current {resourceType}: {currentCount}/{maxCount}
                    </span>
                  </div>
                  <div className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                    Limit Reached
                  </div>
                </div>
              </div>

              {/* Upgrade Benefits */}
              <div className="space-y-3">
                <h3 className="font-semibold text-amber-800">Upgrade to Premium for:</h3>
                <ul className="space-y-2 text-sm text-amber-700">
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Unlimited {resourceType}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Advanced trip planning tools</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Priority customer support</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Group collaboration features</span>
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button 
                  onClick={() => router.push('/billing')}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Premium
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/home')}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </div>

              {/* Pricing */}
              <div className="text-center bg-white rounded-lg p-4 border border-amber-200">
                <div className="text-2xl font-bold text-gray-900">$4.99</div>
                <div className="text-sm text-gray-600">per month</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If user is within limits, show the content
  return <>{children}</>;
}

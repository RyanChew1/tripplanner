'use client';

import { useState } from 'react';
import { useUserLimits } from '@/hooks/useLimits';
import SubscriptionPrompt from './SubscriptionPrompt';

interface LimitedActionProps {
  children: React.ReactNode;
  actionType: 'groups' | 'trips';
  onAction: () => void;
  className?: string;
}

export default function LimitedAction({ 
  children, 
  actionType, 
  onAction, 
  className 
}: LimitedActionProps) {
  const { 
    canCreateGroup, 
    canCreateTrip, 
    counts 
  } = useUserLimits();
  
  const [showPrompt, setShowPrompt] = useState(false);

  const canPerformAction = actionType === 'groups' ? canCreateGroup : canCreateTrip;
  const currentCount = actionType === 'groups' ? counts.groups : counts.trips;
  const maxCount = actionType === 'groups' ? 1 : 1; // Free users get 1 of each

  const handleClick = () => {
    if (canPerformAction) {
      onAction();
    } else {
      setShowPrompt(true);
    }
  };

  const handleUpgrade = () => {
    // After successful upgrade, the limits will be updated automatically
    // and the user can perform the action
    onAction();
  };

  return (
    <>
      <div 
        onClick={handleClick}
        className={className}
        style={{ cursor: canPerformAction ? 'pointer' : 'pointer' }}
      >
        {children}
      </div>

      <SubscriptionPrompt
        isOpen={showPrompt}
        onClose={() => setShowPrompt(false)}
        onUpgrade={handleUpgrade}
        limitType={actionType}
        currentCount={currentCount}
        maxCount={maxCount}
      />
    </>
  );
}

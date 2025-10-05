
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGetUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Lock } from 'lucide-react';
import PaymentModal from './PaymentModal';

interface UpgradePromptProps {
  feature: string;
  onUpgrade?: () => void;
}

export default function UpgradePrompt({ feature, onUpgrade }: UpgradePromptProps) {
  const { user: firebaseUser } = useAuth();
  const { data: user } = useGetUser(firebaseUser?.uid || '');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Only show upgrade prompt for free tier users
  if (user?.tier === 'premium') {
    return null;
  }

  const handleUpgrade = () => {
    setShowPaymentModal(true);
  };

  const handleUpgradeSuccess = () => {
    setShowPaymentModal(false);
    if (onUpgrade) {
      onUpgrade();
    }
  };

  return (
    <>
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Crown className="w-5 h-5" />
            Premium Feature
          </CardTitle>
          <CardDescription className="text-amber-700">
            {feature} is available with a Premium subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700">Upgrade to unlock</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-amber-700 border-amber-300">
                $4.99/month
              </Badge>
              <Button 
                onClick={handleUpgrade}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700"
              >
                Upgrade
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handleUpgradeSuccess}
        amount={999} // $9.99 in cents
        priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "price_placeholder"}
      />
    </>
  );
}

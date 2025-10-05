'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Lock, CheckCircle } from 'lucide-react';
import PaymentModal from './booking/PaymentModal';

interface SubscriptionPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
  limitType: 'groups' | 'trips';
  currentCount: number;
  maxCount: number;
}

export default function SubscriptionPrompt({ 
  isOpen, 
  onClose, 
  onUpgrade,
  limitType,
  currentCount,
  maxCount 
}: SubscriptionPromptProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleUpgrade = () => {
    setShowPaymentModal(true);
  };

  const handleUpgradeSuccess = () => {
    setShowPaymentModal(false);
    onClose();
    if (onUpgrade) {
      onUpgrade();
    }
  };

  const getLimitMessage = () => {
    const itemName = limitType === 'groups' ? 'group' : 'trip';
    const itemNamePlural = limitType === 'groups' ? 'groups' : 'trips';
    
    return {
      title: `${itemNamePlural.charAt(0).toUpperCase() + itemNamePlural.slice(1)} Limit Reached`,
      description: `You've reached the maximum of ${maxCount} ${itemName} for free users. Upgrade to Premium for unlimited ${itemNamePlural}.`,
      current: `You currently have ${currentCount} ${itemName}${currentCount !== 1 ? 's' : ''}.`,
    };
  };

  const message = getLimitMessage();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-800">
              <Crown className="w-5 h-5" />
              {message.title}
            </DialogTitle>
            <DialogDescription className="text-amber-700">
              {message.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current usage */}
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span className="text-sm text-amber-700">{message.current}</span>
                  </div>
                  <Badge variant="outline" className="text-amber-700 border-amber-300">
                    {currentCount}/{maxCount}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Premium benefits */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Upgrade to Premium</CardTitle>
                <CardDescription>
                  Unlock unlimited {limitType} and more features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Unlimited {limitType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Advanced trip planning tools</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Priority customer support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Group collaboration features</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">$4.99</div>
              <div className="text-sm text-gray-600">per month</div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Maybe Later
              </Button>
              <Button 
                onClick={handleUpgrade}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                Upgrade Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

       <PaymentModal
         isOpen={showPaymentModal}
         onClose={() => setShowPaymentModal(false)}
         onSuccess={handleUpgradeSuccess}
         amount={499} // $9.99 in cents
         priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "price_placeholder"}
       />
    </>
  );
}

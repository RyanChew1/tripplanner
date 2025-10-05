'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGetUser } from '@/hooks/useUser';
import { useCreateCustomer, useCreateCheckoutSession, processPayment } from '@/hooks/useBilling';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  priceId: string; // Stripe price ID for the premium subscription
}

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  amount, 
  priceId 
}: PaymentModalProps) {
  const { user: firebaseUser } = useAuth();
  const { data: user } = useGetUser(firebaseUser?.uid || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'plan' | 'payment' | 'success'>('plan');
  const [error, setError] = useState<string | null>(null);

  const createCustomerMutation = useCreateCustomer();
  const createCheckoutSessionMutation = useCreateCheckoutSession();

  const handleUpgrade = async () => {
    if (!user) {
      setError('You must be logged in to upgrade');
      return;
    }

    // Check if Stripe is properly configured
    if (!priceId || priceId === 'price_placeholder' || priceId === '' || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setError('Payment system is not configured. Please contact support to enable premium features.');
      return;
    }

    // Check if using placeholder Stripe keys - simulate success in development
    if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes('placeholder')) {
      console.log('Development mode: Simulating successful upgrade');
      setStep('success');
      onSuccess();
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {      
      // Step 1: Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        console.log('Creating new customer...');
        const customerResult = await createCustomerMutation.mutateAsync({
          email: user.email!,
          name: `${user.firstName} ${user.lastName}`,
          userId: user.id!,
        });
        customerId = customerResult.customerId;
        console.log('Customer created:', customerId);
      }

      if (!customerId) {
        throw new Error('Failed to create or retrieve customer ID');
      }

      // Step 2: Create checkout session
      console.log('Creating checkout session...');
      const checkoutResult = await createCheckoutSessionMutation.mutateAsync({
        customerId,
        priceId,
        userId: user.id!,
      });
      console.log('Checkout session created:', checkoutResult.sessionId, 'URL:', checkoutResult.url);

      // Step 3: Redirect to Stripe Checkout
      setStep('payment');
      await processPayment(checkoutResult.url);
    } catch (error) {
      console.error('Payment error:', error);
      
      // Handle different types of errors
      if (error instanceof Error) {
        if (error.message.includes('Payment system is not configured')) {
          setError('Payment system is not configured. Please contact support to enable premium features.');
        } else if (error.message.includes('Invalid price configuration')) {
          setError('Payment configuration error. Please contact support.');
        } else if (error.message.includes('No such price')) {
          setError('Invalid subscription plan. Please contact support.');
        } else {
          setError(error.message);
        }
      } else {
        setError('Payment failed. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep('plan');
    setError(null);
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade to Premium</DialogTitle>
          <DialogDescription>
            Unlock premium features for your trip planning
          </DialogDescription>
        </DialogHeader>

        {step === 'plan' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Premium Plan
                </CardTitle>
                <CardDescription>
                  Full access to all features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{formatCurrency(amount)}</span>
                    <Badge>Monthly</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">What&apos;s included:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Unlimited trip planning
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Advanced flight & hotel search
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Group collaboration features
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Priority customer support
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

             {error && (
               <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                 <AlertCircle className="w-4 h-4 text-red-500" />
                 <span className="text-sm text-red-700">{error}</span>
               </div>
             )}

             {(!priceId || priceId === 'price_placeholder' || priceId === '' || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes('placeholder')) && (
               <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                 <AlertCircle className="w-4 h-4 text-amber-500" />
                 <span className="text-sm text-amber-700">
                   {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes('placeholder') 
                     ? 'Development mode: Payment will be simulated. Set up real Stripe keys for production.'
                     : 'Payment system is not configured. Please set up your Stripe API keys to enable premium features.'
                   }
                 </span>
               </div>
             )}

             <div className="flex gap-2">
               <Button variant="outline" onClick={handleClose} className="flex-1">
                 Cancel
               </Button>
               <Button 
                 onClick={handleUpgrade} 
                 disabled={isProcessing || !priceId || priceId === ''}
                 className="flex-1"
               >
                 {isProcessing ? 'Processing...' : 
                  (!priceId || priceId === '') ? 'Not Available' : 
                  'Upgrade Now'}
               </Button>
             </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold">Processing Payment</h3>
              <p className="text-gray-600">Please complete the payment in the popup window...</p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-800">Payment Successful!</h3>
              <p className="text-gray-600">
                Welcome to Premium! You now have access to all premium features.
              </p>
            </div>
            
            <Button onClick={handleClose} className="w-full">
              Continue
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

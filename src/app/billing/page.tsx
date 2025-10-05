'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGetUser } from '@/hooks/useUser';
import { updateUser } from '@/lib/userService';
import { useBillingInfo, useCancelSubscription, useReactivateSubscription } from '@/hooks/useBilling';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import SubscriptionPrompt from '@/components/SubscriptionPrompt';

export default function BillingPage() {
  const { user: firebaseUser } = useAuth();
  const { data: user } = useGetUser(firebaseUser?.uid || '');
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubscriptionPromptOpen, setIsSubscriptionPromptOpen] = useState(false);

  const { data: billingInfo, isLoading: billingLoading, error: billingError } = useBillingInfo(user?.stripeCustomerId);
  
  const cancelSubscriptionMutation = useCancelSubscription();
  const reactivateSubscriptionMutation = useReactivateSubscription();

  // Check for payment success in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const payment = urlParams.get('payment');
    
    if (payment === 'success') {
      setMessage({ type: 'success', text: 'Payment successful! Your subscription is now active.' });
      // Remove the parameter from URL
      window.history.replaceState({}, '', '/billing');

      // UPDATE USER TIER
      
      // Refresh user data to get updated tier
      if (user?.id) {
        // Invalidate user and billing queries to refetch updated data
        queryClient.invalidateQueries({ queryKey: ['user', user.id] });
        queryClient.invalidateQueries({ queryKey: ['billing-info'] });
      }
    }
  }, [user?.id, queryClient]);

  // Check if user tier matches subscription status and update if needed
  useEffect(() => {
    if (user && billingInfo?.subscription) {
      const hasActiveSubscription = billingInfo.subscription.status === 'active' || billingInfo.subscription.status === 'trialing';
      const shouldBePremium = hasActiveSubscription;
      const currentTier = user.tier;
      
      console.log(`🔍 Checking tier sync: subscription=${billingInfo.subscription.status}, hasActive=${hasActiveSubscription}, currentTier=${currentTier}, shouldBePremium=${shouldBePremium}`);
      
      if (shouldBePremium && currentTier !== 'premium') {
        console.log(`🔄 Updating user ${user.id} tier from ${currentTier} to premium`);
        const updatedUser = { ...user, tier: 'premium' as const };
        updateUser(updatedUser).then(() => {
          queryClient.invalidateQueries({ queryKey: ['user', user.id] });
          console.log(`✅ User ${user.id} tier updated to premium`);
        }).catch((error) => {
          console.error('Error updating user tier:', error);
        });
      } else if (!shouldBePremium && currentTier === 'premium') {
        console.log(`🔄 Updating user ${user.id} tier from ${currentTier} to free`);
        const updatedUser = { ...user, tier: 'free' as const };
        updateUser(updatedUser).then(() => {
          queryClient.invalidateQueries({ queryKey: ['user', user.id] });
          console.log(`✅ User ${user.id} tier updated to free`);
        }).catch((error) => {
          console.error('Error updating user tier:', error);
        });
      } else {
        console.log(`✅ User ${user.id} tier is already correct (${currentTier})`);
      }
    }
  }, [user, billingInfo?.subscription, queryClient]);

  const handleCancelSubscription = async () => {
    if (!billingInfo?.subscription?.id || !user?.id) return;

    setIsLoading(true);
    try {
      await cancelSubscriptionMutation.mutateAsync({
        subscriptionId: billingInfo.subscription.id,
        userId: user.id,
        immediately: false, // Cancel at period end
      });
      setMessage({ type: 'success', text: 'Subscription will be canceled at the end of the current billing period.' });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      setMessage({ type: 'error', text: 'Failed to cancel subscription. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!billingInfo?.subscription?.id) return;

    setIsLoading(true);
    try {
      await reactivateSubscriptionMutation.mutateAsync({
        subscriptionId: billingInfo.subscription.id,
      });
      setMessage({ type: 'success', text: 'Subscription has been reactivated!' });
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      setMessage({ type: 'error', text: 'Failed to reactivate subscription. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Canceled</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Past Due</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (timestamp: number | undefined | null) => {
    if (!timestamp || typeof timestamp !== 'number' || isNaN(timestamp)) {
      return 'N/A';
    }
    try {
      return format(new Date(timestamp * 1000), 'MMM dd, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (billingLoading) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  if (billingError) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Billing</h1>
            <p className="text-gray-600">Unable to load billing information. Please try again later.</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
          <p className="text-gray-600">Manage your subscription and billing information</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <Tabs defaultValue="subscription" className="space-y-6">
          <TabsList>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="subscription" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Current Plan
                </CardTitle>
                <CardDescription>
                  Your current subscription details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {billingInfo?.subscription || user?.tier === 'premium' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Premium Plan</h3>
                        <p className="text-gray-600">Full access to all features</p>
                      </div>
                      {billingInfo?.subscription ? getStatusBadge(billingInfo.subscription.status) : (
                        <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>
                      )}
                    </div>
                    
                    {billingInfo?.subscription && billingInfo.subscription.currentPeriodStart && billingInfo.subscription.currentPeriodEnd && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Current Period</p>
                          <p className="font-medium">
                            {formatDate(billingInfo.subscription.currentPeriodStart)} - {formatDate(billingInfo.subscription.currentPeriodEnd)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Next Billing Date</p>
                          <p className="font-medium">
                            {formatDate(billingInfo.subscription.currentPeriodEnd)}
                          </p>
                        </div>
                      </div>
                    )}

                    {billingInfo?.subscription && (
                      <>
                        {billingInfo.subscription.cancelAtPeriodEnd ? (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                              <span className="font-medium text-yellow-800">Subscription will be canceled</span>
                            </div>
                            <p className="text-yellow-700 text-sm mb-3">
                              Your subscription will end on {billingInfo.subscription.currentPeriodEnd ? formatDate(billingInfo.subscription.currentPeriodEnd) : 'the end of the current period'}. 
                              You&apos;ll continue to have access until then.
                            </p>
                            <Button 
                              onClick={handleReactivateSubscription}
                              disabled={isLoading}
                              variant="outline"
                              size="sm"
                            >
                              Reactivate Subscription
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button 
                              onClick={handleCancelSubscription}
                              disabled={isLoading}
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              Cancel Subscription
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Free Plan</h3>
                    <p className="text-gray-600 mb-4">You&apos;re currently on the free plan with limited features.</p>
                    <Button onClick={() => setIsSubscriptionPromptOpen(true)}>
                      Upgrade to Premium
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment-methods" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>
                  Manage your payment methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                {billingInfo?.paymentMethods && billingInfo.paymentMethods.length > 0 ? (
                  <div className="space-y-4">
                    {billingInfo?.paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium">
                              {method.card?.brand.toUpperCase()} •••• {method.card?.last4}
                            </p>
                            <p className="text-sm text-gray-600">
                              Expires {method.card?.expMonth}/{method.card?.expYear}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">Default</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No payment methods on file</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Invoices
                </CardTitle>
                <CardDescription>
                  Your billing history
                </CardDescription>
              </CardHeader>
              <CardContent>
                {billingInfo?.invoices && billingInfo.invoices.length > 0 ? (
                  <div className="space-y-4">
                    {billingInfo?.invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Invoice #{invoice.number}</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(invoice.created)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(invoice.amountPaid, invoice.currency)}
                          </p>
                          <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No invoices found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </div>
      
      {/* Subscription Prompt */}
      <SubscriptionPrompt 
        isOpen={isSubscriptionPromptOpen}
        onClose={() => setIsSubscriptionPromptOpen(false)}
        limitType="groups"
        currentCount={0}
        maxCount={1}
      />
    </ProtectedLayout>
  );
}

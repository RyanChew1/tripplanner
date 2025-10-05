import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripeService';
import { updateUserTier, getUserByEmail, updateSubscriptionId } from '@/lib/userService';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  console.log('Webhook received:', { 
    hasSignature: !!signature,
    bodyLength: body.length,
    timestamp: new Date().toISOString()
  });

  if (!signature) {
    console.error('No signature provided');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe!.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    console.log('Processing webhook event:', event.type, event.id);
    
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', {
          sessionId: session.id,
          mode: session.mode,
          metadata: session.metadata,
          customer: session.customer
        });
        
        if (session.mode === 'subscription' && session.metadata?.userId) {
          try {
            console.log(`Updating user ${session.metadata.userId} to premium tier`);
            // Update user tier when checkout session is completed
            await updateUserTier(session.metadata.userId, 'premium');
            
            // Get the subscription ID from the session
            if (session.subscription) {
              const subscriptionId = typeof session.subscription === 'string' 
                ? session.subscription 
                : session.subscription.id;
              await updateSubscriptionId(session.metadata.userId, subscriptionId);
              console.log(`✅ User ${session.metadata.userId} upgraded to premium with subscription ${subscriptionId}`);
            } else {
              console.log(`⚠️ No subscription ID found in checkout session for user ${session.metadata.userId}`);
            }
          } catch (error) {
            console.error(`❌ Failed to update user ${session.metadata.userId} tier:`, error);
          }
        } else {
          console.log('Checkout session not for subscription or missing userId metadata');
        }
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.status === 'active') {
          try {
            // Find user by customer ID and update tier
            const customer = await stripe!.customers.retrieve(subscription.customer as string);
            if (customer && 'email' in customer) {
              const user = await getUserByEmail(customer.email!);
              if (user) {
                // Update user tier to premium
                await updateUserTier(user.id!, 'premium');
                // Store subscription ID for future validation
                await updateSubscriptionId(user.id!, subscription.id);
                console.log(`✅ User ${user.id} upgraded to premium with subscription ${subscription.id}`);
              }
            }
          } catch (error) {
            console.error(`❌ Failed to update user tier for subscription ${subscription.id}:`, error);
          }
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        // Find user by customer ID and downgrade tier
        const deletedCustomer = await stripe!.customers.retrieve(deletedSubscription.customer as string);
        if (deletedCustomer && 'email' in deletedCustomer) {
          const user = await getUserByEmail(deletedCustomer.email!);
          if (user) {
            await updateUserTier(user.id!, 'free');
            console.log(`User ${user.id} downgraded to free tier`);
          }
        }
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        // Handle failed payment - you might want to notify the user
        console.log('Payment failed for invoice:', failedInvoice.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

# Stripe Payment Integration Setup

This guide will help you set up Stripe payment processing for your Univo application.

## Prerequisites

1. A Stripe account (create one at [stripe.com](https://stripe.com))
2. Your Firebase project configured
3. Environment variables set up

## Step 1: Stripe Account Setup

1. **Create a Stripe Account**
   - Go to [stripe.com](https://stripe.com) and create an account
   - Complete the account verification process

2. **Get Your API Keys**
   - Go to the Stripe Dashboard
   - Navigate to "Developers" > "API keys"
   - Copy your "Publishable key" and "Secret key"
   - Keep these secure and never commit them to version control

3. **Create a Product and Price**
   - Go to "Products" in your Stripe Dashboard
   - Click "Add product"
   - Name: "Premium Plan"
   - Description: "Full access to all trip planning features"
   - Pricing model: "Recurring"
   - Price: $9.99/month (or your desired price)
   - Copy the Price ID (starts with `price_`)

## Step 2: Environment Variables

**IMPORTANT**: You must create a `.env.local` file in your project root with the following variables. The application will not work without these environment variables.

Create a `.env.local` file in your project root with the following variables:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Firebase Configuration (add your existing Firebase config here)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
```

## Step 3: Webhook Setup

1. **Create a Webhook Endpoint**
   - In your Stripe Dashboard, go to "Developers" > "Webhooks"
   - Click "Add endpoint"
   - Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
   - Events to send:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copy the webhook signing secret

2. **Update Environment Variables**
   - Add the webhook secret to your `.env.local` file

## Step 4: Update Price ID

1. **Find Your Price ID**
   - In Stripe Dashboard, go to "Products"
   - Click on your "Premium Plan" product
   - Copy the Price ID (starts with `price_`)

2. **Update the Code**
   - Open `src/components/booking/PaymentModal.tsx`
   - Replace the `priceId` prop with your actual Stripe Price ID
   - Or create an environment variable for it

## Step 5: Test the Integration

1. **Start Your Development Server**
   ```bash
   npm run dev
   ```

2. **Test Payment Flow**
   - Navigate to the billing page
   - Try to upgrade to premium
   - Use Stripe's test card numbers:
     - Success: `4242 4242 4242 4242`
     - Decline: `4000 0000 0000 0002`

## Step 6: Production Setup

1. **Switch to Live Mode**
   - In Stripe Dashboard, toggle to "Live mode"
   - Get your live API keys
   - Update your environment variables

2. **Update Webhook URL**
   - Change webhook endpoint to your production domain
   - Update the webhook secret

3. **Deploy Your Application**
   - Deploy to your hosting platform
   - Ensure environment variables are set in production

## Features Included

- ✅ User subscription management
- ✅ Automatic tier upgrades/downgrades
- ✅ Billing page with subscription details
- ✅ Payment method management
- ✅ Invoice history
- ✅ Subscription cancellation/reactivation
- ✅ Webhook handling for real-time updates

## Security Notes

- Never expose secret keys in client-side code
- Use environment variables for all sensitive data
- Validate webhook signatures
- Implement proper error handling
- Test thoroughly before going live

## Support

For issues with this integration:
1. Check the Stripe Dashboard for error logs
2. Verify webhook endpoints are working
3. Ensure all environment variables are set correctly
4. Check the browser console for client-side errors

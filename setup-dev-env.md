# Development Environment Setup

## Quick Fix for Stripe Error

If you're getting the error "Neither apiKey nor config.authenticator provided", you need to set up your environment variables.

### Option 1: Create .env.local file (Recommended)

Create a file called `.env.local` in your project root with the following content:

```env
# Stripe Configuration (for development - use test keys)
STRIPE_SECRET_KEY=sk_test_placeholder
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
NEXT_PUBLIC_STRIPE_PRICE_ID=price_placeholder

# Your existing Firebase configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
```

### Option 2: Set environment variables in your terminal

```bash
# Windows (PowerShell)
$env:STRIPE_SECRET_KEY="sk_test_placeholder"
$env:NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_placeholder"
$env:NEXT_PUBLIC_STRIPE_PRICE_ID="price_placeholder"

# Windows (Command Prompt)
set STRIPE_SECRET_KEY=sk_test_placeholder
set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
set NEXT_PUBLIC_STRIPE_PRICE_ID=price_placeholder

# macOS/Linux
export STRIPE_SECRET_KEY="sk_test_placeholder"
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_placeholder"
export NEXT_PUBLIC_STRIPE_PRICE_ID="price_placeholder"
```

## For Production

When you're ready to enable payments, follow the complete setup guide in `STRIPE_SETUP.md` to get your real Stripe API keys.

## What This Fixes

- Prevents the "Neither apiKey nor config.authenticator provided" error
- Allows the application to start without Stripe configuration
- Shows helpful error messages when payment features are used without proper Stripe setup
- Maintains all other functionality (groups, trips, etc.) without payment features

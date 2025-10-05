# Deployment URL Setup for Stripe Redirects

## Problem
The Stripe checkout session is redirecting to `localhost:3000` instead of your deployment domain because the `NEXT_PUBLIC_APP_URL` environment variable is not set.

## Solution

### For Vercel Deployment
If you're using Vercel, the `VERCEL_URL` environment variable is automatically available, and the code will use it. However, for better control, set:

```bash
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
```

### For Other Deployments
Set the `NEXT_PUBLIC_APP_URL` environment variable in your deployment platform:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Environment Variable Setup by Platform

#### Vercel
1. Go to your project dashboard
2. Navigate to Settings > Environment Variables
3. Add: `NEXT_PUBLIC_APP_URL` = `https://your-app-name.vercel.app`

#### Netlify
1. Go to Site settings > Environment variables
2. Add: `NEXT_PUBLIC_APP_URL` = `https://your-site-name.netlify.app`

#### Railway
1. Go to your project dashboard
2. Navigate to Variables tab
3. Add: `NEXT_PUBLIC_APP_URL` = `https://your-app-name.railway.app`

#### Custom Domain
If you have a custom domain, use that instead:
```bash
NEXT_PUBLIC_APP_URL=https://your-custom-domain.com
```

## How It Works

The updated code now:
1. **First** checks for `NEXT_PUBLIC_APP_URL` (your explicit setting)
2. **Then** checks for `VERCEL_URL` (automatic on Vercel)
3. **Finally** falls back to localhost for development

## Testing
After setting the environment variable:
1. Redeploy your application
2. Test the payment flow
3. Verify that successful payments redirect to your domain instead of localhost

## Important Notes
- The environment variable must be set in your deployment platform, not just locally
- Make sure to redeploy after setting the environment variable
- The variable name must be exactly `NEXT_PUBLIC_APP_URL` (case-sensitive)

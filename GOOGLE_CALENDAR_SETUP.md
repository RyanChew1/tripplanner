# Google Calendar Integration Setup

This guide will help you set up Google Calendar integration for the Trip Planner application.

## Prerequisites

- A Google account
- Access to Google Cloud Console
- Your Trip Planner application running locally or deployed

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID for later use

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" user type
   - Fill in required fields (App name, User support email, Developer contact)
   - Add scopes: `https://www.googleapis.com/auth/calendar.events`
   - Add test users if needed

4. For the OAuth client:
   - Application type: "Web application"
   - Name: "Trip Planner Calendar Integration"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback` (for development)
     - `https://your-domain.com/api/auth/google/callback` (for production)

5. Click "Create" and save the Client ID and Client Secret

## Step 4: Configure Environment Variables

Add these variables to your `.env.local` file:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

For production, update the `GOOGLE_REDIRECT_URI` to your production domain.

## Step 5: OAuth Consent Screen Configuration

1. Go to "APIs & Services" > "OAuth consent screen"
2. Configure the following:
   - App name: "Trip Planner"
   - User support email: your email
   - Developer contact: your email
   - Scopes: Add `https://www.googleapis.com/auth/calendar.events`
   - Test users: Add any test accounts that will use the app during development

## Step 6: Verify Setup

1. Start your application: `npm run dev`
2. Navigate to a trip page
3. Click "Export to Google Calendar"
4. You should be redirected to Google's OAuth consent screen
5. After granting permission, you should be redirected back to your app

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" error**
   - Ensure the redirect URI in your OAuth client matches exactly
   - Check for trailing slashes, http vs https, port numbers

2. **"access_denied" error**
   - User denied permission or OAuth consent screen not configured
   - Check that the app is in "Testing" mode and test users are added

3. **"invalid_client" error**
   - Check that Client ID and Client Secret are correct
   - Ensure environment variables are loaded properly

4. **API quota exceeded**
   - Google Calendar API has usage limits
   - Consider implementing rate limiting in your application

### Testing in Production

1. Publish your OAuth consent screen
2. Update redirect URIs to include production domain
3. Update environment variables with production values
4. Test the full OAuth flow in production

## Security Considerations

- Never commit Client Secret to version control
- Use environment variables for all sensitive data
- Consider implementing token encryption for stored refresh tokens
- Regularly rotate credentials
- Monitor API usage and set up alerts for unusual activity

## API Limits

- Google Calendar API has a quota of 1,000,000 requests per day
- Rate limit: 100 requests per 100 seconds per user
- Consider implementing exponential backoff for retries

## Support

For issues with Google Calendar API:
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google Cloud Console Support](https://cloud.google.com/support)

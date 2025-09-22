# Trip Planner - Firebase Authentication Setup

This project includes Firebase authentication with email/password and Google sign-in capabilities.

## Setup Instructions

### 1. Firebase Configuration

1. Go to your Firebase Console (https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > General
4. Scroll down to "Your apps" section
5. Copy the configuration values

### 2. Environment Variables

1. Copy the `.env.local.example` file to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Replace the placeholder values in `.env.local` with your actual Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_actual_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_actual_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_actual_measurement_id
   ```

### 3. Firebase Authentication Setup

1. In Firebase Console, go to Authentication > Sign-in method
2. Enable "Email/Password" provider
3. Enable "Google" provider
4. Configure the Google provider with your domain (for production)

### 4. Run the Application

```bash
npm run dev
```

## Features

- **Email/Password Authentication**: Users can sign up and sign in with email and password
- **Google Sign-In**: Users can sign in with their Google account
- **Protected Routes**: Pages are protected and require authentication
- **User Profile**: Display user information and logout functionality
- **Responsive Design**: Works on desktop and mobile devices

## File Structure

```
src/app/
 contexts/
    AuthContext.tsx          # Authentication context and provider
 components/
    auth/
        AuthComponent.tsx    # Main auth component with login/signup toggle
        LoginForm.tsx        # Login form component
        SignupForm.tsx       # Signup form component
        ProtectedRoute.tsx   # Route protection wrapper
        UserProfile.tsx      # User profile display
        index.ts             # Export file for easy imports
 lib/
    firebase.ts              # Firebase configuration
 layout.tsx                   # Root layout with AuthProvider
 page.tsx                     # Main page with protected content
```

## Usage

The authentication system is automatically integrated into your app. Users will see the login/signup form when not authenticated, and the main dashboard when authenticated.

### Using the Auth Context

```tsx
import { useAuth } from '@/app/contexts/AuthContext';

function MyComponent() {
  const { user, signIn, signUp, signInWithGoogle, logout } = useAuth();
  
  // Use authentication methods and user state
}
```

### Protecting Routes

```tsx
import { ProtectedRoute } from '@/app/components/auth';

function MyPage() {
  return (
    <ProtectedRoute>
      <div>This content is only visible to authenticated users</div>
    </ProtectedRoute>
  );
}
```

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UseGoogleCalendarReturn {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connectGoogleCalendar: () => void;
  exportTripToCalendar: (tripId: string) => Promise<{ success: boolean; message: string; eventsCreated?: number }>;
  disconnectGoogleCalendar: () => Promise<void>;
  checkConnection: () => Promise<void>;
  refreshConnection: () => Promise<void>;
}

export function useGoogleCalendar(): UseGoogleCalendarReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const checkConnection = useCallback(async () => {
    if (!user?.uid) {
      setIsConnected(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/google/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Google Calendar connection status:', data);
        setIsConnected(data.connected);
        
        // If we have tokens but connection failed, log the error
        if (data.hasTokens && !data.connected && data.error) {
          console.warn('Google Calendar connection failed:', data.error);
        }
      } else {
        console.error('Failed to check Google Calendar status:', response.status);
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error checking Google Calendar connection:', error);
      setIsConnected(false);
    }
  }, [user?.uid]);

  const connectGoogleCalendar = useCallback(() => {
    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    try {
      const currentUrl = window.location.href;
      const authUrl = `/api/auth/google?userId=${user.uid}&returnUrl=${encodeURIComponent(currentUrl)}`;
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating Google Calendar connection:', error);
      setError('Failed to initiate Google Calendar connection');
    }
  }, [user?.uid]);

  const exportTripToCalendar = useCallback(async (tripId: string): Promise<{ success: boolean; message: string; eventsCreated?: number }> => {
    if (!user?.uid) {
      return { success: false, message: 'User not authenticated' };
    }

    console.log('Starting export process. Current connection status:', isConnected);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/trips/${tripId}/export-google-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await response.json();
      console.log('Export API response:', { status: response.status, data });

      if (response.ok) {
        // Refresh connection status after successful export
        checkConnection();
        return {
          success: true,
          message: data.message || `Successfully added ${data.eventsCreated} events to your Google Calendar`,
          eventsCreated: data.eventsCreated,
        };
      } else {
        console.log('Export failed with status:', response.status, data);
        if (data.needsAuth) {
          console.log('API indicates needsAuth, but frontend thinks we\'re connected. This suggests a sync issue.');
          // Refresh connection status to sync with backend
          console.log('Refreshing connection status due to sync issue...');
          await checkConnection();
          
          // Redirect to OAuth to refresh tokens
          console.log('Redirecting to OAuth to refresh tokens');
          connectGoogleCalendar();
          return { success: false, message: 'Please reconnect to Google Calendar to refresh your access tokens.' };
        }
        
        return {
          success: false,
          message: data.error || 'Failed to export to Google Calendar',
        };
      }
    } catch (error) {
      console.error('Error exporting trip to Google Calendar:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, connectGoogleCalendar]);

  const disconnectGoogleCalendar = useCallback(async (): Promise<void> => {
    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call API to revoke tokens and clear user data
      const response = await fetch('/api/auth/google/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (response.ok) {
        setIsConnected(false);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to disconnect Google Calendar');
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  const refreshConnection = useCallback(async (): Promise<void> => {
    console.log('Manually refreshing Google Calendar connection status');
    await checkConnection();
  }, [checkConnection]);

  return {
    isConnected,
    isLoading,
    error,
    connectGoogleCalendar,
    exportTripToCalendar,
    disconnectGoogleCalendar,
    checkConnection,
    refreshConnection,
  };
}

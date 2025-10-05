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
        setIsConnected(data.connected);
      } else {
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

      if (response.ok) {
        return {
          success: true,
          message: data.message || `Successfully added ${data.eventsCreated} events to your Google Calendar`,
          eventsCreated: data.eventsCreated,
        };
      } else {
        if (data.needsAuth) {
          // User needs to authenticate with Google Calendar
          connectGoogleCalendar();
          return { success: false, message: 'Please connect to Google Calendar first' };
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

  return {
    isConnected,
    isLoading,
    error,
    connectGoogleCalendar,
    exportTripToCalendar,
    disconnectGoogleCalendar,
    checkConnection,
  };
}

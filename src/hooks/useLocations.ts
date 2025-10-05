import { useQuery } from '@tanstack/react-query';

// Airport Search Hook
export function useAirportSearch(cityCode: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['locations', 'airports', cityCode],
    queryFn: async () => {
      const response = await fetch(`/api/locations/airports?cityCode=${encodeURIComponent(cityCode)}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search airports');
      }
      
      return response.json();
    },
    enabled: enabled && !!cityCode,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

// City Search Hook
export function useCitySearch(keyword: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['locations', 'cities', keyword],
    queryFn: async () => {
      const response = await fetch(`/api/locations/cities?keyword=${encodeURIComponent(keyword)}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search cities');
      }
      
      return response.json();
    },
    enabled: enabled && keyword.length >= 2,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

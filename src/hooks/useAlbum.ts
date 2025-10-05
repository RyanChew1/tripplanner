import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createAlbum, 
  getAlbumByTripId, 
  getAlbumsByGroupId, 
  uploadPhoto, 
  getPhotos, 
  deletePhoto,
  createAlbumIfNotExists 
} from '../lib/albumService';
import { getUserById } from '../lib/userService';
import { CreateAlbumData, UploadPhotoData } from '../types/albums';

// Hook to get album by trip ID
export function useGetAlbumByTripId(tripId: string) {
  return useQuery({
    queryKey: ['album', tripId],
    queryFn: () => getAlbumByTripId(tripId),
    enabled: !!tripId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to get albums by group ID
export function useGetAlbumsByGroupId(groupId: string, tripIds: string[]) {
  return useQuery({
    queryKey: ['albums', groupId, tripIds],
    queryFn: () => getAlbumsByGroupId(groupId, tripIds),
    enabled: !!groupId && tripIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to get photos in an album
export function useGetPhotos(albumId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['photos', albumId],
    queryFn: () => getPhotos(albumId),
    enabled: !!albumId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook to check if all group members are premium
export function useCheckAllMembersPremium(memberIds: string[]) {
  return useQuery({
    queryKey: ['allMembersPremium', memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return true;
      
      const userPromises = memberIds.map(id => getUserById(id));
      const users = await Promise.all(userPromises);
      
      // Filter out null users and check if all are premium
      const validUsers = users.filter(user => user !== null);
      return validUsers.length > 0 && validUsers.every(user => user.tier === 'premium');
    },
    enabled: memberIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to create album
export function useCreateAlbum() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateAlbumData) => createAlbum(data),
    onSuccess: (albumId, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      queryClient.invalidateQueries({ queryKey: ['album', variables.tripId] });
    },
  });
}

// Hook to upload photo
export function useUploadPhoto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UploadPhotoData) => {
      // Create album if it doesn't exist
      const albumId = await createAlbumIfNotExists(data.albumId, data.userId);
      
      // Upload photo to the album
      return uploadPhoto({ ...data, albumId });
    },
    onSuccess: (photo, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['photos', photo.albumId] });
      queryClient.invalidateQueries({ queryKey: ['album', photo.albumId] });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
    },
  });
}

// Hook to delete photo
export function useDeletePhoto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ photoId, albumId, userId }: { photoId: string; albumId: string; userId: string }) => 
      deletePhoto(photoId, albumId, userId),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['photos', variables.albumId] });
      queryClient.invalidateQueries({ queryKey: ['album', variables.albumId] });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
    },
  });
}

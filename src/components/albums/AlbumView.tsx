"use client";

import React, { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  Upload, 
  X, 
  Download, 
  Trash2, 
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Search,
  X as XIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGetPhotos, useUploadPhoto, useDeletePhoto } from '@/hooks/useAlbum';
import { Photo } from '@/types/albums';

interface AlbumViewProps {
  albumId: string;
  tripId: string;
  isAllMembersPremium: boolean;
}

export default function AlbumView({ albumId, tripId, isAllMembersPremium }: AlbumViewProps) {
  const { user: currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actualAlbumId, setActualAlbumId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Check if we have a real album ID (not just tripId)
  const isAlbumCreated = albumId !== tripId;
  const currentAlbumId = actualAlbumId || albumId;
  
  // Fetch photos from the actual album ID if it exists
  const { data: photos = [], isLoading: photosLoading, error: photosError } = useGetPhotos(currentAlbumId, {
    enabled: isAlbumCreated || !!actualAlbumId
  });
  
  // If no album exists yet, we'll show empty state until upload creates one
  const allPhotos = (isAlbumCreated || actualAlbumId) ? photos : [];
  const isLoading = (isAlbumCreated || actualAlbumId) ? photosLoading : false;
  
  // Filter photos by caption search query
  const displayPhotos = useMemo(() => {
    if (!searchQuery.trim()) {
      return allPhotos;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return allPhotos.filter(photo => 
      photo.caption?.toLowerCase().includes(query)
    );
  }, [allPhotos, searchQuery]);
  
  const uploadPhotoMutation = useUploadPhoto();
  const deletePhotoMutation = useDeletePhoto();
  
  // Handle upload success to track the actual album ID
  React.useEffect(() => {
    if (uploadPhotoMutation.isSuccess && uploadPhotoMutation.data) {
      const photo = uploadPhotoMutation.data;
      if (photo.albumId && photo.albumId !== tripId) {
        console.log('Upload successful, setting actual album ID:', photo.albumId);
        setActualAlbumId(photo.albumId);
      }
    }
  }, [uploadPhotoMutation.isSuccess, uploadPhotoMutation.data, tripId]);

  const handleFileSelect = () => {
    if (!isAllMembersPremium) return;
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser?.uid) return;

    // Clear the file input immediately to prevent re-upload attempts
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setIsUploading(true);
    setUploadError(null); // Clear previous errors
    
    try {
      // Always use tripId for upload - the uploadPhoto function will handle album creation/lookup
      await uploadPhotoMutation.mutateAsync({
        file,
        albumId: tripId, // Always use tripId - uploadPhoto will find/create the correct album
        userId: currentUser.uid,
        caption: uploadCaption.trim() || undefined
      });
      setUploadCaption('');
    } catch (error) {
      console.error('Error uploading photo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed. Please try again.';
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photo: Photo) => {
    if (!currentUser?.uid) return;
    
    if (confirm('Are you sure you want to delete this photo?')) {
      try {
        await deletePhotoMutation.mutateAsync({
          photoId: photo.photoId,
          albumId,
          userId: currentUser.uid
        });
      } catch (error) {
        console.error('Error deleting photo:', error);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isAllMembersPremium) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <AlertCircle className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Premium Feature
        </h3>
        <p className="text-gray-600 text-center max-w-md">
          All users need premium plan to use photo albums. 
          Upgrade your plan to start sharing memories with your group.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading photos...</span>
      </div>
    );
  }

  if (photosError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-red-600">Error loading photos. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="p-6">
        <div className="flex items-center space-x-4">
          <Button 
            onClick={handleFileSelect}
            disabled={isUploading}
            className="flex items-center space-x-2"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>{isUploading ? 'Uploading...' : 'Upload Photo'}</span>
          </Button>
          
          <Input
            placeholder="Add a caption (optional)"
            value={uploadCaption}
            onChange={(e) => setUploadCaption(e.target.value)}
            className="flex-1"
          />
        </div>
        
        {/* Error Display */}
        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">{uploadError}</span>
            </div>
            {uploadError.includes('CORS') && (
              <div className="mt-2 text-xs text-red-600">
                This is a Firebase Storage configuration issue. Please contact your administrator.
              </div>
            )}
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </Card>

      {/* Search Section */}
      {allPhotos.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search photos by caption..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-600">
              {displayPhotos.length} photo{displayPhotos.length !== 1 ? 's' : ''} found
            </p>
          )}
        </Card>
      )}

      {/* Photos Grid */}
      {displayPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <ImageIcon className="h-16 w-16 text-gray-400 mb-4" />
          {searchQuery ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No photos found
              </h3>
              <p className="text-gray-600 text-center">
                No photos match your search for &quot;{searchQuery}&quot;. Try a different search term.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No photos yet
              </h3>
              <p className="text-gray-600 text-center">
                Upload your first photo to start building your trip album.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayPhotos.map((photo) => (
            <Card key={photo.photoId} className="overflow-hidden group">
              <div className="relative">
                <img
                  src={photo.imageUrl}
                  alt={photo.caption || 'Trip photo'}
                  className="w-full h-48 object-cover cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                />
                
                {/* Delete button for photo owner */}
                {photo.ownerId === currentUser?.uid && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo);
                    }}
                    disabled={deletePhotoMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {photo.caption && (
                <div className="p-3">
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {photo.caption}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Photo Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4">
              <img
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.caption || 'Trip photo'}
                className="w-full max-h-96 object-contain"
              />
              
              {selectedPhoto.caption && (
                <p className="mt-4 text-gray-700">{selectedPhoto.caption}</p>
              )}
              
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>
                  Uploaded {selectedPhoto.createdAt.toLocaleDateString()}
                </span>
                {selectedPhoto.fileSize && (
                  <span>{formatFileSize(selectedPhoto.fileSize)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  X as XIcon,
  Share2,
  Instagram,
  MessageCircle,
  Copy,
  ExternalLink
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
  const allPhotos = useMemo(() => {
    return (isAlbumCreated || actualAlbumId) ? photos : [];
  }, [isAlbumCreated, actualAlbumId, photos]);
  
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

  // Sharing functionality
  const handleDownloadPhoto = async (photo: Photo) => {
    try {
      // Method 1: Try to fetch and download the image as a blob
      try {
        const response = await fetch(photo.imageUrl, {
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Accept': 'image/*'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        // Create a download link with the blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `trip-photo-${photo.photoId}.jpg`;
        link.style.display = 'none';
        
        // Add to DOM, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);
        
        return;
      } catch (fetchError) {
        console.warn('Direct fetch failed, trying alternative method:', fetchError);
      }

      // Method 2: Try using Firebase Storage download URL with proper parameters
      try {
        let downloadUrl = photo.imageUrl;
        
        // For Firebase Storage URLs, try different download approaches
        if (photo.imageUrl.includes('firebasestorage.googleapis.com')) {
          // Try adding download parameters for Firebase Storage
          const url = new URL(photo.imageUrl);
          url.searchParams.set('alt', 'media');
          url.searchParams.set('dl', '1'); // Force download
          downloadUrl = url.toString();
        }
        
        const response = await fetch(downloadUrl, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'image/*',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `trip-photo-${photo.photoId}.jpg`;
          link.style.display = 'none';
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 100);
          
          return;
        }
      } catch (proxyError) {
        console.warn('Firebase Storage method failed:', proxyError);
      }

      // Method 3: Try using a more direct approach with proper download attributes
      try {
        // Create a temporary link with download attribute
        const link = document.createElement('a');
        link.href = photo.imageUrl;
        link.download = `trip-photo-${photo.photoId}.jpg`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';
        
        // Add to DOM, trigger click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Also try with a small delay to ensure the download starts
        setTimeout(() => {
          // If the above didn't work, try opening in new tab as fallback
          const newWindow = window.open(photo.imageUrl, '_blank');
          if (newWindow) {
            setTimeout(() => {
              newWindow.close();
            }, 2000);
          }
        }, 100);
        
        return;
      } catch (directError) {
        console.warn('Direct download method failed:', directError);
      }

      // Method 4: Final fallback - open in new tab with download instructions
      const newWindow = window.open(photo.imageUrl, '_blank');
      if (newWindow) {
        // Show instructions for manual download
        setTimeout(() => {
          alert('Image opened in new tab. Right-click on the image and select "Save image as..." to download it to your device.');
        }, 1000);
      } else {
        throw new Error('Unable to open image');
      }
      
    } catch (error) {
      console.error('Error downloading photo:', error);
      // Final fallback - show user instructions
      alert(`Unable to download automatically. Please:\n\n1. Right-click on the image and select "Save image as..."\n2. Or copy this URL and paste it in a new tab: ${photo.imageUrl}`);
    }
  };

  const handleCopyLink = async (photo: Photo) => {
    try {
      await navigator.clipboard.writeText(photo.imageUrl);
      alert('Photo link copied to clipboard!');
    } catch (error) {
      console.error('Error copying link:', error);
      // Fallback for older browsers or when clipboard API fails
      try {
        const textArea = document.createElement('textarea');
        textArea.value = photo.imageUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          alert('Photo link copied to clipboard!');
        } else {
          throw new Error('Copy command failed');
        }
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
        // Final fallback - show the URL to the user
        const userConfirmed = confirm(`Unable to copy to clipboard automatically. The photo URL is:\n\n${photo.imageUrl}\n\nClick OK to select and copy it manually.`);
        if (userConfirmed) {
          const textArea = document.createElement('textarea');
          textArea.value = photo.imageUrl;
          textArea.style.position = 'fixed';
          textArea.style.left = '50%';
          textArea.style.top = '50%';
          textArea.style.transform = 'translate(-50%, -50%)';
          textArea.style.zIndex = '9999';
          textArea.style.width = '300px';
          textArea.style.height = '100px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          setTimeout(() => {
            document.body.removeChild(textArea);
          }, 5000);
        }
      }
    }
  };

  const handleInstagramShare = () => {
    // Instagram doesn't support direct URL sharing, so we'll open Instagram in a new tab
    // Users can then manually upload the photo
    window.open('https://www.instagram.com/', '_blank');
  };

  const handleNativeShare = async (photo: Photo) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Trip Photo',
          text: photo.caption || 'Check out this photo from my trip!',
          url: photo.imageUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copy link
      handleCopyLink(photo);
    }
  };

  const handleMessagesShare = (photo: Photo) => {
    // For mobile devices, this will open the default messaging app
    const text = encodeURIComponent(photo.caption ? `Check out this photo: ${photo.caption}` : 'Check out this photo from my trip!');
    const url = encodeURIComponent(photo.imageUrl);
    window.open(`sms:?body=${text}%20${url}`, '_blank');
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
                
                {/* Action buttons */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                  {/* Share button for all users */}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-white bg-black bg-opacity-50 hover:bg-opacity-70"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhoto(photo);
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  
                  {/* Delete button for photo owner */}
                  {photo.ownerId === currentUser?.uid && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-white"
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

              {/* Sharing Buttons */}
              <div className="mt-6 border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Share this photo</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* Native Share (Mobile) */}
                  {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNativeShare(selectedPhoto)}
                      className="flex items-center space-x-2"
                    >
                      <Share2 className="h-4 w-4" />
                      <span>Share</span>
                    </Button>
                  )}
                  
                  {/* Download */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPhoto(selectedPhoto)}
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </Button>
                  
                  {/* Copy Link */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(selectedPhoto)}
                    className="flex items-center space-x-2"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy Link</span>
                  </Button>
                  
                  {/* Instagram */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInstagramShare()}
                    className="flex items-center space-x-2"
                  >
                    <Instagram className="h-4 w-4" />
                    <span>Instagram</span>
                  </Button>
                  
                  {/* Messages */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMessagesShare(selectedPhoto)}
                    className="flex items-center space-x-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Messages</span>
                  </Button>
                  
                  {/* Open in New Tab */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedPhoto.imageUrl, '_blank')}
                    className="flex items-center space-x-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Open</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

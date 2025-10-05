"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Image as ImageIcon, 
  Users, 
  ArrowRight,
  AlertCircle 
} from 'lucide-react';
import { Album, Photo } from '@/types/albums';
import { useRouter } from 'next/navigation';

interface AlbumCardProps {
  album: Album;
  photos: Photo[];
  tripName: string;
  isAllMembersPremium: boolean;
}

export default function AlbumCard({ album, photos, tripName, isAllMembersPremium }: AlbumCardProps) {
  const router = useRouter();
  
  const handleClick = () => {
    if (!isAllMembersPremium) return;
    router.push(`/trips/${album.tripId}?tab=album`);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getThumbnailPhotos = () => {
    return photos.slice(0, 4);
  };

  const getRemainingCount = () => {
    return Math.max(0, photos.length - 3);
  };

  return (
    <Card 
      className={`overflow-hidden transition-all duration-200 ${
        isAllMembersPremium 
          ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' 
          : 'opacity-60 cursor-not-allowed'
      }`}
      onClick={handleClick}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 mb-1">
              {tripName}
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              {album.description || 'Trip photo album'}
            </p>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(album.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <ImageIcon className="h-3 w-3" />
                <span>{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          
          {isAllMembersPremium && (
            <ArrowRight className="h-5 w-5 text-gray-400" />
          )}
        </div>

        {/* Premium Restriction Message */}
        {!isAllMembersPremium && (
          <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              All users need premium plan to use photo albums
            </span>
          </div>
        )}

        {/* Photo Thumbnails */}
        {photos.length > 0 ? (
          <div className="grid grid-cols-4 gap-1">
            {getThumbnailPhotos().map((photo, index) => (
              <div key={photo.photoId} className="relative">
                <img
                  src={photo.imageUrl}
                  alt={photo.caption || 'Trip photo'}
                  className="w-full h-16 object-cover rounded"
                />
                {index === 3 && getRemainingCount() > 0 && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                    <span className="text-white text-xs font-medium">
                      +{getRemainingCount()}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <ImageIcon className="h-8 w-8 mb-2" />
            <p className="text-sm">No photos yet</p>
          </div>
        )}
      </div>
    </Card>
  );
}

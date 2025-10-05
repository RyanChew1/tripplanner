export interface Album {
  albumId: string;
  ownerId: string;
  tripId: string;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt?: Date;
  photoCount?: number;
}

export interface Photo {
  photoId: string;
  albumId: string;
  ownerId: string;
  imageUrl: string;
  caption?: string;
  createdAt: Date;
  fileName?: string;
  fileSize?: number;
}

export interface UploadPhotoData {
  file: File;
  albumId: string;
  userId: string;
  caption?: string;
}

export interface CreateAlbumData {
  tripId: string;
  ownerId: string;
  title: string;
  description?: string;
}

export interface AlbumWithPhotos extends Album {
  photos: Photo[];
}

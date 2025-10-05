import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from './firebase';
import { Album, Photo, CreateAlbumData, UploadPhotoData } from '../types/albums';

// Create a new album
export async function createAlbum(data: CreateAlbumData): Promise<string> {
  try {
    const albumData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      photoCount: 0
    };

    const docRef = await addDoc(collection(db, 'albums'), albumData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating album:', error);
    throw error;
  }
}

// Get album by trip ID
export async function getAlbumByTripId(tripId: string): Promise<Album | null> {
  try {
    const albumsRef = collection(db, 'albums');
    const q = query(albumsRef, where('tripId', '==', tripId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const albumDoc = querySnapshot.docs[0];
    const albumData = albumDoc.data();
    
    return {
      albumId: albumDoc.id,
      ...albumData,
      createdAt: albumData.createdAt?.toDate() || new Date(),
      updatedAt: albumData.updatedAt?.toDate(),
    } as Album;
  } catch (error) {
    console.error('Error fetching album by trip ID:', error);
    throw error;
  }
}

// Get all albums for a group's trips
export async function getAlbumsByGroupId(groupId: string, tripIds: string[]): Promise<Album[]> {
  try {
    if (tripIds.length === 0) {
      return [];
    }

    const albumsRef = collection(db, 'albums');
    const q = query(albumsRef, where('tripId', 'in', tripIds), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        albumId: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
      } as Album;
    });
  } catch (error) {
    console.error('Error fetching albums by group ID:', error);
    throw error;
  }
}

// Upload photo to album
export async function uploadPhoto(data: UploadPhotoData): Promise<Photo> {
  try {
    const { file, albumId, userId, caption } = data;
    
    console.log('Starting photo upload:', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type,
      albumId, 
      userId 
    });
    
    // Generate unique photo ID
    const photoId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileExtension = file.name.split('.').pop();
    const fileName = `${photoId}.${fileExtension}`;
    
    // Upload to Firebase Storage
    const storagePath = `users/${userId}/albums/${albumId}/${fileName}`;
    console.log('Storage path:', storagePath);
    
    const storageRef = ref(storage, storagePath);
    console.log('Storage ref created, uploading bytes...');
    
    try {
      await uploadBytes(storageRef, file);
      console.log('Upload successful, getting download URL...');
    } catch (uploadError) {
      console.error('Upload failed:', uploadError);
      console.error('Storage bucket:', storage.app.options.storageBucket);
      console.error('Storage ref:', storageRef.toString());
      
      // Check if it's a CORS error
      if (uploadError instanceof Error && uploadError.message.includes('CORS')) {
        throw new Error('CORS error: Firebase Storage bucket needs to be configured for web uploads. Please check Firebase Console Storage settings.');
      }
      
      // Check if it's a permission error
      if (uploadError instanceof Error && (uploadError.message.includes('permission') || uploadError.message.includes('unauthorized'))) {
        throw new Error('Permission denied: Please check Firebase Storage security rules.');
      }
      
      throw new Error(`Upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
    }
    
    // Get download URL
    const imageUrl = await getDownloadURL(storageRef);
    console.log('Download URL obtained:', imageUrl);
    
    // Save photo metadata to Firestore
    const photoData = {
      photoId,
      albumId,
      ownerId: userId,
      imageUrl,
      caption: caption || '',
      fileName: file.name,
      fileSize: file.size,
      createdAt: serverTimestamp()
    };
    
    await addDoc(collection(db, 'albums', albumId, 'photos'), photoData);
    
    // Update album photo count
    const albumRef = doc(db, 'albums', albumId);
    await updateDoc(albumRef, {
      photoCount: await getPhotoCount(albumId),
      updatedAt: serverTimestamp()
    });
    
    return {
      photoId,
      albumId,
      ownerId: userId,
      imageUrl,
      caption: caption || '',
      fileName: file.name,
      fileSize: file.size,
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error uploading photo:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as { code?: string })?.code,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Get all photos in an album
export async function getPhotos(albumId: string): Promise<Photo[]> {
  try {
    console.log('getPhotos called with albumId:', albumId);
    const photosRef = collection(db, 'albums', albumId, 'photos');
    const q = query(photosRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    console.log('getPhotos query result:', {
      albumId,
      docsCount: querySnapshot.docs.length,
      docs: querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
    });
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        photoId: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date()
      } as Photo;
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
    throw error;
  }
}

// Delete a photo
export async function deletePhoto(photoId: string, albumId: string, userId: string): Promise<void> {
  try {
    // Get photo data to find the storage path
    const photoRef = doc(db, 'albums', albumId, 'photos', photoId);
    const photoDoc = await getDoc(photoRef);
    
    if (!photoDoc.exists()) {
      throw new Error('Photo not found');
    }
    
    const photoData = photoDoc.data();
    
    // Delete from Firebase Storage
    const storageRef = ref(storage, `users/${userId}/albums/${albumId}/${photoData.fileName}`);
    await deleteObject(storageRef);
    
    // Delete from Firestore
    await deleteDoc(photoRef);
    
    // Update album photo count
    const albumRef = doc(db, 'albums', albumId);
    await updateDoc(albumRef, {
      photoCount: await getPhotoCount(albumId),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
}

// Helper function to get photo count
async function getPhotoCount(albumId: string): Promise<number> {
  try {
    const photosRef = collection(db, 'albums', albumId, 'photos');
    const querySnapshot = await getDocs(photosRef);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting photo count:', error);
    return 0;
  }
}

// Create album if it doesn't exist (for on-demand creation)
export async function createAlbumIfNotExists(tripId: string, ownerId: string): Promise<string> {
  try {
    console.log('createAlbumIfNotExists called:', { tripId, ownerId });
    const existingAlbum = await getAlbumByTripId(tripId);
    if (existingAlbum) {
      console.log('Existing album found:', existingAlbum.albumId);
      return existingAlbum.albumId;
    }
    
    console.log('Creating new album for trip:', tripId);
    const albumId = await createAlbum({
      tripId,
      ownerId,
      title: `Trip Photos`,
      description: `Photo album for this trip`
    });
    console.log('New album created with ID:', albumId);
    return albumId;
  } catch (error) {
    console.error('Error creating album if not exists:', error);
    throw error;
  }
}

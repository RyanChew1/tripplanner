'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUser, getUserById } from '@/lib/userService';
import { User } from '@/types/users';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to convert Firebase User to our User type
const createUserFromFirebaseUser = (firebaseUser: FirebaseUser): User => {
  const displayName = firebaseUser.displayName || '';
  const nameParts = displayName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    id: firebaseUser.uid,
    firstName,
    lastName,
    email: firebaseUser.email || '',
    tier: 'free',
    image: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    home: '',
    bucketListLocationIds: [],
    bucketListActivities: [],
    pinnedGroups: [],
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // If user is authenticated, check if user document exists
      if (firebaseUser) {
        try {
          // Check if user document already exists
          const existingUser = await getUserById(firebaseUser.uid);
          
          // Only create user document if it doesn't exist
          if (!existingUser) {
            const userDoc = createUserFromFirebaseUser(firebaseUser);
            await createUser(userDoc);
          }
        } catch (error) {
          // If getUserById fails, it might mean the user doesn't exist
          // In that case, create the user document
          try {
            const userDoc = createUserFromFirebaseUser(firebaseUser);
            await createUser(userDoc);
          } catch (createError) {
            console.error('Error creating user document:', createError);
          }
        }
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/home');
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const displayName = `${firstName} ${lastName}`.trim();
      
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
        
        // Create user document with the provided first and last names
        const userDoc: User = {
          id: userCredential.user.uid,
          firstName,
          lastName,
          email: userCredential.user.email || '',
          tier: 'free',
          image: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          home: '',
          bucketListLocationIds: [],
          bucketListActivities: [],
          pinnedGroups: [],
        };
        
        await createUser(userDoc);
        router.push('/home');
      }
    } catch (error) {
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/home');
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

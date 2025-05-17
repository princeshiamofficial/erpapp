
"use client";

import type { User } from '@/types';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getUserByEmail, seedInitialAdminUser, updateUserAvatarInFirestore, getUserById } from '@/lib/user-service'; // Import Firestore user service

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserAvatar: (avatarUrl: string | null) => Promise<boolean>; // For current user updating own avatar, allow null for removal
  refreshCurrentUser: () => Promise<void>; // To refresh user data from Firestore
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Ensure initial admin user seeding is attempted and awaited.
        // This is crucial for the first run to prevent login before admin exists.
        await seedInitialAdminUser();

        const storedUserJson = localStorage.getItem('colorhut-user');
        if (storedUserJson) {
          try {
            const storedUser = JSON.parse(storedUserJson) as User;
            // Validate against Firestore or ensure fields are present
            if (storedUser && storedUser.id) {
              // Fetch the latest user data from Firestore to ensure it's up-to-date
              const firestoreUser = await getUserById(storedUser.id);
              if (firestoreUser) {
                const { password, ...userToStore } = firestoreUser;
                setCurrentUser(userToStore as User);
              } else {
                // User in localStorage not found in Firestore, clear it
                localStorage.removeItem('colorhut-user');
                setCurrentUser(null);
              }
            } else {
              // Invalid user object in localStorage
              localStorage.removeItem('colorhut-user');
              setCurrentUser(null);
            }
          } catch (error) {
            console.error("Failed to parse or validate stored user:", error);
            localStorage.removeItem('colorhut-user');
            setCurrentUser(null);
          }
        }
      } catch (seedError) {
        console.error("Error during initial admin user seeding:", seedError);
        // Depending on app requirements, you might want to handle this more gracefully
      } finally {
        setIsLoading(false); // All initial async setup is done
      }
    };

    initializeAuth();
  }, []); // Empty dependency array ensures this runs once on mount

  const login = async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true); // Indicate loading during login attempt
    const userFromDb = await getUserByEmail(email);
    
    if (userFromDb && userFromDb.password === pass) { // Still using plain text password for demo
      const { password, ...userToStore } = userFromDb;
      setCurrentUser(userToStore as User);
      localStorage.setItem('colorhut-user', JSON.stringify(userToStore));
      router.push('/dashboard');
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('colorhut-user');
    router.push('/login');
  };

  const updateUserAvatar = async (avatarUrl: string | null): Promise<boolean> => {
    if (!currentUser || !currentUser.id) return false;
    // No global isLoading toggle here, as this is a specific action, not initial load
    
    const success = await updateUserAvatarInFirestore(currentUser.id, avatarUrl);

    if (success) {
      // Ensure avatarUrl in User type can be string | null | undefined for flexibility
      // If User.avatarUrl is `string | undefined`, and Firestore stores null, then `null` becomes `undefined` here.
      const updatedUser = { ...currentUser, avatarUrl: avatarUrl ?? undefined };
      setCurrentUser(updatedUser);
      localStorage.setItem('colorhut-user', JSON.stringify(updatedUser));
    }
    return success;
  };

  const refreshCurrentUser = async () => {
    if (currentUser && currentUser.id) {
      // Consider a specific loading state for refresh if needed, not global setIsLoading
      const firestoreUser = await getUserById(currentUser.id);
      if (firestoreUser) {
        const { password, ...userToStore } = firestoreUser;
        setCurrentUser(userToStore as User);
        localStorage.setItem('colorhut-user', JSON.stringify(userToStore));
      } else {
        // User might have been deleted, log them out
        logout();
      }
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, updateUserAvatar, refreshCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

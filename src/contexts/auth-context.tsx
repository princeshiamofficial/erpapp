
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
  updateUserAvatar: (avatarUrl: string) => Promise<boolean>; // For current user updating own avatar
  refreshCurrentUser: () => Promise<void>; // To refresh user data from Firestore
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Seed initial admin user if not present in Firestore.
    // This is a good place for one-time setup.
    seedInitialAdminUser();

    const storedUserJson = localStorage.getItem('colorhut-user');
    if (storedUserJson) {
      try {
        const storedUser = JSON.parse(storedUserJson) as User;
        // Validate against Firestore or ensure fields are present
        if (storedUser && storedUser.id) {
          // Fetch the latest user data from Firestore to ensure it's up-to-date
          getUserById(storedUser.id).then(firestoreUser => {
            if (firestoreUser) {
              const { password, ...userToStore } = firestoreUser;
              setCurrentUser(userToStore as User);
            } else {
              // User in localStorage not found in Firestore, clear it
              localStorage.removeItem('colorhut-user');
            }
            setIsLoading(false);
          });
        } else {
          localStorage.removeItem('colorhut-user');
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem('colorhut-user');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    const userFromDb = await getUserByEmail(email);
    setIsLoading(false);

    if (userFromDb && userFromDb.password === pass) { // Still using plain text password for demo
      const { password, ...userToStore } = userFromDb;
      setCurrentUser(userToStore as User);
      localStorage.setItem('colorhut-user', JSON.stringify(userToStore));
      router.push('/dashboard');
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('colorhut-user');
    router.push('/login');
  };

  const updateUserAvatar = async (avatarUrl: string | null): Promise<boolean> => { // Allow null for removal
    if (!currentUser || !currentUser.id) return false;
    setIsLoading(true);
    
    const success = await updateUserAvatarInFirestore(currentUser.id, avatarUrl);

    if (success) {
      const updatedUser = { ...currentUser, avatarUrl: avatarUrl ?? undefined };
      setCurrentUser(updatedUser);
      localStorage.setItem('colorhut-user', JSON.stringify(updatedUser));
    }
    setIsLoading(false);
    return success;
  };

  const refreshCurrentUser = async () => {
    if (currentUser && currentUser.id) {
      setIsLoading(true);
      const firestoreUser = await getUserById(currentUser.id);
      if (firestoreUser) {
        const { password, ...userToStore } = firestoreUser;
        setCurrentUser(userToStore as User);
        localStorage.setItem('colorhut-user', JSON.stringify(userToStore));
      } else {
        // User might have been deleted, log them out
        logout();
      }
      setIsLoading(false);
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

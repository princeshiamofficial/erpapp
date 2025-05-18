
"use client";

import type { User } from '@/types';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getUserByEmail, seedInitialAdminUser, updateUserAvatarInFirestore, getUserById } from '@/lib/user-service'; 
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserAvatar: (avatarUrl: string | null) => Promise<boolean>;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const initializeAuth = async () => {
      console.log("AuthContext: Initializing auth...");
      try {
        await seedInitialAdminUser(); // Ensures admin exists or is created/updated in Firestore
        console.log("AuthContext: Initial admin user seeding/validation attempted.");

        const storedUserJson = localStorage.getItem('colorhut-user');
        if (storedUserJson) {
          console.log("AuthContext: Found user in localStorage.");
          try {
            const storedUser = JSON.parse(storedUserJson) as User;
            if (storedUser && storedUser.id) {
              console.log(`AuthContext: Validating stored user ID: ${storedUser.id} against Firestore.`);
              const firestoreUser = await getUserById(storedUser.id);
              if (firestoreUser) {
                if (firestoreUser.isBanned) {
                  console.log("AuthContext: Stored user is banned. Clearing localStorage and logging out.");
                  localStorage.removeItem('colorhut-user');
                  setCurrentUser(null);
                } else {
                  console.log("AuthContext: Stored user validated against Firestore and not banned. Setting current user.");
                  const { password, ...userToStore } = firestoreUser;
                  setCurrentUser(userToStore as User);
                }
              } else {
                console.log("AuthContext: Stored user NOT found in Firestore. Clearing localStorage.");
                localStorage.removeItem('colorhut-user');
                setCurrentUser(null);
              }
            } else {
              console.log("AuthContext: Invalid user object in localStorage. Clearing.");
              localStorage.removeItem('colorhut-user');
              setCurrentUser(null);
            }
          } catch (error) {
            console.error("AuthContext: Failed to parse or validate stored user:", error);
            localStorage.removeItem('colorhut-user');
            setCurrentUser(null);
          }
        } else {
          console.log("AuthContext: No user found in localStorage.");
        }
      } catch (seedError) {
        console.error("AuthContext: Error during initial admin user seeding phase:", seedError);
      } finally {
        console.log("AuthContext: Initialization complete. Setting isLoading to false.");
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    console.log(`AuthContext: Login attempt for email: ${email}`);
    setIsLoading(true);
    const userFromDb = await getUserByEmail(email);
    
    if (userFromDb) {
      console.log(`AuthContext: User found in DB for email ${email}:`, { id: userFromDb.id, role: userFromDb.role, isBanned: userFromDb.isBanned });
      if (userFromDb.password === pass) {
        if (userFromDb.isBanned) {
          console.log("AuthContext: Login failed. User is banned.");
          toast({
            title: "Login Failed",
            description: "Your account has been suspended. Please contact an administrator.",
            variant: "destructive",
            duration: 7000,
          });
          setIsLoading(false);
          return false;
        }
        console.log("AuthContext: Password matches and user not banned. Login successful.");
        const { password, ...userToStore } = userFromDb;
        setCurrentUser(userToStore as User);
        localStorage.setItem('colorhut-user', JSON.stringify(userToStore));
        router.push('/dashboard');
        setIsLoading(false);
        return true;
      } else {
        console.log("AuthContext: Password does NOT match.");
        setIsLoading(false);
        return false;
      }
    } else {
      console.log(`AuthContext: User NOT found in DB for email ${email}.`);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    console.log("AuthContext: Logging out user.");
    setCurrentUser(null);
    localStorage.removeItem('colorhut-user');
    router.push('/login');
  };

  const updateUserAvatar = async (avatarUrl: string | null): Promise<boolean> => {
    if (!currentUser || !currentUser.id) {
      console.log("AuthContext: updateUserAvatar - No current user or user ID.");
      return false;
    }
    
    const success = await updateUserAvatarInFirestore(currentUser.id, avatarUrl);

    if (success) {
      console.log("AuthContext: Avatar updated successfully in Firestore. Updating local state.");
      const updatedUser = { ...currentUser, avatarUrl: avatarUrl ?? undefined };
      setCurrentUser(updatedUser);
      localStorage.setItem('colorhut-user', JSON.stringify(updatedUser));
    } else {
      console.log("AuthContext: Failed to update avatar in Firestore.");
    }
    return success;
  };

  const refreshCurrentUser = async () => {
    if (currentUser && currentUser.id) {
      console.log(`AuthContext: Refreshing current user data for ID: ${currentUser.id}`);
      const firestoreUser = await getUserById(currentUser.id);
      if (firestoreUser) {
        if (firestoreUser.isBanned) {
          console.log("AuthContext: Current user has been banned. Logging out.");
          logout(); // Force logout if current user gets banned
        } else {
          console.log("AuthContext: Fetched latest user data. Updating local state.");
          const { password, ...userToStore } = firestoreUser;
          setCurrentUser(userToStore as User);
          localStorage.setItem('colorhut-user', JSON.stringify(userToStore));
        }
      } else {
        console.log("AuthContext: Current user not found in Firestore during refresh. Logging out.");
        logout();
      }
    } else {
      console.log("AuthContext: refreshCurrentUser - No current user to refresh.");
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

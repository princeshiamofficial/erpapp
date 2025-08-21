
"use client";

import type { User } from '@/types';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { getUserByEmail, seedInitialAdminUser, updateUserAvatarInFirestore, getUserById } from '@/lib/user-service';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserAvatar: (avatarUrl: string | null) => Promise<boolean>;
  refreshCurrentUser: () => Promise<void>;
  isSuspendedDialogOpen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuspendedDialogOpen, setIsSuspendedDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const logout = useCallback(() => {
    console.log("AuthContext: Logging out user.");
    setCurrentUser(null);
    setIsSuspendedDialogOpen(false);
    localStorage.removeItem('colorhut-user');
    router.push('/login');
  }, [router]);

  const refreshCurrentUser = useCallback(async () => {
    if (currentUser && currentUser.id && !isSuspendedDialogOpen) { 
      console.log(`AuthContext: Refreshing current user data for ID: ${currentUser.id}`);
      try {
        const firestoreUser = await getUserById(currentUser.id);
        if (firestoreUser) {
          if (firestoreUser.isBanned) {
            console.log("AuthContext: Current user has been banned during session. Showing suspension dialog.");
            setCurrentUser(firestoreUser as User); 
            localStorage.setItem('colorhut-user', JSON.stringify(firestoreUser));
            setIsSuspendedDialogOpen(true);
          } else {
            const { password, ...userToStore } = firestoreUser;
            if (JSON.stringify(currentUser) !== JSON.stringify(userToStore)) {
              console.log("AuthContext: Fetched latest user data (not banned). Updating local state.");
              setCurrentUser(userToStore as User);
              localStorage.setItem('colorhut-user', JSON.stringify(userToStore));
            }
             if (isSuspendedDialogOpen) { // If dialog was open but user is no longer banned
              setIsSuspendedDialogOpen(false);
            }
          }
        } else {
          console.log("AuthContext: Current user not found in Firestore during refresh (e.g., deleted). Showing suspension dialog to force logout.");
          setIsSuspendedDialogOpen(true); 
        }
      } catch (error) {
        console.error("AuthContext: Error refreshing current user data:", error);
      }
    }
  }, [currentUser, isSuspendedDialogOpen]); 

  useEffect(() => {
    const initializeAuth = async () => {
      console.log("AuthContext: Initializing auth...");
      try {
        await seedInitialAdminUser();
        console.log("AuthContext: Initial admin user seeding/validation complete.");

        const storedUserJson = localStorage.getItem('colorhut-user');
        if (storedUserJson) {
          console.log("AuthContext: Found user in localStorage.");
          try {
            const storedUser = JSON.parse(storedUserJson) as User;
            if (storedUser && storedUser.id) {
              console.log(`AuthContext: Validating stored user ID: ${storedUser.id} against Firestore.`);
              const firestoreUser = await getUserById(storedUser.id);
              if (firestoreUser) {
                setCurrentUser(firestoreUser as User); 
                if (firestoreUser.isBanned) {
                  console.log("AuthContext: Stored user is banned. Will trigger suspension dialog.");
                  setIsSuspendedDialogOpen(true); 
                }
              } else {
                console.log("AuthContext: Stored user NOT found in Firestore. Clearing localStorage.");
                localStorage.removeItem('colorhut-user');
              }
            } else {
              console.log("AuthContext: Invalid user object in localStorage. Clearing.");
              localStorage.removeItem('colorhut-user');
            }
          } catch (error) {
            console.error("AuthContext: Failed to parse or validate stored user:", error);
            localStorage.removeItem('colorhut-user');
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

  // useEffect(() => {
  //   let intervalId: NodeJS.Timeout | undefined;
  //   if (currentUser && currentUser.id && !isSuspendedDialogOpen) {
  //     const CHECK_INTERVAL = 1 * 60 * 1000; 
  //     console.log(`AuthContext: Starting polling for user ${currentUser.id} status. Interval: ${CHECK_INTERVAL}ms`);
  //     intervalId = setInterval(refreshCurrentUser, CHECK_INTERVAL);
  //   }
  //   return () => {
  //     if (intervalId) {
  //       console.log("AuthContext: Clearing user status polling interval.");
  //       clearInterval(intervalId);
  //     }
  //   };
  // }, [currentUser, refreshCurrentUser, isSuspendedDialogOpen]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    console.log(`AuthContext: Login attempt for email: ${email}`);
    setIsLoading(true);
    try {
      const userFromDb = await getUserByEmail(email);
      
      if (userFromDb) {
        console.log(`AuthContext: User found in DB for email ${email}:`, { id: userFromDb.id, role: userFromDb.role, isBanned: userFromDb.isBanned });
        if (userFromDb.password === pass) {
          if (userFromDb.isBanned) {
            console.log("AuthContext: Login attempt by banned user. Setting state for suspension dialog.");
            const { password, ...userToStore } = userFromDb;
            setCurrentUser(userToStore as User); // Set current user to banned user
            localStorage.setItem('colorhut-user', JSON.stringify(userToStore));
            setIsSuspendedDialogOpen(true); // Trigger dialog
            setIsLoading(false);
            router.push('/dashboard'); // Navigate, layout will handle dialog display
            return true; // Technically "authenticated" to reach the suspended state
          } else {
            console.log("AuthContext: Password matches and user not banned. Login successful.");
            const { password, ...userToStore } = userFromDb;
            setCurrentUser(userToStore as User);
            localStorage.setItem('colorhut-user', JSON.stringify(userToStore));
            setIsLoading(false);
            if (userToStore.role === 'LR') {
              router.push('/projects');
            } else {
              router.push('/dashboard');
            }
            return true;
          }
        } else {
          console.log("AuthContext: Password does NOT match for user:", email);
          toast({
              title: "Login Failed",
              description: "Invalid email or password. Please try again.",
              variant: "destructive",
          });
        }
      } else {
        console.log(`AuthContext: User NOT found in DB for email ${email}.`);
        toast({
            title: "Login Failed",
            description: "Invalid email or password. Please try again.",
            variant: "destructive",
        });
      }
    } catch (error) {
      console.error("AuthContext: Error during login process:", error);
      toast({
          title: "Login Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
      });
    }
    setIsLoading(false);
    return false;
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

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, updateUserAvatar, refreshCurrentUser, isSuspendedDialogOpen }}>
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


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
  isSuspendedDialogOpen: boolean; // New state for dialog
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuspendedDialogOpen, setIsSuspendedDialogOpen] = useState(false); // New state
  const router = useRouter();
  const { toast } = useToast();

  const logout = useCallback(() => {
    console.log("AuthContext: Logging out user.");
    setCurrentUser(null);
    setIsSuspendedDialogOpen(false); // Ensure dialog is closed on logout
    localStorage.removeItem('colorhut-user');
    router.push('/login');
  }, [router]);

  const refreshCurrentUser = useCallback(async () => {
    if (currentUser && currentUser.id) {
      console.log(`AuthContext: Refreshing current user data for ID: ${currentUser.id}`);
      try {
        const firestoreUser = await getUserById(currentUser.id);
        if (firestoreUser) {
          if (firestoreUser.isBanned) {
            console.log("AuthContext: Current user has been banned. Showing suspension dialog.");
            setIsSuspendedDialogOpen(true); // Trigger dialog, logout will be handled by dialog
          } else {
            console.log("AuthContext: Fetched latest user data (not banned). Updating local state.");
            const { password, ...userToStore } = firestoreUser;
            setCurrentUser(userToStore as User);
            localStorage.setItem('colorhut-user', JSON.stringify(userToStore));
            if (isSuspendedDialogOpen) { // If dialog was open but user is no longer banned
              setIsSuspendedDialogOpen(false);
            }
          }
        } else {
          console.log("AuthContext: Current user not found in Firestore during refresh. Showing suspension dialog to force logout.");
          setIsSuspendedDialogOpen(true); // User deleted, trigger dialog then logout
        }
      } catch (error) {
        console.error("AuthContext: Error refreshing current user data:", error);
        // Optionally, could trigger logout here too if refresh consistently fails
        // setIsSuspendedDialogOpen(true); 
      }
    } else {
      // console.log("AuthContext: refreshCurrentUser - No current user to refresh.");
    }
  }, [currentUser?.id, isSuspendedDialogOpen]);


  useEffect(() => {
    const initializeAuth = async () => {
      console.log("AuthContext: Initializing auth...");
      try {
        await seedInitialAdminUser();
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
                  console.log("AuthContext: Stored user is banned. Clearing localStorage and will not set as current user.");
                  localStorage.removeItem('colorhut-user');
                  // Do not set currentUser, let login proceed if they try again
                  // No need to show dialog here as it's on initial load, they just won't be logged in.
                } else {
                  console.log("AuthContext: Stored user validated against Firestore and not banned. Setting current user.");
                  const { password, ...userToStore } = firestoreUser;
                  setCurrentUser(userToStore as User);
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
  }, []); // Run once on mount

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    if (currentUser && currentUser.id && !isSuspendedDialogOpen) {
      const CHECK_INTERVAL = 1 * 60 * 1000; // Check every 1 minute
      console.log(`AuthContext: Starting polling for user ${currentUser.id} status. Interval: ${CHECK_INTERVAL}ms`);
      // refreshCurrentUser(); // Optional: initial check immediately after login or if dialog closes
      intervalId = setInterval(refreshCurrentUser, CHECK_INTERVAL);
    } else {
      // console.log("AuthContext: Polling not started or stopped.");
    }
    return () => {
      if (intervalId) {
        console.log("AuthContext: Clearing user status polling interval.");
        clearInterval(intervalId);
      }
    };
  }, [currentUser?.id, refreshCurrentUser, isSuspendedDialogOpen]);


  const login = async (email: string, pass: string): Promise<boolean> => {
    console.log(`AuthContext: Login attempt for email: ${email}`);
    setIsLoading(true);
    try {
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
        }
      } else {
        console.log(`AuthContext: User NOT found in DB for email ${email}.`);
      }
    } catch (error) {
      console.error("AuthContext: Error during login process:", error);
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

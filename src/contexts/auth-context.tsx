
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
            console.log("AuthContext: Current user has been banned during session. Showing suspension dialog.");
            setIsSuspendedDialogOpen(true); // Trigger dialog, logout will be handled by dialog
            // Do not clear currentUser here; dialog needs it to know who is being suspended
          } else {
            // User is not banned, update local state if different
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
          setIsSuspendedDialogOpen(true); // User deleted, trigger dialog then logout
        }
      } catch (error) {
        console.error("AuthContext: Error refreshing current user data:", error);
        // Potentially trigger logout if refresh fails consistently
        // setIsSuspendedDialogOpen(true); 
      }
    }
  }, [currentUser, isSuspendedDialogOpen, logout]); // Added logout as a dependency for safety, though it's stable


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
                if (firestoreUser.isBanned) {
                  console.log("AuthContext: Stored user is banned. Clearing localStorage. User must log in again (and will be blocked).");
                  localStorage.removeItem('colorhut-user');
                  // Do not set currentUser, they need to re-attempt login and be blocked there
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
  }, []); 

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    if (currentUser && currentUser.id && !isSuspendedDialogOpen) {
      const CHECK_INTERVAL = 1 * 60 * 1000; // Check every 1 minute
      console.log(`AuthContext: Starting polling for user ${currentUser.id} status. Interval: ${CHECK_INTERVAL}ms`);
      intervalId = setInterval(refreshCurrentUser, CHECK_INTERVAL);
    }
    return () => {
      if (intervalId) {
        console.log("AuthContext: Clearing user status polling interval.");
        clearInterval(intervalId);
      }
    };
  }, [currentUser, refreshCurrentUser, isSuspendedDialogOpen]);


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
            return false; // Explicitly return false here
          }
          console.log("AuthContext: Password matches and user not banned. Login successful.");
          const { password, ...userToStore } = userFromDb;
          setCurrentUser(userToStore as User);
          localStorage.setItem('colorhut-user', JSON.stringify(userToStore));
          router.push('/dashboard');
          setIsLoading(false);
          return true;
        } else {
          console.log("AuthContext: Password does NOT match for user:", email);
        }
      } else {
        console.log(`AuthContext: User NOT found in DB for email ${email}.`);
      }
    } catch (error) {
      console.error("AuthContext: Error during login process:", error);
    }
    // If login fails for any reason other than an explicit banned user return above
    toast({
        title: "Login Failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
    });
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

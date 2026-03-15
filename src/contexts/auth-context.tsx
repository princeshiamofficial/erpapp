
"use client";

import type { User } from '@/types';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { serverSeedInitialAdminUser as seedInitialAdminUser, serverGetUserById as getUserById, serverVerifyUserPassword as verifyUserPassword, serverUpdateUserAvatar as updateUserAvatarService } from '@/app/actions/auth';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserAvatar: (avatarUrl: string | null) => Promise<boolean>;
  refreshCurrentUser: () => Promise<void>;
  impersonate: (user: User) => void;
  stopImpersonating: () => void;
  originalUser: User | null;
  isSuspendedDialogOpen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuspendedDialogOpen, setIsSuspendedDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const logout = useCallback(() => {
    console.log("AuthContext: Logging out user.");
    setCurrentUser(null);
    setOriginalUser(null);
    setIsSuspendedDialogOpen(false);
    localStorage.removeItem('colorhut-user');
    localStorage.removeItem('colorhut-original-user');
    router.push('/login');
  }, [router]);

  const refreshCurrentUser = useCallback(async () => {
    if (currentUser && currentUser.id && !isSuspendedDialogOpen) {
      console.log(`AuthContext: Refreshing current user data for ID: ${currentUser.id}`);
      try {
        const dbUser = await getUserById(currentUser.id);
        if (dbUser) {
          if (dbUser.isBanned) {
            console.log("AuthContext: Current user has been banned during session. Showing suspension dialog.");
            setCurrentUser(dbUser as User);
            localStorage.setItem('colorhut-user', JSON.stringify(dbUser));
            setIsSuspendedDialogOpen(true);
          } else {
            const { password, ...userToStore } = dbUser;
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
          console.log("AuthContext: Current user not found in MySQL during refresh (e.g., deleted). Showing suspension dialog to force logout.");
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
            // Robust parsing and validation
            const storedUser = JSON.parse(storedUserJson);
            if (storedUser && typeof storedUser === 'object' && storedUser.id && typeof storedUser.id === 'string') {
              console.log(`AuthContext: Validating stored user ID: ${storedUser.id} against MySQL.`);
              const dbUser = await getUserById(storedUser.id);
              if (dbUser) {
                setCurrentUser(dbUser as User);
                if (dbUser.isBanned) {
                  console.log("AuthContext: Stored user is banned. Will trigger suspension dialog.");
                  setIsSuspendedDialogOpen(true);
                }
              } else {
                console.log("AuthContext: Stored user NOT found in MySQL. Clearing localStorage.");
                localStorage.removeItem('colorhut-user');
              }
            } else {
              console.log("AuthContext: Invalid or corrupted user object in localStorage. Clearing.");
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
        
        // Handle original user for impersonation
        const storedOriginalUserJson = localStorage.getItem('colorhut-original-user');
        if (storedOriginalUserJson) {
           try {
             setOriginalUser(JSON.parse(storedOriginalUserJson));
           } catch (e) {
             console.error("AuthContext: Failed to parse original user", e);
           }
        }
        
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    console.log(`AuthContext: Login attempt for email: ${email}`);
    setIsLoading(true);
    try {
      const authenticatedUser = await verifyUserPassword(email, pass);

      if (authenticatedUser) {
        console.log(`AuthContext: User authenticated:`, { id: authenticatedUser.id, role: authenticatedUser.role, isBanned: authenticatedUser.isBanned });
        if (authenticatedUser.isBanned) {
          console.log("AuthContext: Login attempt by banned user. Setting state for suspension dialog.");
          setCurrentUser(authenticatedUser);
          localStorage.setItem('colorhut-user', JSON.stringify(authenticatedUser));
          setIsSuspendedDialogOpen(true);
          setIsLoading(false);
          router.push('/dashboard');
          return true;
        } else {
          console.log("AuthContext: Authentication successful.");
          setCurrentUser(authenticatedUser);
          localStorage.setItem('colorhut-user', JSON.stringify(authenticatedUser));
          setIsLoading(false);

          // Redirect logic based on role
          const systemRoles = ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE", "VENDOR", "LR", "CO"];
          if (!systemRoles.includes(authenticatedUser.role)) {
            router.push('/attendance');
          } else if (authenticatedUser.role === 'LR') {
            router.push('/projects');
          } else {
            router.push('/dashboard');
          }
          return true;
        }
      } else {
        console.log(`AuthContext: Authentication failed for email ${email}.`);
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

    const success = await updateUserAvatarService(currentUser.id, avatarUrl);

    if (success) {
      console.log("AuthContext: Avatar updated successfully in MySQL. Updating local state.");
      const updatedUser = { ...currentUser, avatarUrl: avatarUrl || undefined };
      setCurrentUser(updatedUser);
      localStorage.setItem('colorhut-user', JSON.stringify(updatedUser));
    } else {
      console.log("AuthContext: Failed to update avatar in MySQL.");
    }
    return success;
  };

  const impersonate = useCallback((user: User) => {
    console.log(`AuthContext: Impersonating user: ${user.id}`);
    
    // Store current user as original user if not already impersonating
    if (!originalUser && currentUser) {
        setOriginalUser(currentUser);
        localStorage.setItem('colorhut-original-user', JSON.stringify(currentUser));
    }

    const { password, ...userToStore } = user;
    setCurrentUser(userToStore as User);
    localStorage.setItem('colorhut-user', JSON.stringify(userToStore));
    
    // Redirect logic based on role
    const systemRoles = ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE", "VENDOR", "LR", "CO"];
    if (!systemRoles.includes(user.role)) {
      router.push('/attendance');
    } else if (user.role === 'LR') {
      router.push('/projects');
    } else {
      router.push('/dashboard');
    }
    
    toast({
        title: "Viewing Mode Active",
        description: `You are now viewing as ${user.name}.`,
    });
  }, [router, toast, currentUser, originalUser]);

  const stopImpersonating = useCallback(() => {
    if (!originalUser) return;
    
    console.log(`AuthContext: Stopping impersonation, returning to: ${originalUser.id}`);
    setCurrentUser(originalUser);
    localStorage.setItem('colorhut-user', JSON.stringify(originalUser));
    
    setOriginalUser(null);
    localStorage.removeItem('colorhut-original-user');
    
    router.push('/dashboard');
    
    toast({
        title: "Returned to Account",
        description: `Logged back in as ${originalUser.name}.`,
    });
  }, [router, toast, originalUser]);

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, updateUserAvatar, refreshCurrentUser, impersonate, stopImpersonating, originalUser, isSuspendedDialogOpen }}>
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

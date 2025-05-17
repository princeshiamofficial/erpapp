
"use client";

import type { User } from '@/types';
import { MOCK_USERS, findUserByEmailAndPassword, updateUserAvatarInMock } from '@/lib/auth-constants';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserAvatar: (avatarUrl: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('trackflow-user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        const validatedUser = MOCK_USERS.find(mockUser => mockUser.id === parsedUser.id);
        if (validatedUser) {
          // Ensure the stored user in state is always fresh from MOCK_USERS (which might have updated avatar)
          const { password, ...userToStore } = validatedUser;
          setCurrentUser(userToStore as User);
        } else {
          localStorage.removeItem('trackflow-user');
        }
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem('trackflow-user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = findUserByEmailAndPassword(email, pass);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('trackflow-user', JSON.stringify(user));
      setIsLoading(false);
      router.push('/dashboard');
      return true;
    }
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('trackflow-user');
    router.push('/login');
  };

  const updateUserAvatar = async (avatarUrl: string): Promise<boolean> => {
    if (!currentUser) return false;
    setIsLoading(true);
    
    // Simulate API call to update avatar
    await new Promise(resolve => setTimeout(resolve, 300));
    const success = updateUserAvatarInMock(currentUser.id, avatarUrl);

    if (success) {
      const updatedUser = { ...currentUser, avatarUrl };
      setCurrentUser(updatedUser);
      localStorage.setItem('trackflow-user', JSON.stringify(updatedUser));
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, updateUserAvatar }}>
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

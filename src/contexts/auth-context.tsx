
"use client";

import type { User } from '@/types';
import { MOCK_USERS, findUserByEmailAndPassword } from '@/lib/auth-constants';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>; // Updated for password
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Try to load user from localStorage (very basic persistence for demo)
    const storedUser = localStorage.getItem('trackflow-user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        // Validate if this user is one of our mock users
        // We don't store password in localStorage, so we find by ID to re-validate
        const validatedUser = MOCK_USERS.find(mockUser => mockUser.id === parsedUser.id);
        if (validatedUser) {
          const { password, ...userToStore } = validatedUser; // Ensure password is not in currentUser state
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
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = findUserByEmailAndPassword(email, pass);
    if (user) {
      // The password is already removed by findUserByEmailAndPassword
      setCurrentUser(user);
      localStorage.setItem('trackflow-user', JSON.stringify(user)); // Store user without password
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

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout }}>
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

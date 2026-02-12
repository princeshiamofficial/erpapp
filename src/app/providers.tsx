
"use client";

import { AuthProvider } from '@/contexts/auth-context';
import { SocketProvider } from '@/contexts/socket-context';
import { Toaster } from "@/components/ui/toaster";
import React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </SocketProvider>
  );
}

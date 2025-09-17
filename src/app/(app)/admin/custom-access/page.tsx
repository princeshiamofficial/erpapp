

"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function CustomAccessPage() {
    const { currentUser } = useAuth();
    const router = useRouter();

    if (!currentUser || currentUser.role !== 'SYSTEM_ADMIN') {
        if (typeof window !== 'undefined') {
          router.replace('/dashboard');
        }
        return null;
    }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <Construction className="h-16 w-16 text-primary mb-6" />
      <h1 className="text-3xl font-bold mb-2">Under Construction</h1>
      <p className="text-lg text-muted-foreground max-w-md">
        This page for managing custom user roles and permissions is currently being built.
      </p>
    </div>
  );
}

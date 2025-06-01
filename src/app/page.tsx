
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
// Loader2 is no longer needed here
// import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { currentUser, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (currentUser) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [currentUser, isLoading, router]);

  // Return null to show a blank screen during the brief period of redirection.
  // This can make the app feel like it's opening more instantly.
  return null;
}


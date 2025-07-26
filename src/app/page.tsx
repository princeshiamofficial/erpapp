
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { currentUser, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (currentUser) {
        if (currentUser.role === 'LR') {
          router.replace('/projects');
        } else {
          router.replace('/dashboard');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [currentUser, isLoading, router]);

  // This page is purely for routing, it should not render anything.
  // The redirect will happen in the useEffect hook.
  return null;
}

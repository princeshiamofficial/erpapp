
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react'; // Re-adding Loader2

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

  // If AuthContext is still loading, display a spinner on this page.
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'hsl(var(--background))' }}>
        <Loader2 style={{ height: '2.5rem', width: '2.5rem', animation: 'spin 1s linear infinite', color: 'hsl(var(--primary))' }} />
      </div>
    );
  }

  // Once isLoading is false, the useEffect should have triggered a redirect.
  // Returning null here is fine as the user shouldn't see this page content for long.
  return null;
}

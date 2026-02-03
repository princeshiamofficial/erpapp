
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
        // System roles go to dashboard (or special-cased dashboard)
        const systemRoles = ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE", "VENDOR", "LR", "CO"];
        if (!systemRoles.includes(currentUser.role)) {
          // Custom roles are restricted to attendance only
          router.replace('/attendance');
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

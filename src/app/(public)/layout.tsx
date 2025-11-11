
import { AppProviders } from '@/app/(app)/AppProviders';
import { getGlobalSettings } from '@/lib/settings-service';
import type { User } from '@/types';
import { cookies } from 'next/headers';
import React from 'react';

// This is a new public layout that does NOT enforce authentication
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const userCookie = cookieStore.get('colorhut-user');
  let currentUser: User | null = null;
  if (userCookie && userCookie.value) {
    try {
      currentUser = JSON.parse(userCookie.value);
    } catch (e) {
      console.error("Failed to parse user cookie in public layout:", e);
      currentUser = null;
    }
  }

  // Still fetch settings for potential use (e.g., maintenance mode banner)
  const globalSettings = await getGlobalSettings();
  
  return (
    <div className="bg-background text-foreground min-h-screen">
       <AppProviders initialUser={currentUser} initialGlobalSettings={globalSettings}>
            {children}
       </AppProviders>
    </div>
  );
}

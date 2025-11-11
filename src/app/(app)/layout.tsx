
import { Suspense } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarNavigation } from '@/components/layout/SidebarNavigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getGlobalSettings } from '@/lib/settings-service';
import type { User } from '@/types';
import { cookies, headers } from 'next/headers';
import { cn } from '@/lib/utils';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import 'leaflet/dist/leaflet.css';
import { ClientLayout } from './ClientLayout'; // Import the new Client Component

// This is now a Server Component
export default async function AuthenticatedLayout({
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
      console.error("Failed to parse user cookie in layout, it might be corrupted:", e);
      currentUser = null;
    }
  }

  // Fetch settings on the server
  const globalSettings = await getGlobalSettings();
  
  const headersList = headers();
  const userAgent = headersList.get('user-agent');
  const isMobile = (header: string | null) => {
    if (!header) return false;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(header.toLowerCase());
  };
  const showBottomNav = isMobile(userAgent);

  return (
    <ClientLayout 
      initialUser={currentUser} 
      initialGlobalSettings={globalSettings}
      showBottomNav={showBottomNav}
    >
      {children}
    </ClientLayout>
  );
}

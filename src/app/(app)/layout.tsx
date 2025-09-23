
import { Suspense } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarNavigation } from '@/components/layout/SidebarNavigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { AppProviders } from './AppProviders';
import { getGlobalSettings } from '@/lib/settings-service';
import type { User } from '@/types';
import { cookies, headers } from 'next/headers';
import { cn } from '@/lib/utils';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import 'leaflet/dist/leaflet.css';


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
  const pathname = headersList.get('x-next-pathname') || '';
  
  // This logic is now handled by moving the attendance routes out of the (app) group.
  // We keep the rest of the layout logic.
  
  const isMobile = (header: string | null) => {
    if (!header) return false;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(header.toLowerCase());
  };
  
  const userAgent = headersList.get('user-agent');
  // Always show the trigger, but only show the bottom bar for LR role
  const showBottomNav = isMobile(userAgent) && currentUser?.role === 'LR';

  return (
    <AppProviders initialUser={currentUser} initialGlobalSettings={globalSettings}>
      <div className="flex min-h-svh w-full">
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl print:hidden"
        >
          <SidebarHeader className="p-4 flex items-center justify-between h-20 border-b border-sidebar-border/70 bg-black text-white">
            <Link href="/dashboard" className="flex items-center group-data-[collapsible=icon]:hidden">
              <Image
                src="https://i.ibb.co/FFQMvkz/logo-02-01.jpg"
                alt="Color Hut Logo"
                width={160}
                height={40}
                priority
                className="object-contain"
              />
            </Link>
            <div className="group-data-[collapsible=icon]:mx-auto">
              <SidebarTrigger className="hidden md:flex text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md p-1.5" />
            </div>
          </SidebarHeader>
          <SidebarContent className="flex-1 pt-3">
            <SidebarMenu className="p-2.5 space-y-1.5">
              <SidebarNavigation />
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-3.5 border-t border-sidebar-border/70">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 rounded-md text-sm py-2.5 px-3"
              data-logout-button
            >
              <LogOut className="mr-3 h-5 w-5 shrink-0 group-data-[collapsible=icon]:mr-0" />
              <span className="truncate group-data-[collapsible=icon]:hidden font-medium">Logout</span>
            </Button>
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1 flex flex-col">
          <AppHeader />
            <main
              className={cn(
                "flex-1 p-4 sm:p-6 lg:p-8 bg-background selection:bg-primary/20 selection:text-primary",
                showBottomNav && "pb-20" // Add padding only if bottom nav is shown
              )}
            >
              {children}
            </main>
          {showBottomNav && <BottomNavigation />}
        </div>
      </div>
    </AppProviders>
  );
}

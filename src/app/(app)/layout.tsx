
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { 
  Sidebar, 
  SidebarProvider, 
  SidebarHeader, 
  SidebarContent, 
  SidebarFooter, 
  SidebarMenu,
  SidebarInset,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { SidebarNavigation } from '@/components/layout/SidebarNavigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar 
        collapsible="icon" 
        className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg"
      >
        <SidebarHeader className="p-4 flex items-center justify-between h-16 border-b border-sidebar-border/70">
          <Link href="/dashboard" className="flex items-center space-x-2.5 text-primary hover:text-primary/80 transition-colors group-data-[collapsible=icon]:hidden">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_1px_2px_hsl(var(--primary)/0.5)] text-primary">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 7L12 12M12 12L22 7M12 12V22M12 2V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 4.5L7 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-bold text-2xl tracking-tight text-foreground">TrackFlow</span>
          </Link>
          <div className="group-data-[collapsible=icon]:mx-auto">
             <SidebarTrigger className="hidden md:flex text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
          </div>
        </SidebarHeader>
        <SidebarContent className="flex-1 pt-2">
          <SidebarMenu className="p-2 space-y-1">
            <SidebarNavigation />
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-3 border-t border-sidebar-border/70">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10" 
            onClick={logout} 
            title="Logout"
          >
            <LogOut className="mr-3 h-5 w-5 shrink-0 group-data-[collapsible=icon]:mr-0" />
            <span className="truncate group-data-[collapsible=icon]:hidden">Logout</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-secondary/50 min-h-[calc(100vh-4rem)] selection:bg-primary/20 selection:text-primary">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

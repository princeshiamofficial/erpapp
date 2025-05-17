
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
import { LogOut, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';

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
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar 
        collapsible="icon" 
        className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl"
      >
        <SidebarHeader className="p-4 flex items-center justify-between h-20 border-b border-sidebar-border/70">
          <Link href="/dashboard" className="flex items-center space-x-2.5 text-primary hover:text-primary/80 transition-colors group-data-[collapsible=icon]:hidden">
            <Logo className="h-9 w-9" />
            <span className="font-extrabold text-3xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400 dark:to-orange-300">Color Hut</span>
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
            onClick={logout} 
            title="Logout"
          >
            <LogOut className="mr-3 h-5 w-5 shrink-0 group-data-[collapsible=icon]:mr-0" />
            <span className="truncate group-data-[collapsible=icon]:hidden font-medium">Logout</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-secondary/30 dark:bg-background/50 min-h-[calc(100vh-4.5rem)] selection:bg-primary/20 selection:text-primary">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

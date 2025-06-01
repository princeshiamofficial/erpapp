
"use client";

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
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
import { LogOut } from 'lucide-react'; // Loader2 is removed as we create a custom loading screen
import Link from 'next/link';
import Image from 'next/image'; 
import { motion } from 'framer-motion'; // Added for animation
import { Logo } from '@/components/layout/Logo'; // Added for the loading screen

const AccountSuspendedDialog = dynamic(() => import('@/components/auth/AccountSuspendedDialog').then(mod => mod.AccountSuspendedDialog));

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading, logout, isSuspendedDialogOpen } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentUser && !isSuspendedDialogOpen) {
      router.replace('/login');
    }
  }, [currentUser, isLoading, router, isSuspendedDialogOpen]);

  if (isLoading || (!currentUser && !isSuspendedDialogOpen)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1, 1.1, 1],
              rotate: [0, 5, -5, 5, 0],
            }}
            transition={{
              duration: 2,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 0.5
            }}
          >
            <Logo className="h-20 w-20 text-primary drop-shadow-[0_5px_15px_rgba(var(--primary-hsl),0.4)]" />
          </motion.div>
        </motion.div>
        <motion.p
          className="mt-6 text-lg font-semibold text-primary tracking-wider"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Loading Color Hut...
        </motion.p>
         {/* Add primary-hsl to globals.css for the drop shadow if not present */}
        <style jsx global>{`
          :root {
            --primary-hsl: 25 95% 53%; /* Make sure this matches your primary color HSL */
          }
          .dark {
             --primary-hsl: 25 95% 60%; /* For dark mode, if different */
          }
        `}</style>
      </div>
    );
  }
  
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar 
        collapsible="icon" 
        className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl"
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
            onClick={logout} 
            title="Logout"
            disabled={isSuspendedDialogOpen} 
          >
            <LogOut className="mr-3 h-5 w-5 shrink-0 group-data-[collapsible=icon]:mr-0" />
            <span className="truncate group-data-[collapsible=icon]:hidden font-medium">Logout</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {currentUser && !isSuspendedDialogOpen && <AppHeader />} 
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background min-h-[calc(100vh-4.5rem)] selection:bg-primary/20 selection:text-primary">
          {currentUser && !isSuspendedDialogOpen ? children : null}
        </main>
      </SidebarInset>
      
      {isSuspendedDialogOpen && (
        <AccountSuspendedDialog 
          isOpen={isSuspendedDialogOpen} 
          onConfirmLogout={logout} 
        />
      )}
    </SidebarProvider>
  );
}

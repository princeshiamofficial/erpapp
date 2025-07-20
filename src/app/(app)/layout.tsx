
"use client";

import React, { useEffect, useState, useMemo } from 'react';
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
import { UserNav } from '@/components/layout/UserNav';
import { SidebarNavigation } from '@/components/layout/SidebarNavigation';
import { Button } from '@/components/ui/button';
import { LogOut, PowerOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/layout/Logo';
import { Progress } from '@/components/ui/progress';
import { getGlobalSettings } from '@/lib/settings-service';
import type { GlobalSettings } from '@/types';

const AccountSuspendedDialog = dynamic(() => import('@/components/auth/AccountSuspendedDialog').then(mod => mod.AccountSuspendedDialog));

const MaintenancePage: React.FC<{ message: string | null }> = ({ message }) => (
  <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-6 text-center">
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, rotate: [0, -5, 5, -5, 0] }}
      transition={{ duration: 0.7, ease: "easeOut", type: "spring", stiffness: 100 }}
      className="mb-8"
    >
      <PowerOff className="h-24 w-24 text-primary" />
    </motion.div>
    <h1 className="text-4xl font-bold mb-4">Under Maintenance</h1>
    <p className="text-lg text-muted-foreground max-w-lg">
      {message || "We are currently performing scheduled maintenance. We should be back online shortly. Thank you for your patience."}
    </p>
  </div>
);

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading, logout, isSuspendedDialogOpen } = useAuth();
  const router = useRouter();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      if (currentUser) {
        setIsLoadingSettings(true);
        const settings = await getGlobalSettings();
        setGlobalSettings(settings);
        setIsLoadingSettings(false);
      } else {
        setIsLoadingSettings(false);
      }
    }
    fetchSettings();
  }, [currentUser]);

  useEffect(() => {
    let progressInterval: NodeJS.Timeout | undefined;
    if (isLoading) {
      setShowLoadingScreen(true);
      setLoadingProgress(0); 
      let currentProgress = 0;
      progressInterval = setInterval(() => {
        currentProgress += Math.random() * 15 + 5;
        if (currentProgress >= 90) {
          currentProgress = 90; 
          clearInterval(progressInterval);
        }
        setLoadingProgress(currentProgress);
      }, 150); 
    } else {
      setLoadingProgress(100); 
      const fadeOutTimer = setTimeout(() => {
        setShowLoadingScreen(false);
      }, 300); 
      return () => clearTimeout(fadeOutTimer);
    }

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [isLoading]);


  useEffect(() => {
    if (!isLoading && !currentUser && !isSuspendedDialogOpen) {
      router.replace('/login');
    }
  }, [currentUser, isLoading, router, isSuspendedDialogOpen]);

  const inMaintenanceMode = useMemo(() => {
    if (isLoading || isLoadingSettings) return false;
    if (!globalSettings?.maintenanceMode) return false;
    if (currentUser?.role === 'SYSTEM_ADMIN') return false;
    return true;
  }, [isLoading, isLoadingSettings, globalSettings, currentUser]);


  if ((isLoading || (!currentUser && !isSuspendedDialogOpen)) && showLoadingScreen) {
    return (
      <AnimatePresence>
        {showLoadingScreen && (
          <motion.div
            key="loadingScreen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="fixed inset-0 z-50 flex h-screen w-full flex-col items-center justify-center bg-background text-foreground"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.05, 1, 1.05, 1],
                  rotate: [0, 2, -2, 2, 0],
                }}
                transition={{
                  duration: 2.5,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 0.3
                }}
              >
                <Logo className="h-20 w-20 text-primary drop-shadow-[0_5px_15px_rgba(var(--primary-hsl),0.4)]" />
              </motion.div>
              <motion.p
                className="mt-6 text-lg font-semibold text-primary tracking-wider"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                Loading Color Hut...
              </motion.p>
              <Progress value={loadingProgress} className="w-1/2 max-w-xs mt-4 h-2.5" indicatorClassName="bg-primary" />
              <motion.p
                className="mt-2 text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                {Math.min(Math.round(loadingProgress), 100)}%
              </motion.p>
            </motion.div>
            <style jsx global>{`
              :root {
                --primary-hsl: 25 95% 53%;
              }
              .dark {
                 --primary-hsl: 25 95% 60%;
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (!currentUser && !isSuspendedDialogOpen && !isLoading) {
    return null; 
  }

  if (inMaintenanceMode) {
    return <MaintenancePage message={globalSettings?.maintenanceMessage ?? null} />;
  }

  // Special layout for LR role without sidebar
  if (currentUser?.role === 'LR') {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/75 shadow-sm print:hidden">
            <div className="container flex h-[4.5rem] items-center justify-between max-w-full px-4 sm:px-6 lg:px-8">
                <div className="flex items-center">
                    <Link href="/projects" className="flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors">
                        <Logo className="h-7 w-7" />
                        <span className="font-extrabold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Color Hut</span>
                    </Link>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                    <UserNav />
                </div>
            </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background min-h-[calc(100vh-4.5rem)] selection:bg-primary/20 selection:text-primary">
          {children}
        </main>
         {isSuspendedDialogOpen && (
          <AccountSuspendedDialog
            isOpen={isSuspendedDialogOpen}
            onConfirmLogout={logout}
          />
        )}
      </div>
    );
  }

  // Default layout for all other roles
  return (
    <SidebarProvider defaultOpen={true}>
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

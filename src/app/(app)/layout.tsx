
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { LogOut, PowerOff, Construction, Target } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/layout/Logo';
import { Progress } from '@/components/ui/progress';
import { getGlobalSettings } from '@/lib/settings-service';
import type { GlobalSettings } from '@/types';
import { cn } from '@/lib/utils';
import io from "socket.io-client";
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { useIsMobile } from '@/hooks/use-mobile';


const AccountSuspendedDialog = dynamic(() => import('@/components/auth/AccountSuspendedDialog').then(mod => mod.AccountSuspendedDialog));

const MaintenancePage: React.FC<{ message: string | null }> = ({ message }) => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    // Load high score from local storage on component mount
    const savedHighScore = localStorage.getItem('maintenanceGameHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
  }, []);

  const handleDotClick = () => {
    const newScore = score + 1;
    setScore(newScore);
    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem('maintenanceGameHighScore', newScore.toString());
    }
  };

  const resetGame = () => {
    setScore(0);
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-6 text-center overflow-hidden">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.border/0.1)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border/0.1)_1px,transparent_1px)] bg-[size:30px_30px] opacity-50 dark:opacity-20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,theme(colors.background)_80%)]"></div>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -15 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", type: "spring", stiffness: 100 }}
        className="mb-8"
      >
        <Construction className="h-24 w-24 text-primary drop-shadow-[0_5px_15px_rgba(var(--primary-hsl),0.3)]" />
      </motion.div>
      <motion.h1 
        className="text-4xl font-bold mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        Under Maintenance
      </motion.h1>
      <motion.p 
        className="text-lg text-muted-foreground max-w-lg mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {message || "We are currently performing scheduled maintenance. We should be back online shortly. Thank you for your patience."}
      </motion.p>
      
      <motion.div 
        className="w-full max-w-sm p-4 bg-card/50 backdrop-blur-sm border rounded-lg shadow-lg"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">A quick game while you wait?</h3>
        <div className="flex justify-between items-center mb-4">
            <p className="text-lg font-mono">Score: <span className="font-bold text-primary">{score}</span></p>
            <p className="text-xs font-mono text-muted-foreground">High Score: {highScore}</p>
            <Button variant="ghost" size="sm" onClick={resetGame} className="text-xs h-7">Reset</Button>
        </div>
        <AnimatePresence mode="wait">
            <motion.button
                key={score}
                onClick={handleDotClick}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, x: Math.random() * 200 - 100, y: Math.random() * 40 - 20 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="w-10 h-10 rounded-full bg-primary shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card"
                aria-label="Click to score"
            />
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

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
  const isMobile = useIsMobile();

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const socketInitializer = async () => {
      await fetch('/api/socket');
      const socket = io({
        path: '/api/socket_io',
      });

      socket.on("connect", () => {
        console.log("Connected to Socket.IO server!");
      });

      // You can add more socket event listeners here

      return () => {
        socket.disconnect();
      };
    };

    socketInitializer();
  }, []);

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
    // Only SYSTEM_ADMIN can bypass maintenance mode
    if (currentUser?.role === 'SYSTEM_ADMIN') return false;
    return true;
  }, [isLoading, isLoadingSettings, globalSettings, currentUser]);


  if (!isClient || ((isLoading || !currentUser) && showLoadingScreen)) {
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
  
  const showBottomNav = isMobile && currentUser?.role === 'LR';

  return (
    <SidebarProvider defaultOpen={true}>
      {isClient && (
        <>
          {!showBottomNav && (
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
          )}
          <SidebarInset>
            {currentUser && !isSuspendedDialogOpen && <AppHeader />}
            <main
              className={cn(
                "flex-1 p-4 sm:p-6 lg:p-8 bg-background min-h-[calc(100vh-4.5rem)] selection:bg-primary/20 selection:text-primary",
                showBottomNav && "pb-20"
              )}
            >
              {currentUser && !isSuspendedDialogOpen ? children : null}
            </main>
            {showBottomNav && <BottomNavigation />}
          </SidebarInset>
        </>
      )}

      {isSuspendedDialogOpen && (
        <AccountSuspendedDialog
          isOpen={isSuspendedDialogOpen}
          onConfirmLogout={logout}
        />
      )}
    </SidebarProvider>
  );
}

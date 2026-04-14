
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarProvider } from '@/components/ui/sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/layout/Logo';
import { Progress } from '@/components/ui/progress';
import { GlobalSettings, User } from '@/types';
import { Construction } from 'lucide-react';

const AccountSuspendedDialog = dynamic(() => import('@/components/auth/AccountSuspendedDialog').then(mod => mod.AccountSuspendedDialog), { ssr: false });

const MaintenancePage: React.FC<{ message: string | null }> = ({ message }) => {
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
    </div>
  );
};

// This new component will contain the logic that uses the useAuth hook.
function AppShell({
  children,
  initialGlobalSettings,
}: {
  children: React.ReactNode;
  initialGlobalSettings: GlobalSettings;
}) {
  const { currentUser, isLoading, logout, isSuspendedDialogOpen, originalUser } = useAuth();
  const router = useRouter();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);


  // This effect handles the logout button which is now part of a server component layout
  useEffect(() => {
    const logoutButton = document.querySelector('[data-logout-button]');
    if (logoutButton) {
      const handleLogoutClick = () => logout();
      logoutButton.addEventListener('click', handleLogoutClick);
      return () => logoutButton.removeEventListener('click', handleLogoutClick);
    }
  }, [logout]);

  useEffect(() => {
    if (isLoading) {
      setShowLoadingScreen(true);
      setLoadingProgress(0);
    } else {
      setLoadingProgress(100);
      setShowLoadingScreen(false);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && !currentUser && !isSuspendedDialogOpen) {
      router.replace('/login');
    } else if (!isLoading && currentUser) {
      // Guard for custom roles: They cannot access internal (app) routes
      // If originalUser is present, it means an admin is impersonating, so we allow them to stay
      const systemRoles = ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE", "VENDOR", "LR", "CO", "HRM", "ACCOUNTANT", "MANAGER"];
      if (!systemRoles.includes(currentUser.role) && !originalUser) {
        router.replace('/attendance');
      }
    }
  }, [currentUser, isLoading, router, isSuspendedDialogOpen, originalUser]);

  const inMaintenanceMode = useMemo(() => {
    if (isLoading || !initialGlobalSettings) return false;
    if (!initialGlobalSettings.maintenanceMode) return false;
    if (currentUser?.role === 'SYSTEM_ADMIN') return false;
    return true;
  }, [isLoading, initialGlobalSettings, currentUser]);

  if (!currentUser && showLoadingScreen) {
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
                animate={{ scale: [1, 1.05, 1, 1.05, 1], rotate: [0, 2, -2, 2, 0], }}
                transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.3 }}
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
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (inMaintenanceMode) {
    return <MaintenancePage message={initialGlobalSettings?.maintenanceMessage ?? null} />;
  }

  return (
    <SidebarProvider>
      <motion.div
        className="flex-grow w-full min-h-svh"
      >
        {currentUser && !isSuspendedDialogOpen ? children : null}
      </motion.div>
      {isSuspendedDialogOpen && <AccountSuspendedDialog isOpen={isSuspendedDialogOpen} onConfirmLogout={logout} />}
    </SidebarProvider>
  );
}

// AppProviders is now simpler and primarily sets up the context.
export function AppProviders({
  children,
  initialUser, // This prop is no longer used here but kept for structural consistency
  initialGlobalSettings,
}: {
  children: React.ReactNode;
  initialUser: User | null;
  initialGlobalSettings: GlobalSettings;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Render a basic loading state on the server to prevent errors
    return (
      <div className="fixed inset-0 z-50 flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <Logo className="h-20 w-20 text-primary" />
        <p className="mt-6 text-lg font-semibold text-primary tracking-wider">Loading...</p>
      </div>
    );
  }

  return (
    <AppShell initialGlobalSettings={initialGlobalSettings}>
      {children}
    </AppShell>
  );
}

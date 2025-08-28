
"use client";

import React, { useState } from 'react';
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { UserNav } from "./UserNav";
import Link from "next/link";
import { Logo } from '@/components/layout/Logo';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { Button } from "@/components/ui/button";
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { settleAllDeliveredOrdersAction } from '@/app/(app)/dashboard/actions';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useIsMobile } from '@/hooks/use-mobile';


export function AppHeader() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const handleSyncClick = async () => {
    setIsSyncing(true);
    toast({
      title: "Syncing Courier Data...",
      description: "Checking for delivered orders from the courier to update statuses.",
    });

    const result = await settleAllDeliveredOrdersAction();

    if (result.success) {
      const { statusUpdateCount } = result;
      let description = "No new deliveries found from courier.";

      if (statusUpdateCount > 0) {
        description = `Successfully updated ${statusUpdateCount} order(s) to 'Delivered' based on courier confirmation.`;
      }
      
      toast({
        title: "Sync Complete",
        description,
      });
      
    } else {
      toast({
        title: "Sync Failed",
        description: result.error || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
    setIsSyncing(false); // Ensure loading state is always reset
  };

  const showSyncButton = currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/75 shadow-sm print:hidden">
      <div className="container flex h-[4.5rem] items-center justify-between max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <SidebarTrigger className="text-foreground hover:bg-accent hover:text-accent-foreground -ml-2 p-1.5 rounded-md md:hidden" />
          <Link href="/dashboard" className="hidden md:flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors ml-2">
             <Logo className="h-7 w-7" />
            <span className="font-extrabold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Color Hut</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2">
          <NotificationBell />
          {showSyncButton && (
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground hover:bg-accent hover:text-accent-foreground h-10 w-10"
              title="Sync Data"
              onClick={handleSyncClick}
              disabled={isSyncing}
            >
              <RefreshCw className={cn("h-5 w-5", isSyncing && "animate-spin")} />
              <span className="sr-only">Sync Data</span>
            </Button>
          )}
          <UserNav />
        </div>
      </div>
    </header>
  );
}

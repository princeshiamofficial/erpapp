
"use client";

import React, { useState } from 'react';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "./UserNav";
import Link from "next/link";
import { Logo } from '@/components/layout/Logo';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { Button } from "@/components/ui/button";
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { settleAllDeliveredOrdersAction } from '@/app/(app)/dashboard/actions';
import { cn } from '@/lib/utils';


export function AppHeader() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSyncClick = async () => {
    setIsSyncing(true);
    toast({
      title: "Syncing Data...",
      description: "Checking for delivered orders with due balances to settle.",
    });

    const result = await settleAllDeliveredOrdersAction();

    if (result.success) {
      const { settledCount, statusUpdateCount } = result;
      let description = "No updates were necessary.";

      if (statusUpdateCount > 0 && settledCount > 0) {
        description = `Updated ${statusUpdateCount} order status(es) and settled ${settledCount} due balance(s).`;
      } else if (statusUpdateCount > 0) {
        description = `Updated ${statusUpdateCount} order status(es) to 'Delivered' based on courier confirmation.`;
      } else if (settledCount > 0) {
        description = `Successfully settled ${settledCount} delivered order(s) with a due balance.`;
      }
      
      toast({
        title: "Sync Complete",
        description,
      });

      if (statusUpdateCount > 0 || settledCount > 0) {
        // Short delay to allow toast to be seen before reload
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setIsSyncing(false);
      }
    } else {
      toast({
        title: "Sync Failed",
        description: result.error || "An unexpected error occurred.",
        variant: "destructive",
      });
      setIsSyncing(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/75 shadow-sm print:hidden">
      <div className="container flex h-[4.5rem] items-center justify-between max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <div className="md:hidden"> {/* SidebarTrigger only on mobile */}
            <SidebarTrigger className="text-foreground hover:bg-accent hover:text-accent-foreground -ml-2 p-1.5 rounded-md" />
          </div>
           <Link href="/dashboard" className="flex md:hidden items-center space-x-2 text-primary hover:text-primary/80 transition-colors ml-2">
             <Logo className="h-7 w-7" />
            <span className="font-extrabold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Color Hut</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2">
          <NotificationBell />
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
          <UserNav />
        </div>
      </div>
    </header>
  );
}

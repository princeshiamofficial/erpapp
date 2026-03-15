
"use client";

import React, { useState } from 'react';
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { UserNav } from "./UserNav";
import Link from "next/link";
import { Logo } from '@/components/layout/Logo';

import { Button } from "@/components/ui/button";
import { RefreshCw, HelpCircle, BookText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { settleAllDeliveredOrdersAction } from '@/app/(app)/dashboard/actions';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useIsMobile } from '@/hooks/use-mobile';
import Image from 'next/image';
import { CaseStudyDialog } from './CaseStudyDialog';
import { FaqDialog } from './FaqDialog';


export function AppHeader() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const { currentUser, stopImpersonating, originalUser } = useAuth();
  const { state: sidebarState, isMobile, openMobile } = useSidebar();
  const isSidebarExpanded = isMobile ? openMobile : sidebarState === 'expanded';

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
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/75 shadow-sm print:hidden">
      {originalUser && (
        <div className="bg-primary/10 border-b border-primary/20 py-2 px-4 flex justify-center items-center gap-4">
          <p className="text-sm font-medium text-primary flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Currently viewing as <span className="font-bold underline">{currentUser?.name}</span> ({currentUser?.role?.replace(/_/g, ' ') || 'User'})
          </p>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 bg-primary text-primary-foreground hover:bg-primary/90 border-none px-3"
            onClick={stopImpersonating}
          >
            Return to My Account ({originalUser.name})
          </Button>
        </div>
      )}
      <div className="container flex h-[4.5rem] items-center justify-between max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <SidebarTrigger className="text-foreground hover:bg-accent hover:text-accent-foreground -ml-2 p-1.5 rounded-md md:hidden" />
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors ml-2",
              isSidebarExpanded && "hidden"
            )}
          >
            <Image
              src="https://colorhutbd.xyz/image/logo.png"
              alt="Color Hut Logo"
              width={200}
              height={60}
              priority
              unoptimized
              className="object-contain w-auto h-6 sm:h-8 md:h-10"
            />
          </Link>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2">
          {currentUser?.role !== 'VENDOR' && (
            <>
              <FaqDialog>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-foreground hover:bg-accent hover:text-accent-foreground h-10"
                >
                  <HelpCircle className="h-5 w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Dialogue</span>
                </Button>
              </FaqDialog>
              <CaseStudyDialog>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-foreground hover:bg-accent hover:text-accent-foreground h-10"
                >
                  <BookText className="h-5 w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Case Study</span>
                </Button>
              </CaseStudyDialog>
            </>
          )}

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

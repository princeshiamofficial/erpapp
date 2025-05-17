
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "./UserNav";
import Link from "next/link";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/75 shadow-sm">
      <div className="container flex h-[4.5rem] items-center justify-between max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <div className="md:hidden"> {/* SidebarTrigger only on mobile */}
            <SidebarTrigger className="text-foreground hover:bg-accent hover:text-accent-foreground -ml-2 p-1.5 rounded-md" />
          </div>
           <Link href="/dashboard" className="flex md:hidden items-center space-x-2 text-primary hover:text-primary/80 transition-colors ml-2">
             <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_1px_2px_hsl(var(--primary)/0.7)]">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 7L12 12M12 12L22 7M12 12V22M12 2V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 4.5L7 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
            <span className="font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">TrackFlow</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Add other header items like notifications here if needed */}
          <UserNav />
        </div>
      </div>
    </header>
  );
}

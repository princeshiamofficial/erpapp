
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "./UserNav";
import Link from "next/link";
import { Logo } from '@/components/layout/Logo';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/75 shadow-sm">
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
        
        <div className="flex items-center space-x-4">
          {/* Add other header items like notifications here if needed */}
          <UserNav />
        </div>
      </div>
    </header>
  );
}

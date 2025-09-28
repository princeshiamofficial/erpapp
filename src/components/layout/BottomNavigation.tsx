
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    Home, 
    BarChart3, 
    User as UserIcon,
    History,
    Fingerprint
} from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from '@/contexts/auth-context';


const navItems = [
  { href: "/attendance/home", label: "Home", icon: Home },
  { href: "/attendance/history", label: "History", icon: History },
  { href: "/attendance", label: "Attendance", icon: Fingerprint, isCentral: true },
  { href: "/attendance/report", label: "Report", icon: BarChart3 },
  { href: "/attendance/profile", label: "Profile", icon: UserIcon },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const { currentUser, isLoading } = useAuth();


  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || isLoading) {
    // Render a static placeholder on the server to avoid hydration mismatch
    return (
      <div className="fixed bottom-0 left-0 w-full h-16 bg-background/80 md:hidden z-50"></div>
    );
  }
  
  if (!currentUser) {
      return null;
  }

  // Do not show on non-attendance pages
  if (!pathname.startsWith('/attendance')) {
    return null;
  }


  return (
    <div className="fixed bottom-0 left-0 w-full h-16 bg-background/95 backdrop-blur-md border-t border-border/40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden z-50">
      <div className="flex justify-around items-center h-full max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          if (item.isCentral) {
            return (
              <div key={item.href} className="relative w-16 h-16">
                <Link
                  href={item.href}
                  className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40 transform hover:scale-110 transition-transform"
                  aria-label={item.label}
                >
                  <item.icon className="h-7 w-7" />
                </Link>
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center w-14 h-14 text-muted-foreground transition-colors",
                isActive ? "text-primary" : "hover:text-primary/80"
              )}
              aria-label={item.label}
            >
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute inset-x-0 bottom-0 h-1 bg-primary rounded-t-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  />
                )}
              </AnimatePresence>
              <item.icon className="h-6 w-6 mb-0.5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

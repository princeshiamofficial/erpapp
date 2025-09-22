
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, History, User as UserIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: "/attendance", label: "Home", icon: Home },
  { href: "/attendance/history", label: "History", icon: History },
  { href: "/attendance/profile", label: "Profile", icon: UserIcon },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getTranslateX = () => {
    // Correctly find the index of the active navigation item
    const itemIndex = navItems.findIndex(item => {
      // Home is a special case that can match multiple paths
      if (item.label === 'Home') {
        return pathname === '/attendance' || pathname === '/attendance/home';
      }
      // For other items, check if the path starts with their href
      return pathname.startsWith(item.href);
    });

    switch (itemIndex) {
      case 0: return '-80px'; // Corresponds to Home
      case 1: return '0px';   // Corresponds to History
      case 2: return '80px';  // Corresponds to Profile
      default: return '-80px'; // Default to Home position if no match
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm md:hidden z-50">
      <div className="bg-[#166534] dark:bg-green-800 text-white rounded-full shadow-lg p-2 flex justify-around items-center relative">
        {isClient && (
          <div className="absolute bottom-0 h-1 w-16 bg-white rounded-full transition-transform duration-300 ease-in-out" style={{
              transform: `translateX(${getTranslateX()})`
          }}/>
        )}
        {navItems.map((item) => {
          const isActive = item.href === "/attendance" 
            ? (pathname === "/attendance" || pathname === "/attendance/home")
            : pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 rounded-full w-20 transition-all",
              )}
            >
              <item.icon
                className={cn(
                  "w-6 h-6 transition-transform",
                   isClient && isActive ? 'text-white scale-110' : 'text-white/80'
                )}
              />
               <span
                className={cn(
                  "text-xs font-medium",
                  isClient && isActive ? "text-white" : "text-white/80"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

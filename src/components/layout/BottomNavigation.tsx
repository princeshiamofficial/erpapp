
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
  { href: "/attendance/home", label: "Home", icon: Home },
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
    if (pathname.startsWith('/attendance/history')) {
      return '0px';
    }
    if (pathname.startsWith('/attendance/profile')) {
      return '80px';
    }
    // This now correctly defaults to the "Home" position for both /attendance and /attendance/home
    return '-80px';
  };

  const isNavItemActive = (itemHref: string) => {
    if (itemHref === "/attendance/home") {
        return pathname === '/attendance' || pathname === '/attendance/home';
    }
    return pathname.startsWith(itemHref);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm md:hidden z-50">
      <div className="bg-[#166534] dark:bg-green-800 text-white rounded-full shadow-lg p-2 flex justify-around items-center relative">
        {isClient && (
          <div className="absolute bottom-0 h-1 w-16 bg-white rounded-full transition-transform duration-300 ease-in-out" style={{
              transform: `translateX(${getTranslateX()})`
          }}/>
        )}
        {navItems.map((item) => {
          const isActive = isClient ? isNavItemActive(item.href) : false;
          
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
                   isActive ? 'text-white scale-110' : 'text-white/80'
                )}
              />
               <span
                className={cn(
                  "text-xs font-medium",
                  isActive ? "text-white" : "text-white/80"
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


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
    const activeIndex = navItems.findIndex(item => {
        if (item.href === "/attendance") {
            return pathname === "/attendance" || pathname === "/attendance/home";
        }
        return pathname.startsWith(item.href);
    });

    if (activeIndex === 1) return '0px'; // History
    if (activeIndex === 2) return '80px'; // Profile
    return '-80px'; // Home (index 0)
  };
  
  const isNavItemActive = (itemHref: string) => {
    if (itemHref === "/attendance") {
        return pathname === "/attendance" || pathname === "/attendance/home";
    }
    return pathname.startsWith(itemHref);
  };

  // Hide the navigation on the login page
  if (pathname === '/attendance/login') {
    return null;
  }
  
  if (!isClient) {
    // Render a static, non-interactive version on the server to prevent hydration errors.
    // The active styles will be applied on the client after hydration.
    return (
       <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm md:hidden z-50">
         <div className="bg-[#166534] dark:bg-green-800 text-white rounded-full shadow-lg p-2 flex justify-around items-center relative">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-full w-20 transition-all"
            >
              <item.icon className="w-6 h-6 transition-transform text-white/80" />
              <span className="text-xs font-medium text-white/80">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm md:hidden z-50">
      <div className="bg-[#166534] dark:bg-green-800 text-white rounded-full shadow-lg p-2 flex justify-around items-center relative">
        <div
          className="absolute bottom-0 h-1 w-16 bg-white rounded-full transition-transform duration-300 ease-in-out"
          style={{
            transform: `translateX(${getTranslateX()})`
          }}
        />
        {navItems.map((item) => {
          const isActive = isNavItemActive(item.href);
          
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

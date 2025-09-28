
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Settings, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChipIcon } from "@/components/icons/ChipIcon";

// Custom SVG Icons to match the reference image
const PostsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M4 6V18C4 19.1046 4.89543 20 6 20H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 4V16C8 17.1046 8.89543 18 10 18H20C21.1046 18 22 17.1046 22 16V4C22 2.89543 21.1046 2 20 2H10C8.89543 2 8 2.89543 8 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 9H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 13H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const navItems = [
  { href: "/themes", label: "Themes", icon: ChipIcon },
  { href: "/posts", label: "Posts", icon: PostsIcon },
  { href: "/attendance", label: "Attendance", icon: Clock, isCentral: true },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Render a static placeholder on the server to avoid hydration mismatch
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm md:hidden z-50">
        <div className="bg-background/80 backdrop-blur-md rounded-full shadow-lg h-16"></div>
      </div>
    );
  }

  // Hide the navigation on the login page or other auth pages
  if (pathname === '/login') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm md:hidden z-50">
      <div className="relative h-16">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md shadow-lg rounded-full overflow-hidden">
          <div className="relative h-full w-full">
            {/* The "notch" SVG */}
            <svg
              className="absolute left-1/2 -translate-x-1/2 top-0 h-[28px] w-[88px]"
              viewBox="0 0 88 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M44 28C27.5408 28 14.154 14.6132 14.154 0H0V28H88V0C73.846 14.6132 60.4592 28 44 28Z"
                className="fill-background/80"
              />
            </svg>
          </div>
        </div>
        <div className="relative flex justify-around items-center h-full">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            if (item.isCentral) {
              return (
                <div key={item.href} className="relative w-16 h-16">
                  <Link
                    href={item.href}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg transform hover:scale-110 transition-transform"
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
                className="relative flex flex-col items-center justify-center w-14 h-14"
                aria-label={item.label}
              >
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-indicator"
                      className="absolute inset-0 h-full w-full bg-primary/10 rounded-full"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                  )}
                </AnimatePresence>
                <item.icon
                  className={cn(
                    "h-6 w-6 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                    item.href === "/themes" && isActive && "text-primary" // ChipIcon special active color
                  )}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

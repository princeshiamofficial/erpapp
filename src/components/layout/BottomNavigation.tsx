
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/purchase-request", label: "Request", icon: ShoppingCart },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-20 bg-card border-t border-border md:hidden">
      <div className="grid h-full max-w-lg grid-cols-3 mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex flex-col items-center justify-center p-2 hover:bg-muted group transition-colors",
                !isActive && "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full transition-colors",
                  isActive ? "bg-primary" : "bg-transparent group-hover:bg-muted"
                )}
              >
                <item.icon
                  className={cn(
                    "w-6 h-6",
                    isActive ? "text-primary-foreground" : ""
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-xs font-medium mt-1 transition-colors",
                  isActive ? "text-primary" : ""
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

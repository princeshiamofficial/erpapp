
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Link2,
  Settings,
  FileText,
  Award,
  BarChart3 
} from "lucide-react";
import type { UserRole } from "@/types";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"] },
  { href: "/orders", label: "Orders", icon: Package, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"] },
  { href: "/tracking-links", label: "Tracking Links", icon: Link2, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"] },
  { href: "/leaderboard", label: "Leaderboard", icon: Award, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"] },
  { href: "/users", label: "User Management", icon: Users, roles: ["SYSTEM_ADMIN", "ADMIN"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["SYSTEM_ADMIN", "ADMIN"], disabled: true },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["SYSTEM_ADMIN", "ADMIN"], disabled: true },
];

export function SidebarNavigation() {
  const pathname = usePathname();
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  const userRole = currentUser.role;

  return (
    <>
      {navItems.map((item) =>
        item.roles.includes(userRole) ? (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                tooltip={{ 
                    children: item.label, 
                    side: 'right', 
                    align: 'center', 
                    className: "bg-primary text-primary-foreground shadow-lg border-none text-xs px-2.5 py-1.5 rounded-md" 
                }}
                disabled={item.disabled}
                aria-disabled={item.disabled}
                className={
                  cn(
                    "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium py-2.5 px-3 h-auto rounded-lg transition-all duration-200 ease-in-out transform hover:translate-x-1",
                    (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))) && 
                    "bg-gradient-to-r from-primary to-orange-500 text-primary-foreground font-semibold shadow-md hover:shadow-lg",
                    item.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-sidebar-foreground/80 hover:translate-x-0"
                  )
                }
              >
                <a className="flex items-center w-full">
                  <item.icon className="mr-3 h-5 w-5 shrink-0" />
                  <span className="truncate group-data-[collapsible=icon]:hidden text-sm">
                    {item.label}
                  </span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ) : null
      )}
    </>
  );
}

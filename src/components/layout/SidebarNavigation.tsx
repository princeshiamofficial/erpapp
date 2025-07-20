
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
  Settings2, 
  FileText,
  Award,
  BarChart3,
  ListChecks,
  Layers,
  Target,
  DollarSign,
  Briefcase,
  MessageCircle,
  Landmark,
  ListOrdered // Added for Active Orders
} from "lucide-react";
import type { UserRole, GlobalSettings } from "@/types";
import { cn } from "@/lib/utils";
import React, { useState, useEffect, useMemo } from 'react';
import { getGlobalSettings } from '@/lib/settings-service';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE", "VENDOR"] },
  { href: "/orders", label: "Orders", icon: Package, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"] },
  { href: "/tracking-links", label: "Tracking Links", icon: Link2, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"] },
  { href: "/finance-manager", label: "Finance Manager", icon: DollarSign, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"] },
  { href: "/invoice", label: "Invoice", icon: FileText, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM"] },
  { href: "/payroll", label: "Payroll", icon: Landmark, roles: ["SYSTEM_ADMIN", "ADMIN"] }, // Changed icon here
  { href: "/leaderboard", label: "Leaderboard", icon: Award, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"] },
  { href: "/projects", label: "Projects", icon: Briefcase, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE", "LR"] }, 
  { href: "/users", label: "User Management", icon: Users, roles: ["SYSTEM_ADMIN", "ADMIN"] },
  { href: "/admin/model-management", label: "Model Management", icon: Layers, roles: ["SYSTEM_ADMIN", "ADMIN"] },
  { href: "/admin/statuses", label: "Status Management", icon: ListChecks, roles: ["SYSTEM_ADMIN"] },
  { href: "/admin/service-management", label: "Service Options", icon: Settings2, roles: ["SYSTEM_ADMIN"] },
  { href: "/admin/crm-target-settings", label: "App Settings", icon: Target, roles: ["SYSTEM_ADMIN"] }, // Renamed for broader scope
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["SYSTEM_ADMIN", "ADMIN"], disabled: true },
];

export function SidebarNavigation() {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      if (currentUser) {
        const settings = await getGlobalSettings();
        setGlobalSettings(settings);
      }
    }
    fetchSettings();
  }, [currentUser]);

  const canUserLogExpense = useMemo(() => {
    if (!currentUser || !globalSettings?.expenseLoggingPermissions) return false;
    if (currentUser.role === 'SYSTEM_ADMIN') return true;

    const perms = globalSettings.expenseLoggingPermissions;
    switch (perms.mode) {
      case 'all': return true;
      case 'none': return false;
      case 'specificRoles': return perms.allowedRoles.includes(currentUser.role);
      case 'specificUsers': return perms.allowedUserIds.includes(currentUser.id);
      default: return false;
    }
  }, [currentUser, globalSettings]);


  if (!currentUser) return null;

  const userRole = currentUser.role;

  return (
    <>
      {navItems.map((item) => {
        
        let shouldShowItem;

        if (userRole === 'LR') {
          shouldShowItem = item.href === '/projects';
        } else {
          shouldShowItem = item.roles.includes(userRole);
          if (item.href === "/finance-manager" && !canUserLogExpense) {
            shouldShowItem = false;
          }
        }

        return shouldShowItem ? (
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
      })}
    </>
  );
}

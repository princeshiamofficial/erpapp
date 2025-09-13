
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, useSidebar, SidebarMenuButton } from "@/components/ui/sidebar";
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
  Shield, 
  ChevronDown,
  Map,
  ShoppingCart,
  FolderHeart,
  DatabaseZap,
  MapPin, 
  ClipboardList,
  Gift,
  Store,
} from "lucide-react";
import type { UserRole, GlobalSettings } from "@/types";
import { cn } from "@/lib/utils";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getGlobalSettings } from '@/lib/settings-service';
import { AnimatePresence, motion } from "framer-motion";


interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  disabled?: boolean;
  isHeader?: boolean;
  subItems?: NavItem[];
  external?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE", "VENDOR", "LR"] },
  { 
    isHeader: true,
    label: "CRM", 
    icon: Shield, 
    roles: ["SYSTEM_ADMIN", "ADMIN", "CRM"], 
    href: "",
    subItems: [
      { href: "/pipeline", label: "Pipe Line", icon: Briefcase, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM"] },
      { href: "/crm/all-districts-data", label: "ADD", icon: Map, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM"] },
      { href: "/crm/sow", label: "SOW", icon: FolderHeart, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM"] },
      { href: "https://colorhutbd.xyz/info", label: "AdEx", icon: MapPin, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM"], external: true },
    ]
  },
  { href: "/orders", label: "Orders", icon: Package, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM"] },
  { href: "/quotation", label: "Quotations", icon: ClipboardList, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM"] },
  { href: "/gifts", label: "Gifts", icon: Gift, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM"] },
  { href: "/tracking-links", label: "Tracking Links", icon: Link2, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"] },
  { href: "/finance-manager", label: "Finance Manager", icon: DollarSign, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE", "LR"] },
  { href: "/purchase-request", label: "Purchase Request", icon: ShoppingCart, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE", "LR"] },
  { href: "/invoice", label: "Invoice", icon: FileText, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM"] },
  { href: "/payroll", label: "Payroll", icon: Landmark, roles: ["SYSTEM_ADMIN", "ADMIN"] }, 
  { href: "/leaderboard", label: "Leaderboard", icon: Award, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"] },
  { href: "/report", label: "Report", icon: BarChart3, roles: ["SYSTEM_ADMIN", "ADMIN"] },
  { href: "/projects", label: "Projects", icon: Briefcase, roles: ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE", "LR"] }, 
  { 
    isHeader: true,
    label: "Administration", 
    icon: Settings2, 
    roles: ["SYSTEM_ADMIN", "ADMIN"], 
    href: "",
    subItems: [
      { href: "/users", label: "User Management", icon: Users, roles: ["SYSTEM_ADMIN", "ADMIN"] },
      { href: "/vendors", label: "Vendors", icon: Store, roles: ["SYSTEM_ADMIN", "ADMIN"] },
      { href: "/admin/model-management", label: "Model Management", icon: Layers, roles: ["SYSTEM_ADMIN", "ADMIN"] },
      { href: "/admin/statuses", label: "Status Management", icon: ListChecks, roles: ["SYSTEM_ADMIN"] },
      { href: "/admin/service-management", label: "Service Options", icon: Settings2, roles: ["SYSTEM_ADMIN"] },
      { href: "/admin/crm-target-settings", label: "App Settings", icon: Target, roles: ["SYSTEM_ADMIN"] }, 
    ]
  },
];

export function SidebarNavigation() {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const { state: sidebarState, isMobile, openMobile } = useSidebar();

  useEffect(() => {
    async function fetchSettings() {
      if (currentUser) {
        const settings = await getGlobalSettings();
        setGlobalSettings(settings);
      }
    }
    fetchSettings();
  }, [currentUser]);

  useEffect(() => {
    navItems.forEach(item => {
      if (item.isHeader && item.subItems?.some(sub => sub.href && pathname.startsWith(sub.href))) {
        setOpenMenus(prev => ({ ...prev, [item.label]: true }));
      }
    });
  }, [pathname]);


  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

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
  
  const isSidebarExpanded = isMobile ? openMobile : sidebarState === 'expanded';

  const renderNavItems = (items: NavItem[]) => {
    return items.map((item) => {
      
      let shouldShowItem = item.roles.includes(userRole);

      // Special check for Finance Manager
      if (item.href === "/finance-manager" && !canUserLogExpense) {
        shouldShowItem = false;
      }
      
      // If it's a header, check if any sub-item should be shown
      if (item.isHeader && item.subItems) {
        shouldShowItem = item.subItems.some(sub => sub.roles.includes(userRole));
      }

      if (!shouldShowItem) return null;

      if (item.subItems && item.subItems.length > 0) {
        const isMenuOpen = openMenus[item.label] || false;
        
        return (
          <React.Fragment key={item.label}>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => toggleMenu(item.label)}
                isActive={false} // Set to false to prevent highlighting
                className={cn(
                  "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium py-2.5 px-3 h-auto rounded-lg transition-all duration-200 ease-in-out transform hover:translate-x-1"
                )}
              >
                <item.icon className="mr-3 h-5 w-5 shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:hidden text-sm flex-1 text-left">
                  {item.label}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                    isMenuOpen && "rotate-180"
                  )}
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
            <AnimatePresence>
              {isMenuOpen && isSidebarExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <SidebarMenuSub>
                    {item.subItems.map(subItem => {
                      if (!subItem.roles.includes(userRole) || (subItem.href === "/finance-manager" && !canUserLogExpense)) {
                        return null;
                      }
                      const isSubActive = subItem.href && (pathname === subItem.href || pathname.startsWith(subItem.href));
                      
                      const linkProps = subItem.external 
                        ? { target: "_blank", rel: "noopener noreferrer" } 
                        : {};

                      return (
                        <SidebarMenuSubItem key={subItem.href}>
                           <Link href={subItem.href} passHref legacyBehavior>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSubActive}
                              disabled={subItem.disabled}
                            >
                                <a className="flex items-center w-full" {...linkProps}>
                                  <subItem.icon className="mr-3 h-4 w-4 shrink-0" />
                                  <span className="truncate text-sm">{subItem.label}</span>
                                </a>
                            </SidebarMenuSubButton>
                           </Link>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </motion.div>
              )}
            </AnimatePresence>
          </React.Fragment>
        );
      }

      const isActive = item.href && (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)));
      
      return (
        <SidebarMenuItem key={`${item.href}-${item.label}`}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              asChild
              isActive={isActive}
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
                  isActive && "bg-gradient-to-r from-primary to-orange-500 text-primary-foreground font-semibold shadow-md hover:shadow-lg",
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
      );
    });
  };

  return <>{renderNavItems(navItems)}</>;
}

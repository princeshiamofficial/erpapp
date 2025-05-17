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
  FileText
} from "lucide-react";
import type { UserRole } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"] },
  { href: "/orders", label: "Orders", icon: Package, roles: ["ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"] },
  { href: "/tracking-links", label: "Tracking Links", icon: Link2, roles: ["ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"] },
  { href: "/users", label: "User Management", icon: Users, roles: ["ADMIN"] },
  { href: "/reports", label: "Reports", icon: FileText, roles: ["ADMIN"], disabled: true },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN"], disabled: true },
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
                tooltip={{ children: item.label, side: 'right', align: 'center' }}
                disabled={item.disabled}
                aria-disabled={item.disabled}
                className={item.disabled ? "cursor-not-allowed opacity-50" : ""}
              >
                <a className="flex items-center w-full">
                  <item.icon className="mr-3 h-5 w-5 shrink-0" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">
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


"use client";

import { AuthProvider } from '@/contexts/auth-context';
import { SocketProvider } from '@/contexts/socket-context';
import { Toaster } from "@/components/ui/toaster";
import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const ROUTE_TITLE_MAP: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/orders': 'Orders',
  '/orders/monthly': 'Monthly Orders',
  '/order-pulse': 'Order Pulse',
  '/all-orders': 'All Orders',
  '/library': 'Library',
  '/purchase-request': 'Purchase Request',
  '/projects': 'Projects',
  '/workflow': 'Workflow',
  '/vendors': 'Vendors',
  '/salary-transfer': 'Salary Transfer',
  '/quotation': 'Quotation',
  '/pipeline': 'Pipeline',
  '/payroll': 'Payroll',
  '/my-daily-routine': 'My Daily Routine',
  '/leaderboard': 'Leaderboard',
  '/follow-up': 'Follow Up',
  '/gifts': 'Gifts',
  '/invoice': 'Invoices',
  '/hrm/geoforce': 'GeoForce',
  '/hrm/documentation': 'HRM Documentation',
  '/hrm/attendance': 'HRM Attendance',
  '/finance-manager': 'Finance Manager',
  '/crm/sow': 'SOW',
  '/crm/all-districts-data': 'All Districts Data',
  '/deliveries': 'Deliveries',
  '/admin/crm-target-settings': 'CRM Target Settings',
  '/admin/statuses': 'Order Status Management',
  '/admin/service-management': 'Service Management',
  '/admin/stock-reports': 'Stock Reports',
  '/admin/payment-history': 'Payment History',
  '/admin/model-management': 'Model Management',
  '/admin/custom-access': 'Custom Access',
  '/report': 'Reports',
  '/attendance': 'Attendance Check In/Out',
  '/attendance/profile': 'Attendance Profile',
  '/attendance/login': 'Attendance Login',
  '/attendance/history': 'Attendance History',
  '/attendance/home': 'Attendance Home',
  '/terms-approve': 'Terms Approval',
  '/feedback': 'Feedback',
  '/track': 'Track Order',
};

function getPageTitle(pathname: string): string {
  // Direct exact match
  if (ROUTE_TITLE_MAP[pathname]) {
    return ROUTE_TITLE_MAP[pathname];
  }

  // Handle dynamic routes by prefix
  if (pathname.startsWith('/feedback/')) {
    return 'Customer Feedback';
  }
  if (pathname.startsWith('/track/')) {
    return 'Track Order';
  }
  if (pathname.startsWith('/admin/stock-reports/')) {
    return 'Stock Report Details';
  }

  // Fallback: parse last segment nicely
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return '';

  const lastSegment = segments[segments.length - 1];
  
  // Format kebab-case or snake_case to Title Case
  return lastSegment
    .split(/[-_]/)
    .map(word => {
      if (word.toUpperCase() === 'CRM') return 'CRM';
      if (word.toUpperCase() === 'SOW') return 'SOW';
      if (word.toUpperCase() === 'HRM') return 'HRM';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname || '');
  const displayTitle = pageTitle && pageTitle !== 'Home' ? `${pageTitle} | Color Hut` : 'Color Hut';

  const isSpecialPage = pathname ? (
    pathname.startsWith('/track/') || 
    pathname.startsWith('/feedback/') || 
    pathname.startsWith('/invoice/')
  ) : false;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isSpecialPage) return;

    const targetTitle = displayTitle;
    document.title = targetTitle;

    // Observe changes to the head element directly (covers title replacement & updates)
    const observer = new MutationObserver(() => {
      if (document.title !== targetTitle) {
        document.title = targetTitle;
      }
    });

    observer.observe(document.head, {
      subtree: true,
      characterData: true,
      childList: true
    });

    return () => {
      observer.disconnect();
    };
  }, [displayTitle, isSpecialPage]);

  return (
    <SocketProvider>
      <AuthProvider>
        {!isSpecialPage && <title>{displayTitle}</title>}
        {children}
        <Toaster />
      </AuthProvider>
    </SocketProvider>
  );
}



import { BottomNavigation } from '@/components/layout/BottomNavigation';
import type { Viewport } from 'next';
import React from 'react';

// This new layout will wrap all pages inside the /attendance route group

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function AttendanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main>{children}</main>
      <BottomNavigation />
    </>
  );
}

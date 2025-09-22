
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import React from 'react';

// This new layout will wrap all pages inside the /attendance route group
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

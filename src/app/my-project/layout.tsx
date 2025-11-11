
import React from 'react';

// This is a new public layout that does NOT enforce authentication
export default async function MyProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {children}
    </div>
  );
}

import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
// import { GeistMono } from 'geist/font/mono'; // Removed problematic import
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from "@/components/ui/toaster";

const geistSans = GeistSans;
// const geistMono = GeistMono; // Removed usage

export const metadata: Metadata = {
  title: 'TrackFlow',
  description: 'Seamless Order Tracking and Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} font-sans antialiased`}> {/* Removed geistMono.variable */}
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

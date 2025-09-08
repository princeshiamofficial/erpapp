
import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Providers } from './providers'; // Import the new client-side provider

const geistSans = GeistSans;

export const metadata: Metadata = {
  title: 'Color Hut',
  description: 'Seamless Order Tracking and Management',
  manifest: '/manifest.json',
  icons: {
    icon: 'https://colorhutbd.xyz/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#EF6C00',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
       <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

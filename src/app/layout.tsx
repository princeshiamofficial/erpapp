
import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Providers } from './providers'; // Import the new client-side provider
import 'leaflet/dist/leaflet.css';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Color Hut',
  description: 'Seamless Order Tracking and Management',
  icons: {
    icon: '/favicon.ico',
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
    <html lang="en" suppressHydrationWarning style={GeistSans.style}>
      <body className='font-sans antialiased' suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
        <Script
          type="module"
          src="https://unpkg.com/spoilerjs/dist/components/spoiler-span.js"
          strategy="lazyOnload"
        />
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('wheel', function(event) {
            if (document.activeElement.type === 'number') {
              event.preventDefault();
            }
          }, { passive: false });
        ` }} />
      </body>
    </html>
  );
}

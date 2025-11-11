
import { getGlobalSettings } from '@/lib/settings-service';
import type { User } from '@/types';
import { cookies } from 'next/headers';
import 'leaflet/dist/leaflet.css';
import { ClientLayout } from './ClientLayout'; 

// This is now a pure Server Component. It fetches data and passes it down.
export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const userCookie = cookieStore.get('colorhut-user');
  let currentUser: User | null = null;
  if (userCookie && userCookie.value) {
    try {
      currentUser = JSON.parse(userCookie.value);
    } catch (e) {
      console.error("Failed to parse user cookie in layout, it might be corrupted:", e);
      currentUser = null;
    }
  }

  // Fetch initial settings on the server.
  const globalSettings = await getGlobalSettings();
  
  return (
    <ClientLayout 
      initialUser={currentUser} 
      initialGlobalSettings={globalSettings}
    >
      {children}
    </ClientLayout>
  );
}

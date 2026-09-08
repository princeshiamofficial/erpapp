import { Metadata } from 'next';
import { getMenuverseRegistrations } from '@/lib/menuverse-service';
import { MenuVerseContent } from './MenuVerseContent';

export const metadata: Metadata = {
  title: 'MenuVerse | Color Hut',
  description: 'Manage MenuVerse configurations and data.',
};

export default async function MenuVersePage() {
  const registrations = await getMenuverseRegistrations();
  return <MenuVerseContent registrations={registrations} />;
}

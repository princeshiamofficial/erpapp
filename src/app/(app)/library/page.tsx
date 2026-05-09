import { Metadata } from 'next';
import { LibraryContent } from './LibraryContent';

export const metadata: Metadata = {
  title: 'Library | Color Hut Product Knowledge',
  description: 'Comprehensive database of Color Hut products, pricing, and specifications.',
};

export default function LibraryPage() {
  return <LibraryContent />;
}

import type { Metadata } from 'next';
import '../../globals.css';

export const metadata: Metadata = {
    title: 'Vote - Color Hut',
    description: 'Cast your vote and help us improve.',
};

export default function VotePublicLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen bg-white">
            <main>
                {children}
            </main>
        </div>
    );
}

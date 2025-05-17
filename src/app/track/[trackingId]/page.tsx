
import { Suspense } from 'react';
import { OrderDetailsClient } from './OrderDetailsClient';
import { getOrderById } from '@/lib/order-service'; // Use new Firestore service
import { getStatuses } from '@/lib/status-service';
import { notFound } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/layout/Logo';
import { Package } from 'lucide-react';

interface PublicTrackingPageProps {
  params: { trackingId: string };
}

// This is now a Server Component
export default async function PublicTrackingPage({ params }: PublicTrackingPageProps) {
  const trackingId = params.trackingId;
  
  // Fetch order and statuses on the server
  // Using Promise.all to fetch in parallel
  const [orderData, allStatuses] = await Promise.all([
    getOrderById(trackingId),
    getStatuses() // Fetch all statuses to pass to client for display mapping
  ]);

  if (!orderData) {
    notFound(); // Or return a custom "not found" component
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-background to-secondary/30 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 selection:bg-primary/20 selection:text-primary">
       <header className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center space-x-2 sm:space-x-3 text-primary mb-2">
            <Logo className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16" />
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400 dark:to-orange-300">TrackFlow</h1>
        </div>
        <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-light">Seamless Order Tracking</p>
      </header>
      
      <Suspense fallback={<TrackingPageSkeleton />}>
        <OrderDetailsClient order={orderData} allStatuses={allStatuses} />
      </Suspense>

      <footer className="text-center mt-16 sm:mt-20 py-8 sm:py-10 border-t border-border/30">
        <p className="text-sm sm:text-md text-muted-foreground">&copy; {new Date().getFullYear()} TrackFlow. All rights reserved.</p>
        <p className="text-xs sm:text-sm text-muted-foreground/70 mt-1 sm:mt-1.5">Precision Order Tracking, Simplified.</p>
      </footer>
    </div>
  );
}

function TrackingPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10 animate-pulse">
      <div className="shadow-2xl overflow-hidden border-border/40 bg-card rounded-xl">
        <div className="bg-card p-6 sm:p-8 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6">
            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-center mb-4 sm:mb-0 flex-shrink-0">
                <Package className="h-8 w-8 sm:h-10 sm:w-10 text-primary opacity-50" />
            </div>
            <div>
              <Skeleton className="h-8 w-72 mb-2 sm:h-10" />
              <Skeleton className="h-5 w-48 sm:h-6" />
            </div>
          </div>
        </div>
        <div className="p-6 sm:p-8 space-y-8">
          <div>
            <Skeleton className="h-7 w-40 mb-2" />
            <Skeleton className="h-10 w-56 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-px w-full my-8 bg-border/30" />
          <div>
            <Skeleton className="h-6 w-32 mb-5" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1.5 p-3 bg-secondary/30 rounded-lg border border-border/20">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          </div>
          <Skeleton className="h-px w-full my-8 bg-border/30" />
          <div>
            <Skeleton className="h-6 w-40 mb-6" />
            <div className="space-y-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-2 p-4 bg-muted/50 rounded-lg border border-border/40">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
       <div className="shadow-xl border border-border/40 bg-card rounded-xl">
        <div className="bg-card p-6 sm:p-8 border-b border-border/40">
          <Skeleton className="h-8 w-60 mb-1" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="p-6 sm:p-8 space-y-6">
           <Skeleton className="h-24 w-full rounded-lg" />
           <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

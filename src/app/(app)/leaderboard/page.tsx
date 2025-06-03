
"use client"; // Add "use client" as we are using useAuth hook

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaderboardClientTabs } from '@/components/leaderboard/LeaderboardClientTabs';
import type { User, TrackingLink, GlobalSettings } from '@/types';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth to get currentUser
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// These would typically be fetched or live in a service
// For the sake of this component structure, we'll assume they are passed as props or fetched.
// We'll use dummy data structures that match what LeaderboardClientTabs expects.

interface CrmPerformanceData {
  userId: string;
  userName: string;
  userAvatar?: string;
  ordersCompleted: number;
  target: number;
  rank?: number;
  // Add a trend field for visual purposes, actual logic would be elsewhere
  trend?: 'up' | 'down' | 'same'; 
}

// Dummy data for demonstration purposes, replace with actual data fetching
const DUMMY_MONTHLY_DATA: CrmPerformanceData[] = [
  { userId: 'user1', userName: 'Anna D.', ordersCompleted: 832, target: 800, rank: 1, userAvatar: 'https://placehold.co/128x128/A8D8EA/333333.png?text=AD', trend: 'up' },
  { userId: 'user2', userName: 'Mike L.', ordersCompleted: 640, target: 700, rank: 2, userAvatar: 'https://placehold.co/112x112/C1E1C1/333333.png?text=ML', trend: 'up' },
  { userId: 'user3', userName: 'Joe H.', ordersCompleted: 599, target: 600, rank: 3, userAvatar: 'https://placehold.co/112x112/D8D8D8/333333.png?text=JH', trend: 'down' },
  { userId: 'user4', userName: 'Lea L.', ordersCompleted: 530, target: 550, rank: 4, userAvatar: 'https://placehold.co/40x40/FFDBDB/333333.png?text=LL', trend: 'down' },
  { userId: 'currentUser', userName: 'You', ordersCompleted: 420, target: 500, rank: 5, userAvatar: 'https://placehold.co/40x40/E0E7FF/333333.png?text=YOU', trend: 'up' },
  { userId: 'user6', userName: 'Sebastian M.', ordersCompleted: 410, target: 400, rank: 6, userAvatar: 'https://placehold.co/40x40/4A4A4A/ffffff.png?text=SM', trend: 'up' },
  { userId: 'user7', userName: 'Garfielda C.', ordersCompleted: 390, target: 450, rank: 7, userAvatar: 'https://placehold.co/40x40/purple/white.png?text=GC', trend: 'down' },
  { userId: 'user8', userName: 'Olivia P.', ordersCompleted: 350, target: 380, rank: 8, userAvatar: 'https://placehold.co/40x40/FFC0CB/333333.png?text=OP', trend: 'same' },
];

const DUMMY_WEEKLY_DATA: CrmPerformanceData[] = [
 { userId: 'user2', userName: 'Mike L.', ordersCompleted: 160, target: 150, rank: 1, userAvatar: 'https://placehold.co/128x128/C1E1C1/333333.png?text=ML', trend: 'up' },
  { userId: 'user1', userName: 'Anna D.', ordersCompleted: 155, target: 180, rank: 2, userAvatar: 'https://placehold.co/112x112/A8D8EA/333333.png?text=AD', trend: 'down' },
  { userId: 'currentUser', userName: 'You', ordersCompleted: 150, target: 120, rank: 3, userAvatar: 'https://placehold.co/112x112/E0E7FF/333333.png?text=YOU', trend: 'up' },
  { userId: 'user4', userName: 'Lea L.', ordersCompleted: 130, target: 140, rank: 4, userAvatar: 'https://placehold.co/40x40/FFDBDB/333333.png?text=LL', trend: 'same' },
  { userId: 'user3', userName: 'Joe H.', ordersCompleted: 120, target: 130, rank: 5, userAvatar: 'https://placehold.co/40x40/D8D8D8/333333.png?text=JH', trend: 'down' },
  { userId: 'user6', userName: 'Sebastian M.', ordersCompleted: 100, target: 100, rank: 6, userAvatar: 'https://placehold.co/40x40/4A4A4A/ffffff.png?text=SM', trend: 'up' },
];


export default function LeaderboardPage() {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  // In a real app, crmMonthlyPerformance and crmWeeklyPerformance would be fetched
  // For now, we use dummy data.
  const [crmMonthlyPerformance, setCrmMonthlyPerformance] = React.useState<CrmPerformanceData[]>([]);
  const [crmWeeklyPerformance, setCrmWeeklyPerformance] = React.useState<CrmPerformanceData[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Simulate data fetching
    const fetchData = async () => {
      setIsLoadingData(true);
      setFetchError(null);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real app, fetch and process data here, similar to the original commented out code
      // For now, just set dummy data.
      // Make sure 'currentUser' is part of the dummy data if you want to test the "You" highlight
      const updatedMonthlyData = DUMMY_MONTHLY_DATA.map(d => 
        d.userId === 'currentUser' && currentUser ? { ...d, userId: currentUser.id, userName: "You" } : d
      );
      const updatedWeeklyData = DUMMY_WEEKLY_DATA.map(d => 
        d.userId === 'currentUser' && currentUser ? { ...d, userId: currentUser.id, userName: "You" } : d
      );

      setCrmMonthlyPerformance(updatedMonthlyData);
      setCrmWeeklyPerformance(updatedWeeklyData);
      setIsLoadingData(false);
    };

    if (!isAuthLoading) { // Only fetch data if auth is not loading
        fetchData();
    }
  }, [isAuthLoading, currentUser]);


  if (isAuthLoading || isLoadingData) {
    return (
      <div className="space-y-8 p-4 sm:p-6 lg:p-8 bg-background min-h-screen">
        <Skeleton className="h-12 w-1/3 rounded-md" /> {/* Title Skeleton */}
        <Skeleton className="h-10 w-1/4 rounded-md" /> {/* TabsList Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {[...Array(3)].map((_, i) => (
            <Card key={`podium-skel-${i}`} className="flex flex-col items-center p-6 rounded-xl shadow-lg">
              <Skeleton className="h-6 w-8 mb-3 rounded" />
              <Skeleton className="h-24 w-24 rounded-full mb-3" />
              <Skeleton className="h-5 w-24 mb-1 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </Card>
          ))}
        </div>
        <div className="space-y-3 mt-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={`list-skel-${i}`} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
  
  if (fetchError) {
      return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8 bg-background min-h-screen">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Leaderboard</h1>
             <Card className="shadow-xl bg-destructive/10 border-destructive/30">
              <CardHeader>
                <CardTitle className="text-destructive">Error Loading Data</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-destructive-foreground">{fetchError}</p>
              </CardContent>
            </Card>
        </div>
      );
  }


  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 bg-background min-h-screen">
      <h1 className="text-4xl font-extrabold text-center sm:text-left text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-red-500">
        Leaderboard
      </h1>
      
      <LeaderboardClientTabs
        monthlyPerformanceData={crmMonthlyPerformance}
        weeklyPerformanceData={crmWeeklyPerformance}
        currentUser={currentUser}
      />
    </div>
  );
}

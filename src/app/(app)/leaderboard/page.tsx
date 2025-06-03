
"use client"; 

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { getUsers } from '@/lib/user-service';
import { getOrders } from '@/lib/order-service';
import { getGlobalSettings } from '@/lib/settings-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Crown } from 'lucide-react';
import Link from 'next/link';
import { LeaderboardDisplay } from '@/components/leaderboard/LeaderboardDisplay'; 
import type { User, TrackingLink, GlobalSettings, UserRole } from '@/types'; 
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { useToast } from '@/hooks/use-toast';

// CrmPerformanceData type might be better defined within LeaderboardDisplay or a shared types file if complex
export interface CrmPerformanceData {
  userId: string;
  userName: string;
  userAvatar?: string;
  ordersCompleted: number;
  target: number; 
  rank?: number;
  role?: UserRole;
  trend?: 'up' | 'down' | 'same'; 
  pointChange?: number; 
}


export default function LeaderboardPage() {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [crmMonthlyPerformance, setCrmMonthlyPerformance] = React.useState<CrmPerformanceData[]>([]);
  const [crmWeeklyPerformance, setCrmWeeklyPerformance] = React.useState<CrmPerformanceData[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'weekly'>('monthly');

  const calculatePerformance = useCallback(async (
    crmUsers: User[],
    allOrders: TrackingLink[],
    globalSettings: GlobalSettings,
    period: 'monthly' | 'weekly'
  ): Promise<CrmPerformanceData[]> => {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    if (period === 'monthly') {
      periodStart = startOfMonth(now);
      periodEnd = endOfMonth(now);
    } else { // weekly
      periodStart = startOfWeek(now, { weekStartsOn: 1 });
      periodEnd = endOfWeek(now, { weekStartsOn: 1 });
    }

    const completionStatusIds = globalSettings.crmCompletionStatusIds || [];
    if (completionStatusIds.length === 0) {
        console.warn(`Leaderboard: No CRM completion status IDs configured. Performance will be 0.`);
    }

    const performanceData = crmUsers.map(crmUser => {
      let ordersCompletedInPeriod = 0;
      const userOrders = allOrders.filter(order => order.crmUserId === crmUser.id);

      userOrders.forEach(order => {
        const completionLog = order.statusHistory.find(log => {
          if (completionStatusIds.includes(log.status)) {
            try {
              const logTimestamp = parseISO(log.timestamp);
              return isWithinInterval(logTimestamp, { start: periodStart, end: periodEnd });
            } catch (e) {
              console.error(`Error parsing timestamp ${log.timestamp} for order ${order.id}`, e);
              return false;
            }
          }
          return false;
        });
        if (completionLog) {
          ordersCompletedInPeriod++;
        }
      });
      
      const target = period === 'monthly' 
        ? (crmUser.monthlyOrderTarget ?? globalSettings.globalMonthlyOrderTarget ?? 0)
        : (crmUser.weeklyOrderTarget ?? globalSettings.globalWeeklyOrderTarget ?? 0);

      
      const pointChange = Math.floor(Math.random() * 5) - 2; 
      const trend = pointChange > 0 ? 'up' : pointChange < 0 ? 'down' : 'same';

      return {
        userId: crmUser.id,
        userName: crmUser.name,
        userAvatar: crmUser.avatarUrl || undefined,
        ordersCompleted: ordersCompletedInPeriod,
        target: target,
        role: crmUser.role,
        trend,
        pointChange: Math.abs(pointChange),
      };
    });

    performanceData.sort((a, b) => b.ordersCompleted - a.ordersCompleted || a.userName.localeCompare(b.userName));
    performanceData.forEach((user, index) => {
      user.rank = index + 1;
    });

    return performanceData;
  }, []);


  const fetchData = useCallback(async () => {
    if (!currentUser) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    setFetchError(null);
    try {
      const [allUsers, allOrders, globalSettings] = await Promise.all([
        getUsers(),
        getOrders(),
        getGlobalSettings(),
      ]);

      const crmUsers = allUsers.filter(user => user.role === 'CRM');
      
      let displayUsers = [...crmUsers];
      
      const mapDataForCurrentUser = (data: CrmPerformanceData[]): CrmPerformanceData[] => {
        return data.map(d => 
          currentUser && d.userId === currentUser.id 
            ? { ...d, userName: "You", role: currentUser.role as UserRole, userAvatar: currentUser.avatarUrl || d.userAvatar } 
            : d
        );
      };
      
      const monthlyData = await calculatePerformance(displayUsers, allOrders, globalSettings, 'monthly');
      const weeklyData = await calculatePerformance(displayUsers, allOrders, globalSettings, 'weekly');

      setCrmMonthlyPerformance(mapDataForCurrentUser(monthlyData));
      setCrmWeeklyPerformance(mapDataForCurrentUser(weeklyData));

    } catch (error) {
      console.error("Failed to fetch leaderboard data:", error);
      setFetchError("Could not load leaderboard data. Please try again later.");
      setCrmMonthlyPerformance([]);
      setCrmWeeklyPerformance([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser, calculatePerformance, toast]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchData();
    }
  }, [isAuthLoading, fetchData]);


  if (isAuthLoading || isLoadingData) {
    return (
      <div className="min-h-screen bg-[hsl(var(--leaderboard-bg-main))] text-[hsl(var(--leaderboard-text-light))] p-4 relative overflow-hidden">
        
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{backgroundImage: "url('https://placehold.co/1200x800/FFA500/FFFFFF.png?text=Orange+Theme+Placeholder')"}}
          data-ai-hint="orange sunset sky"
        ></div>
        <header className="relative z-10 flex items-center justify-between py-3 px-2 mb-6">
            <Link href="/dashboard" className="p-2 -ml-2">
                <ChevronLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-xl font-semibold tracking-wider">LEADERBOARD</h1>
            <Skeleton className="h-9 w-28 rounded-md bg-white/10" />
        </header>
        <div className="relative z-10 text-center mb-8">
          <Crown className="h-10 w-10 text-[hsl(var(--leaderboard-gold))] mx-auto mb-2 opacity-50" />
          <div className="flex justify-around items-end max-w-md mx-auto">
            <Skeleton className="h-40 w-24 rounded-t-full bg-[hsl(var(--leaderboard-podium-bg))] opacity-50" />
            <Skeleton className="h-48 w-28 rounded-t-full bg-[hsl(var(--leaderboard-podium-bg))] opacity-50" />
            <Skeleton className="h-40 w-24 rounded-t-full bg-[hsl(var(--leaderboard-podium-bg))] opacity-50" />
          </div>
        </div>
        <div className="relative z-10 bg-[hsl(var(--leaderboard-list-bg))] p-4 rounded-t-3xl mt-[-30px] shadow-2xl">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={`list-skel-${i}`} className="h-16 w-full rounded-lg mb-2 bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }
  
  if (fetchError) {
      return (
        <div className="min-h-screen bg-[hsl(var(--leaderboard-bg-main))] text-[hsl(var(--leaderboard-text-light))] p-4 flex flex-col items-center justify-center">
            <h1 className="text-xl font-semibold mb-4">Error</h1>
            <p>{fetchError}</p>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--leaderboard-bg-main))] text-[hsl(var(--leaderboard-text-light))] p-0 sm:p-0 md:p-0 lg:p-0 relative overflow-x-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{backgroundImage: "url('https://placehold.co/1200x800/FFA500/FFFFFF.png?text=Orange+Theme+Sky')"}}
        data-ai-hint="orange sunset sky background"
      ></div>
      <header className="relative z-10 flex items-center justify-between py-4 px-4 sm:px-6 mb-4 sm:mb-6">
        <Link href="/dashboard" className="p-2 -ml-2 text-[hsl(var(--leaderboard-text-light))] hover:opacity-80 transition-opacity">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-lg sm:text-xl font-semibold tracking-wider text-[hsl(var(--leaderboard-text-light))]">LEADERBOARD</h1>
        <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as 'monthly' | 'weekly')}>
          <SelectTrigger className="w-[120px] sm:w-[140px] bg-white/10 border-[hsl(var(--leaderboard-subtle-border))] text-[hsl(var(--leaderboard-text-light))] focus:ring-[hsl(var(--leaderboard-gold))] h-9 text-xs sm:text-sm">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent className="bg-[hsl(var(--leaderboard-podium-bg))] border-[hsl(var(--leaderboard-subtle-border))] text-[hsl(var(--leaderboard-text-light))]">
            <SelectItem value="monthly" className="focus:bg-white/20">Monthly</SelectItem>
            <SelectItem value="weekly" className="focus:bg-white/20">Weekly</SelectItem>
          </SelectContent>
        </Select>
      </header>
      
      <LeaderboardDisplay
        performanceData={selectedPeriod === 'monthly' ? crmMonthlyPerformance : crmWeeklyPerformance}
        currentUser={currentUser}
        timePeriodLabel={selectedPeriod === 'monthly' ? 'This Month' : 'This Week'}
      />
    </div>
  );
}

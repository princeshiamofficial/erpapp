
"use client"; 

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LeaderboardClientTabs } from '@/components/leaderboard/LeaderboardClientTabs';
import type { User, TrackingLink, GlobalSettings, UserRole, OrderLogEntry } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { getUsers } from '@/lib/user-service';
import { getOrders } from '@/lib/order-service';
import { getGlobalSettings } from '@/lib/settings-service';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface CrmPerformanceData {
  userId: string;
  userName: string;
  userAvatar?: string;
  ordersCompleted: number;
  target: number;
  rank?: number;
  role?: UserRole;
  trend?: 'up' | 'down' | 'same';
}

export default function LeaderboardPage() {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [crmMonthlyPerformance, setCrmMonthlyPerformance] = React.useState<CrmPerformanceData[]>([]);
  const [crmWeeklyPerformance, setCrmWeeklyPerformance] = React.useState<CrmPerformanceData[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

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
      periodStart = startOfWeek(now, { weekStartsOn: 1 }); // Assuming week starts on Monday
      periodEnd = endOfWeek(now, { weekStartsOn: 1 });
    }

    const completionStatusIds = globalSettings.crmCompletionStatusIds || [];
    if (completionStatusIds.length === 0) {
        console.warn(`Leaderboard: No CRM completion status IDs configured in global settings. Performance will be 0 for all.`);
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

      return {
        userId: crmUser.id,
        userName: crmUser.name,
        userAvatar: crmUser.avatarUrl || undefined,
        ordersCompleted: ordersCompletedInPeriod,
        target: target,
        role: crmUser.role,
        trend: 'same' as 'same', // Placeholder trend
      };
    });

    // Rank users
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
      
      // Include current user if they are not CRM but for some reason might have data (e.g. admin testing)
      // Or if they are a CRM, they are already in crmUsers.
      // This mainly ensures the "You" highlight works correctly if the current user is among the CRMs.
      let displayUsers = [...crmUsers];
      if (currentUser && !crmUsers.find(u => u.id === currentUser.id)) {
        // If current user is not CRM, but we want to show them if they had data (scenario unlikely for CRM-specific leaderboard)
        // For now, we will only show CRM users, and highlight the current user if they are one of them.
      }
      
      const monthlyData = await calculatePerformance(displayUsers, allOrders, globalSettings, 'monthly');
      const weeklyData = await calculatePerformance(displayUsers, allOrders, globalSettings, 'weekly');
      
      // Update "You" for the current user
      const mapDataForCurrentUser = (data: CrmPerformanceData[]): CrmPerformanceData[] => {
        return data.map(d => 
          currentUser && d.userId === currentUser.id 
            ? { ...d, userName: "You", role: currentUser.role as UserRole, userAvatar: currentUser.avatarUrl || d.userAvatar } 
            : d
        );
      };

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
      <div className="space-y-8 p-4 sm:p-6 lg:p-8 bg-background min-h-screen">
        <div className="flex flex-col sm:flex-row items-center justify-between">
           <h1 className="text-3xl sm:text-4xl font-extrabold text-center sm:text-left text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-red-500 mb-2 sm:mb-0">
            Leaderboard
          </h1>
        </div>
        <Skeleton className="h-10 w-full sm:w-1/3 mx-auto rounded-md" /> {/* TabsList Skeleton */}
        <Skeleton className="h-6 w-1/4 mx-auto rounded-md mt-2 mb-4" /> {/* Period Label Skeleton */}
        <div className="flex flex-col sm:flex-row justify-around items-end gap-3 sm:gap-2 md:gap-0 mt-4 sm:mt-8 px-2 sm:px-0">
          {[...Array(3)].map((_, i) => (
            <Card key={`podium-skel-${i}`} className="flex-1 w-full sm:w-auto flex flex-col items-center p-3 sm:p-4 md:p-6 rounded-2xl shadow-xl">
              <Skeleton className="h-6 w-8 mb-2 sm:mb-3 rounded" />
              <Skeleton className="h-16 w-16 sm:h-20 md:h-24 sm:w-20 md:w-24 rounded-full mb-2 sm:mb-3 md:mb-4" />
              <Skeleton className="h-5 w-24 mb-1 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-3 w-12 mt-1 rounded" />
            </Card>
          ))}
        </div>
        <div className="space-y-2 sm:space-y-2.5 md:space-y-3 mt-6 sm:mt-8">
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
              <CardContent className="p-6">
                <p className="text-destructive text-center">{fetchError}</p>
              </CardContent>
            </Card>
        </div>
      );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 bg-background min-h-screen">
       <div className="flex flex-col sm:flex-row items-center justify-between">
         <h1 className="text-3xl sm:text-4xl font-extrabold text-center sm:text-left text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-red-500 mb-2 sm:mb-0">
            Leaderboard
          </h1>
          {/* Placeholder for future actions like "Export" or "Settings" */}
      </div>
      
      <LeaderboardClientTabs
        monthlyPerformanceData={crmMonthlyPerformance}
        weeklyPerformanceData={crmWeeklyPerformance}
        currentUser={currentUser}
      />
    </div>
  );
}


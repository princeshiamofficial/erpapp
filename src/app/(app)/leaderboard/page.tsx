
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { getUsers } from '@/lib/user-service';
import { getOrders } from '@/lib/order-service';
import { getGlobalSettings } from '@/lib/settings-service';
import { ChevronLeft, Crown } from 'lucide-react';
import Link from 'next/link';
import { LeaderboardDisplay } from '@/components/leaderboard/LeaderboardDisplay';
import type { User, TrackingLink, GlobalSettings, UserRole } from '@/types';
import {
  isWithinInterval,
  parseISO,
  subDays,
  differenceInDays,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker, type PredefinedRange } from '@/components/dashboard/date-range-picker';
import type { DateRange } from "react-day-picker";
import { SalesPerformanceClient } from '@/components/leaderboard/SalesPerformanceClient';

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
  const [performanceData, setPerformanceData] = useState<CrmPerformanceData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return {
      from: startOfDay(today),
      to: endOfDay(today),
    };
  });
  const [currentDateRangeLabel, setCurrentDateRangeLabel] = useState("Today");

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allOrders, setAllOrders] = useState<TrackingLink[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  const [currentLeaderboardBackground, setCurrentLeaderboardBackground] = useState<string | null | undefined>(undefined);

  const calculatePerformance = useCallback((
    crmUsers: User[],
    orders: TrackingLink[],
    globalSettings: GlobalSettings,
    dateRange: DateRange | undefined
  ): CrmPerformanceData[] => {
    if (!dateRange?.from || !dateRange?.to) {
        return [];
    }
    const periodStart = new Date(dateRange.from);
    const periodEnd = new Date(dateRange.to);
    periodStart.setHours(0,0,0,0);
    periodEnd.setHours(23,59,59,999);
    
    // The metric is now the number of orders created in the date range.
    // The crmCompletionStatusIds are no longer needed for this calculation.

    const numDaysInRange = differenceInDays(periodEnd, periodStart) + 1;

    const performanceDataList = crmUsers.map(crmUser => {
      // Filter orders created by this CRM within the date range
      const ordersCreatedInPeriod = orders.filter(order => 
        order.crmUserId === crmUser.id &&
        order.createdAt && 
        isWithinInterval(parseISO(order.createdAt), { start: periodStart, end: periodEnd })
      ).length;
      
      const monthlyTarget = (crmUser.monthlyOrderTarget ?? globalSettings.globalMonthlyOrderTarget ?? 0);
      const dailyTarget = monthlyTarget / 30; // Assume 30 days in a month for simplicity
      const target = Math.round(dailyTarget * numDaysInRange);

      return {
        userId: crmUser.id,
        userName: crmUser.name,
        userAvatar: crmUser.avatarUrl || undefined,
        ordersCompleted: ordersCreatedInPeriod, // This now represents orders CREATED
        target: target,
        role: crmUser.role,
        trend: 'same',
        pointChange: 0,
      };
    });

    performanceDataList.sort((a, b) => b.ordersCompleted - a.ordersCompleted || a.userName.localeCompare(b.userName));
    performanceDataList.forEach((user, index) => {
      user.rank = index + 1;
    });

    return performanceDataList;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setIsLoadingData(false);
        return;
      }
      setIsLoadingData(true);
      setFetchError(null);
      try {
        const [fetchedUsers, fetchedOrders, fetchedSettings] = await Promise.all([
          getUsers(),
          getOrders(),
          getGlobalSettings(),
        ]);

        setAllUsers(fetchedUsers);
        setAllOrders(fetchedOrders);
        setGlobalSettings(fetchedSettings);
        setCurrentLeaderboardBackground(fetchedSettings.leaderboardBackgroundImageUrl);

      } catch (error) {
        console.error("Failed to fetch leaderboard data:", error);
        setFetchError("Could not load leaderboard data. Please try again later.");
        toast({ title: "Error", description: "Could not load leaderboard data.", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    };

    if (currentUser && !isAuthLoading) {
      fetchData();
    }
  }, [currentUser, isAuthLoading, toast]);


  useEffect(() => {
    if (isLoadingData || !allUsers.length || !globalSettings || !selectedDateRange) return;

    const crmUsers = allUsers.filter(user => user.role === 'CRM');

    // This function will now be called inside the useEffect hook to avoid hydration mismatch
    const generateAndSetPerformanceData = () => {
        let data = calculatePerformance(crmUsers, allOrders, globalSettings, selectedDateRange);
        
        // Add trend and point change logic here, on the client-side
        data = data.map(d => {
            const pointChange = Math.floor(Math.random() * 5) - 2;
            const trend = pointChange > 0 ? 'up' : pointChange < 0 ? 'down' : 'same';
            return {
                ...d,
                trend,
                pointChange: Math.abs(pointChange)
            };
        });

        // Highlight current user
        data = data.map(d =>
            currentUser && d.userId === currentUser.id
            ? { ...d, userName: "You", role: currentUser.role as UserRole, userAvatar: currentUser.avatarUrl || d.userAvatar }
            : d
        );
        
        setPerformanceData(data);
    };

    generateAndSetPerformanceData();

  }, [isLoadingData, allUsers, allOrders, globalSettings, selectedDateRange, currentUser, calculatePerformance]);
  

  const handleDateRangeChange = (range: DateRange | undefined, displayLabel: string, predefinedValue: PredefinedRange | "custom" | null) => {
    setSelectedDateRange(range);
    setCurrentDateRangeLabel(displayLabel);
  };

  const isLoadingContent = isAuthLoading || isLoadingData || !selectedDateRange;

  if (isLoadingContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--leaderboard-bg-main-start))] to-[hsl(var(--leaderboard-bg-main-end))] text-[hsl(var(--leaderboard-text-light))] p-4 relative overflow-hidden">

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{backgroundImage: "url('https://i.ibb.co/PGBMbxBc/360-F-338486227-q-Qit-Uvh3n-ILq-Yiu-QOUGxdfindo-NMbtp-H.jpg')"}}
          data-ai-hint="abstract orange fire particles"
        ></div>
        <header className="relative z-10 flex items-center justify-between py-3 px-2 mb-6">
            <Link href="/dashboard" className="p-2 -ml-2">
                
            </Link>
            <h1 className="text-xl font-semibold tracking-wider">LEADERBOARD</h1>
            <Skeleton className="h-9 w-36 rounded-md bg-white/10" />
        </header>
        <div className="relative z-10 text-center mb-8">
          <Crown className="h-10 w-10 text-[hsl(var(--leaderboard-gold))] mx-auto mb-2 opacity-50" />
          <div className="flex justify-around items-end max-w-md mx-auto">
            <Skeleton className="h-40 w-24 rounded-t-full bg-[hsl(var(--leaderboard-podium-bg))] opacity-50" />
            <Skeleton className="h-48 w-28 rounded-t-full bg-[hsl(var(--leaderboard-podium-bg))] opacity-50" />
            <Skeleton className="h-40 w-24 rounded-t-full bg-[hsl(var(--leaderboard-podium-bg))] opacity-50" />
          </div>
        </div>
        <div className="relative z-10 bg-[hsl(var(--leaderboard-list-area-bg))] p-4 rounded-t-3xl mt-[-30px] shadow-2xl">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={`list-skel-${i}`} className="h-16 w-full rounded-lg mb-2 bg-gray-200/50" />
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--leaderboard-bg-main-start))] to-[hsl(var(--leaderboard-bg-main-end))] text-[hsl(var(--leaderboard-text-light))] p-4 flex flex-col items-center justify-center">
            <h1 className="text-xl font-semibold mb-4">Error</h1>
            <p>{fetchError}</p>
        </div>
      );
  }

  const bgStyle = currentLeaderboardBackground
    ? { backgroundImage: `url('${currentLeaderboardBackground}')` }
    : { backgroundImage: "url('https://i.ibb.co/PGBMbxBc/360-F-338486227-q-Qit-Uvh3n-ILq-Yiu-QOUGxdfindo-NMbtp-H.jpg')" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--leaderboard-bg-main-start))] to-[hsl(var(--leaderboard-bg-main-end))] text-[hsl(var(--leaderboard-text-light))] p-0 sm:p-0 md:p-0 lg:p-0 relative overflow-x-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={bgStyle}
        data-ai-hint={currentLeaderboardBackground ? "" : "abstract orange fire particles"}
      ></div>
      <header className="relative z-10 flex items-center justify-between py-4 px-4 sm:px-6 mb-4 sm:mb-6">
        <Link href="/dashboard" className="p-2 -ml-2 text-[hsl(var(--leaderboard-text-light))] hover:opacity-80 transition-opacity">
          
        </Link>
        <h1 className="text-lg sm:text-xl font-semibold tracking-wider text-[hsl(var(--leaderboard-text-light))]">LEADERBOARD</h1>
        {selectedDateRange && (
          <DateRangePicker 
            initialRange={selectedDateRange} 
            onDateRangeChange={handleDateRangeChange}
            className="w-auto bg-black/40 border-[hsl(var(--leaderboard-subtle-border))] text-[hsl(var(--leaderboard-text-light))] hover:bg-black/60 focus:ring-[hsl(var(--leaderboard-gold))] h-9 text-xs sm:text-sm"
          />
        )}
      </header>

      <LeaderboardDisplay
        performanceData={performanceData}
        currentUser={currentUser}
        timePeriodLabel={currentDateRangeLabel}
      />

    </div>
  );
}

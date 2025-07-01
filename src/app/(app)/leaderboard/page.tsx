
"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker, type PredefinedRange } from '@/components/dashboard/date-range-picker';
import { type DateRange } from "react-day-picker";

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
  
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>({
      from: subDays(new Date(), 29),
      to: new Date(),
  });
  const [currentDateRangeLabel, setCurrentDateRangeLabel] = useState("Last 30 Days");

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allOrders, setAllOrders] = useState<TrackingLink[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  const [currentLeaderboardBackground, setCurrentLeaderboardBackground] = useState<string | null | undefined>(undefined);

  const calculatePerformance = useCallback((
    crmUsers: User[],
    allOrders: TrackingLink[],
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

    const completionStatusIds = globalSettings.crmCompletionStatusIds || [];
    if (completionStatusIds.length === 0) {
        console.warn(`Leaderboard: No CRM completion status IDs configured. Performance will be 0.`);
    }

    const numDaysInRange = differenceInDays(periodEnd, periodStart) + 1;

    const performanceDataList = crmUsers.map(crmUser => {
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
      
      const monthlyTarget = (crmUser.monthlyOrderTarget ?? globalSettings.globalMonthlyOrderTarget ?? 0);
      const dailyTarget = monthlyTarget / 30; // Assume 30 days in a month for simplicity
      const target = Math.round(dailyTarget * numDaysInRange);

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

    performanceDataList.sort((a, b) => b.ordersCompleted - a.ordersCompleted || a.userName.localeCompare(b.userName));
    performanceDataList.forEach((user, index) => {
      user.rank = index + 1;
    });

    return performanceDataList;
  }, []);


  const fetchData = useCallback(async () => {
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
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchData();
    }
  }, [isAuthLoading, fetchData]);

  useEffect(() => {
    if (isLoadingData || !allUsers.length || !globalSettings) return;

    const crmUsers = allUsers.filter(user => user.role === 'CRM');

    const mapDataForCurrentUser = (data: CrmPerformanceData[]): CrmPerformanceData[] => {
      return data.map(d =>
        currentUser && d.userId === currentUser.id
          ? { ...d, userName: "You", role: currentUser.role as UserRole, userAvatar: currentUser.avatarUrl || d.userAvatar }
          : d
      );
    };

    const newPerformanceData = calculatePerformance(crmUsers, allOrders, globalSettings, selectedDateRange);
    setPerformanceData(mapDataForCurrentUser(newPerformanceData));

  }, [isLoadingData, allUsers, allOrders, globalSettings, selectedDateRange, currentUser, calculatePerformance]);

  const handleDateRangeChange = (range: DateRange | undefined, displayLabel: string, predefinedValue: PredefinedRange | "custom" | null) => {
    setSelectedDateRange(range);
    setCurrentDateRangeLabel(displayLabel);
  };

  if (isAuthLoading || (isLoadingData && !performanceData.length)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--leaderboard-bg-main-start))] to-[hsl(var(--leaderboard-bg-main-end))] text-[hsl(var(--leaderboard-text-light))] p-4 relative overflow-hidden">

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{backgroundImage: "url('https://i.ibb.co/PGBMbxBc/360-F-338486227-q-Qit-Uvh3n-ILq-Yiu-QOUGxdfindo-NMbtp-H.jpg')"}}
          data-ai-hint="abstract orange fire particles"
        ></div>
        <header className="relative z-10 flex items-center justify-between py-3 px-2 mb-6">
            <Link href="/dashboard" className="p-2 -ml-2">
                <ChevronLeft className="h-6 w-6" />
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
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-lg sm:text-xl font-semibold tracking-wider text-[hsl(var(--leaderboard-text-light))]">LEADERBOARD</h1>
        <DateRangePicker 
          initialRange={selectedDateRange} 
          onDateRangeChange={handleDateRangeChange}
        />
      </header>

      <LeaderboardDisplay
        performanceData={performanceData}
        currentUser={currentUser}
        timePeriodLabel={currentDateRangeLabel}
      />
    </div>
  );
}

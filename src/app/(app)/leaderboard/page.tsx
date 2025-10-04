

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { getUsers } from '@/lib/user-service';
import { getOrders } from '@/lib/order-service';
import { getGlobalSettings } from '@/lib/settings-service';
import { Crown, Printer, CheckCircle, Briefcase, ArrowUp, ArrowDown } from 'lucide-react';
import { LeaderboardDisplay } from '@/components/leaderboard/LeaderboardDisplay';
import type { User, TrackingLink, GlobalSettings, UserRole } from '@/types';
import {
  isWithinInterval,
  parseISO,
  differenceInDays,
  startOfDay,
  endOfDay,
  sub,
  format,
} from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker, type PredefinedRange } from '@/components/dashboard/date-range-picker';
import type { DateRange } from "react-day-picker";
import { SalesPerformanceClient } from '@/components/leaderboard/SalesPerformanceClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LOGISTICS_STATUS_ID } from '@/lib/status-service';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

// CrmPerformanceData type might be better defined within LeaderboardDisplay or a shared types file if complex
export interface CrmPerformanceData {
  userId: string;
  userName: string;
  userAvatar?: string;
  ordersCompleted: number; // This is the "points" for CRs
  target: number;
  designsAssigned?: number; // Specific for DRs
  designsDone?: number; // Specific for DRs
  rank?: number;
  role?: UserRole;
  trend?: 'up' | 'down' | 'same';
  pointChange?: number;
}


export default function LeaderboardPage() {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [performanceData, setPerformanceData] = useState<CrmPerformanceData[]>([]);
  const [drPerformanceData, setDrPerformanceData] = useState<CrmPerformanceData[]>([]);
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
  
  const [activeTab, setActiveTab] = useState<'cr_board' | 'dr_board'>(
    currentUser?.role === 'DESIGNER_REPRESENTATIVE' ? 'dr_board' : 'cr_board'
  );

  useEffect(() => {
    if (currentUser?.role === 'DESIGNER_REPRESENTATIVE') {
      setActiveTab('dr_board');
    } else if (currentUser?.role === 'CRM') {
      setActiveTab('cr_board');
    } else if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN') {
      setActiveTab('cr_board');
    }
  }, [currentUser]);


  const [currentLeaderboardBackground, setCurrentLeaderboardBackground] = useState<string | null | undefined>(undefined);

  const calculatePerformance = useCallback((
    users: User[],
    orders: TrackingLink[],
    globalSettings: GlobalSettings,
    dateRange: DateRange | undefined,
    roleToCalculate: UserRole
  ): CrmPerformanceData[] => {
    if (!dateRange?.from || !dateRange?.to) {
        return [];
    }
    const periodStart = new Date(dateRange.from);
    const periodEnd = new Date(dateRange.to);
    periodStart.setHours(0,0,0,0);
    periodEnd.setHours(23,59,59,999);
    
    const numDaysInRange = differenceInDays(periodEnd, periodStart) + 1;

    const roleFilteredUsers = users.filter(user => user.role === roleToCalculate);

    const performanceDataList = roleFilteredUsers.map(user => {
      let ordersCreatedInPeriod = 0;
      let designsAssigned = 0;
      let designsDone = 0;

      if (roleToCalculate === 'CRM') {
        ordersCreatedInPeriod = orders.filter(order => 
          order.crmUserId === user.id &&
          order.createdAt && 
          isWithinInterval(parseISO(order.createdAt), { start: periodStart, end: periodEnd })
        ).length;
      } else if (roleToCalculate === 'DESIGNER_REPRESENTATIVE') {
          designsAssigned = orders.filter(order =>
              order.designerRepresentativeId === user.id &&
              order.statusHistory.some(h => h.status === 'ready-for-design' && isWithinInterval(parseISO(h.timestamp), { start: periodStart, end: periodEnd }))
          ).length;
          designsDone = orders.filter(order =>
              order.designerRepresentativeId === user.id &&
              order.statusHistory.some(h => h.status === LOGISTICS_STATUS_ID && isWithinInterval(parseISO(h.timestamp), { start: periodStart, end: periodEnd }))
          ).length;
      }
      
      const roleBasedTargets = globalSettings.roleBasedTargets || {};
      const monthlyTarget = (user.monthlyOrderTarget ?? roleBasedTargets[roleToCalculate as keyof typeof roleBasedTargets] ?? 0);
      const dailyTarget = monthlyTarget / 30;
      const target = Math.round(dailyTarget * numDaysInRange);

      return {
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatarUrl || undefined,
        ordersCompleted: ordersCreatedInPeriod,
        designsAssigned,
        designsDone,
        target: target,
        role: user.role,
        trend: 'same',
        pointChange: 0,
      };
    });
    
    const sortKey = roleToCalculate === 'DESIGNER_REPRESENTATIVE' ? 'designsDone' : 'ordersCompleted';

    performanceDataList.sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0) || a.userName.localeCompare(b.userName));
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
    if (isLoadingData || !allUsers.length || !globalSettings || !selectedDateRange?.from || !selectedDateRange?.to) return;
    
    const rangeDuration = differenceInDays(selectedDateRange.to!, selectedDateRange.from!);
    const previousPeriodStart = sub(selectedDateRange.from!, { days: rangeDuration + 1 });
    const previousPeriodEnd = sub(selectedDateRange.to!, { days: rangeDuration + 1 });
    const previousPeriodRange = { from: previousPeriodStart, to: previousPeriodEnd };

    // Calculate for CR
    let crData = calculatePerformance(allUsers, allOrders, globalSettings, selectedDateRange, 'CRM');
    const prevCrData = calculatePerformance(allUsers, allOrders, globalSettings, previousPeriodRange, 'CRM');
    const prevCrMap = new Map(prevCrData.map(d => [d.userId, d]));
    crData = crData.map(currentData => {
        const prevData = prevCrMap.get(currentData.userId);
        const pointChange = currentData.ordersCompleted - (prevData?.ordersCompleted || 0);
        return {
            ...currentData,
            trend: pointChange > 0 ? 'up' : pointChange < 0 ? 'down' : 'same',
            pointChange: Math.abs(pointChange)
        };
    });

    // Calculate for DR
    let drData = calculatePerformance(allUsers, allOrders, globalSettings, selectedDateRange, 'DESIGNER_REPRESENTATIVE');
    const prevDrData = calculatePerformance(allUsers, allOrders, globalSettings, previousPeriodRange, 'DESIGNER_REPRESENTATIVE');
    const prevDrMap = new Map(prevDrData.map(d => [d.userId, d]));
    drData = drData.map(currentData => {
        const prevData = prevDrMap.get(currentData.userId);
        const pointChange = (currentData.designsDone || 0) - (prevData?.designsDone || 0);
        return {
            ...currentData,
            trend: pointChange > 0 ? 'up' : pointChange < 0 ? 'down' : 'same',
            pointChange: Math.abs(pointChange)
        };
    });

    setPerformanceData(crData);
    setDrPerformanceData(drData);

  }, [isLoadingData, allUsers, allOrders, globalSettings, selectedDateRange, calculatePerformance]);
  

  const handleDateRangeChange = (range: DateRange | undefined, displayLabel: string, predefinedValue: PredefinedRange | "custom" | null) => {
    setSelectedDateRange(range);
    setCurrentDateRangeLabel(displayLabel);
  };
  
  const showTabs = useMemo(() => {
    if (!currentUser) return false;
    return ['SYSTEM_ADMIN', 'ADMIN'].includes(currentUser.role);
  }, [currentUser]);

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
    
  const dataForActiveTab = activeTab === 'cr_board' ? performanceData : drPerformanceData;
  const currentLeaderboardData = dataForActiveTab.map(d =>
    currentUser && d.userId === currentUser.id
      ? { ...d, userName: "You" }
      : d
  );

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--leaderboard-bg-main-start))] to-[hsl(var(--leaderboard-bg-main-end))] text-[hsl(var(--leaderboard-text-light))] p-0 sm:p-0 md:p-0 lg:p-0 relative overflow-x-hidden print:hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={bgStyle}
          data-ai-hint={currentLeaderboardBackground ? "" : "abstract orange fire particles"}
        ></div>
        <header className="relative z-10 flex items-center justify-center text-center py-4 px-4 sm:px-6 mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-xl font-semibold tracking-wider text-[hsl(var(--leaderboard-text-light))]">LEADERBOARD</h1>
          <div className="absolute right-4 sm:right-6 flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="bg-black/40 border-[hsl(var(--leaderboard-subtle-border))] text-[hsl(var(--leaderboard-text-light))] hover:bg-black/60 focus:ring-[hsl(var(--leaderboard-gold))] h-9 w-9"
                title="Print Leaderboard"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
              </Button>
              {selectedDateRange && (
                  <DateRangePicker 
                    initialRange={selectedDateRange} 
                    onDateRangeChange={handleDateRangeChange}
                    className="w-auto bg-black/40 border-[hsl(var(--leaderboard-subtle-border))] text-[hsl(var(--leaderboard-text-light))] hover:bg-black/60 focus:ring-[hsl(var(--leaderboard-gold))] h-9 text-xs sm:text-sm"
                  />
              )}
          </div>
        </header>
        
        {showTabs ? (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'cr_board' | 'dr_board')} className="w-full relative z-10">
              <TabsList className="grid w-full grid-cols-2 max-w-sm mx-auto bg-black/30 border-none text-white/80">
                <TabsTrigger value="cr_board">CR Board</TabsTrigger>
                <TabsTrigger value="dr_board">DR Board</TabsTrigger>
              </TabsList>
              <TabsContent value="cr_board" className="mt-4">
                  <LeaderboardDisplay
                      performanceData={currentLeaderboardData}
                      currentUser={currentUser}
                      timePeriodLabel={currentDateRangeLabel}
                  />
              </TabsContent>
              <TabsContent value="dr_board" className="mt-4">
                  <LeaderboardDisplay
                      performanceData={currentLeaderboardData}
                      currentUser={currentUser}
                      timePeriodLabel={currentDateRangeLabel}
                  />
              </TabsContent>
            </Tabs>
        ) : (
            <div className="mt-4">
                <LeaderboardDisplay
                    performanceData={currentLeaderboardData}
                    currentUser={currentUser}
                    timePeriodLabel={currentDateRangeLabel}
                />
            </div>
        )}
      </div>

      <div className="hidden print:block p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Leaderboard Report</h1>
        <p className="text-center text-muted-foreground text-sm mb-6">
          Date Range: {currentDateRangeLabel} ({format(selectedDateRange?.from || new Date(), 'd MMM yyyy')} - {format(selectedDateRange?.to || new Date(), 'd MMM yyyy')})
        </p>

        {/* CR Table */}
        <section className="mb-8">
            <h2 className="text-lg font-semibold mb-2">CR Performance</h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-center">Sales</TableHead>
                        <TableHead className="text-center">Target</TableHead>
                        <TableHead className="w-48 text-center">Performance</TableHead>
                        <TableHead className="text-center">Trend</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {performanceData.map(user => {
                      const performanceValue = user.target > 0 ? (user.ordersCompleted / user.target) * 100 : 0;
                      return (
                        <TableRow key={`print-cr-${user.userId}`}>
                            <TableCell className="font-bold text-lg">{user.rank}</TableCell>
                            <TableCell>{user.userName}</TableCell>
                            <TableCell className="text-center font-mono">{user.ordersCompleted}</TableCell>
                            <TableCell className="text-center font-mono">{user.target}</TableCell>
                            <TableCell>
                                <Progress value={Math.min(100, performanceValue)} indicatorClassName="bg-primary" />
                            </TableCell>
                            <TableCell className={cn(
                              "text-center font-semibold flex items-center justify-center gap-1",
                              user.trend === 'up' && 'text-green-600',
                              user.trend === 'down' && 'text-red-600',
                            )}>
                              {user.trend === 'up' && <ArrowUp className="h-4 w-4" />}
                              {user.trend === 'down' && <ArrowDown className="h-4 w-4" />}
                              {user.pointChange !== 0 ? user.pointChange : '-'}
                            </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
            </Table>
        </section>

        {/* DR Table */}
        <section>
            <h2 className="text-lg font-semibold mb-2">Designer Representative Performance</h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-center">Designs Done</TableHead>
                        <TableHead className="text-center">Designs Assigned</TableHead>
                         <TableHead className="w-48 text-center">Performance</TableHead>
                         <TableHead className="text-center">Trend</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {drPerformanceData.map(user => {
                        const performanceValue = (user.designsAssigned || 0) > 0 ? ((user.designsDone || 0) / (user.designsAssigned || 1)) * 100 : 0;
                        return (
                            <TableRow key={`print-dr-${user.userId}`}>
                                <TableCell className="font-bold text-lg">{user.rank}</TableCell>
                                <TableCell>{user.userName}</TableCell>
                                <TableCell className="text-center font-mono">{user.designsDone}</TableCell>
                                <TableCell className="text-center font-mono">{user.designsAssigned}</TableCell>
                                <TableCell>
                                    <Progress value={Math.min(100, performanceValue)} indicatorClassName="bg-green-500" />
                                </TableCell>
                                <TableCell className={cn(
                                  "text-center font-semibold flex items-center justify-center gap-1",
                                  user.trend === 'up' && 'text-green-600',
                                  user.trend === 'down' && 'text-red-600',
                                )}>
                                  {user.trend === 'up' && <ArrowUp className="h-4 w-4" />}
                                  {user.trend === 'down' && <ArrowDown className="h-4 w-4" />}
                                  {user.pointChange !== 0 ? user.pointChange : '-'}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </section>
      </div>
    </>
  );
}

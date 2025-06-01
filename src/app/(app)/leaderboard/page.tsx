
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUsers } from '@/lib/user-service';
import { getOrders } from '@/lib/order-service';
import type { User, TrackingLink, GlobalSettings } from '@/types'; // Changed GlobalSalesTargets to GlobalSettings
import { getGlobalSettings } from '@/lib/settings-service';
import { LeaderboardClientTabs } from '@/components/leaderboard/LeaderboardClientTabs';

const DEFAULT_GLOBAL_SETTINGS_STATE: GlobalSettings = { // Changed type and variable name
  globalMonthlyOrderTarget: 0,
  globalWeeklyOrderTarget: 0,
  crmCompletionStatusIds: [],
  areCommentsVisibleOnPublicPage: true, // Added missing default fields
  rolesAllowedToEditOrders: ['SYSTEM_ADMIN', 'ADMIN'], // Added missing default fields
};

interface CrmPerformanceData {
  userId: string;
  userName: string;
  userAvatar?: string;
  ordersCompleted: number;
  target: number;
  rank?: number;
}

interface CalculatePerformanceOptions {
  targetField: 'monthlyOrderTarget' | 'weeklyOrderTarget';
  crmCompletionStatusIds: string[];
}

const calculatePerformanceData = (
  crmUsers: User[],
  allOrders: TrackingLink[],
  globalTargetValue: number,
  options: CalculatePerformanceOptions
): CrmPerformanceData[] => {
  const { targetField, crmCompletionStatusIds } = options;

  return crmUsers
    .map(user => {
      const userOrders = allOrders.filter(order => order.crmUserId === user.id);
      
      // Calculate completed orders based on crmCompletionStatusIds
      const completedUserOrders = userOrders.filter(order => 
        crmCompletionStatusIds.includes(order.currentStatus)
      );
      const ordersCompleted = completedUserOrders.length;
      
      const specificTarget = user[targetField];

      return {
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatarUrl || undefined,
        ordersCompleted: ordersCompleted,
        target: specificTarget && specificTarget > 0 ? specificTarget : globalTargetValue,
      };
    })
    .sort((a, b) => {
      if (b.ordersCompleted === a.ordersCompleted) {
        return a.target === b.target ? a.userName.localeCompare(b.userName) : (a.target || 0) - (b.target || 0);
      }
      return b.ordersCompleted - a.ordersCompleted;
    })
    .map((crm, index) => ({ ...crm, rank: index + 1 }));
};

export default async function LeaderboardPage() {
  let crmMonthlyPerformance: CrmPerformanceData[] = [];
  let crmWeeklyPerformance: CrmPerformanceData[] = [];
  let fetchError: string | null = null;
  let fetchedGlobalSettings: GlobalSettings = DEFAULT_GLOBAL_SETTINGS_STATE; // Use GlobalSettings


  try {
    const [globalSettingsData, allUsers, allOrders] = await Promise.all([
      getGlobalSettings(),
      getUsers(),
      getOrders(),
    ]);

    fetchedGlobalSettings = globalSettingsData;

    const crmUsers = allUsers.filter(user => user.role === 'CRM' && !user.isBanned);
    const completionStatusIds = fetchedGlobalSettings.crmCompletionStatusIds ?? [];

    crmMonthlyPerformance = calculatePerformanceData(
      crmUsers,
      allOrders,
      fetchedGlobalSettings.globalMonthlyOrderTarget,
      {
        targetField: 'monthlyOrderTarget',
        crmCompletionStatusIds: completionStatusIds
      }
    );
    crmWeeklyPerformance = calculatePerformanceData(
      crmUsers,
      allOrders,
      fetchedGlobalSettings.globalWeeklyOrderTarget,
      {
        targetField: 'weeklyOrderTarget',
        crmCompletionStatusIds: completionStatusIds
      }
    );

  } catch (error) {
    console.error("Failed to fetch leaderboard data:", error);
    fetchError = "Could not load leaderboard data. Please try again later.";
    crmMonthlyPerformance = [];
    crmWeeklyPerformance = [];
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="page-header">
        <h1 className="page-title">CRM Sales Leaderboard</h1>
        <p className="page-description">
          Ranking of CRM performance based on orders completed according to defined target statuses. Targets are specific to each CRM or fall back to global defaults.
        </p>
      </div>

      {fetchError && (
        <Card className="shadow-xl bg-destructive/10 border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">{fetchError}</p>
          </CardContent>
        </Card>
      )}

      {!fetchError && (
        <LeaderboardClientTabs
          monthlyPerformanceData={crmMonthlyPerformance}
          weeklyPerformanceData={crmWeeklyPerformance}
        />
      )}
    </div>
  );
}

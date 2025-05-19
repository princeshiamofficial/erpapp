
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUsers } from '@/lib/user-service';
import { getOrders } from '@/lib/order-service';
import type { User, TrackingLink, GlobalSalesTargets } from '@/types';
import { getGlobalSalesTargets } from '@/lib/settings-service';
import { LeaderboardClientTabs } from '@/components/leaderboard/LeaderboardClientTabs'; // New Client Component

const DEFAULT_GLOBAL_TARGETS_STATE: GlobalSalesTargets = {
  globalMonthlyOrderTarget: 0,
  globalWeeklyOrderTarget: 0,
};

interface CrmPerformanceData {
  userId: string;
  userName: string;
  userAvatar?: string;
  ordersCompleted: number;
  target: number;
  rank?: number;
}

// This function can remain server-side as it's pure data transformation
const calculatePerformanceData = (
  crmUsers: User[],
  allOrders: TrackingLink[],
  globalTargetValue: number,
  targetField: 'monthlyOrderTarget' | 'weeklyOrderTarget',
  isWeekly: boolean = false // Add a flag for weekly to use a different logic if needed for "ordersCompleted"
): CrmPerformanceData[] => {
  return crmUsers
    .map(user => {
      // For now, ordersCompleted is total orders. This might need refinement
      // if "completed" means something specific for weekly vs monthly.
      const userOrders = allOrders.filter(order => order.crmUserId === user.id);
      const ordersCompleted = userOrders.length;
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

  try {
    const [fetchedGlobalTargets, allUsers, allOrders] = await Promise.all([
      getGlobalSalesTargets(),
      getUsers(),
      getOrders(),
    ]);

    const crmUsers = allUsers.filter(user => user.role === 'CRM' && !user.isBanned);

    crmMonthlyPerformance = calculatePerformanceData(
      crmUsers,
      allOrders,
      fetchedGlobalTargets.globalMonthlyOrderTarget,
      'monthlyOrderTarget'
    );
    crmWeeklyPerformance = calculatePerformanceData(
      crmUsers,
      allOrders,
      fetchedGlobalTargets.globalWeeklyOrderTarget,
      'weeklyOrderTarget',
      true // Pass true if weekly calculation needs to differ for "ordersCompleted"
    );

  } catch (error) {
    console.error("Failed to fetch leaderboard data:", error);
    fetchError = "Could not load leaderboard data. Please try again later.";
    // Return default empty arrays in case of error
    crmMonthlyPerformance = [];
    crmWeeklyPerformance = [];
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="page-header">
        <h1 className="page-title">CRM Sales Leaderboard</h1>
        <p className="page-description">
          Ranking of CRM performance based on orders managed. Targets are specific to each CRM or fall back to global defaults.
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

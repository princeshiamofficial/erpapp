
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Star, Users, Target as TargetIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from 'framer-motion';
import { MOCK_USERS } from '@/lib/auth-constants'; // Assuming MOCK_USERS contains target info
import { Progress } from '@/components/ui/progress';

const LOCAL_STORAGE_GLOBAL_MONTHLY_SALES_TARGET_KEY = 'trackflow-global-monthly-sales-target';
const LOCAL_STORAGE_GLOBAL_WEEKLY_SALES_TARGET_KEY = 'trackflow-global-weekly-sales-target';
const DEFAULT_GLOBAL_MONTHLY_TARGET = 100;
const DEFAULT_GLOBAL_WEEKLY_TARGET = 20;

interface CrmPerformanceData {
  userId: string;
  userName: string;
  userAvatar?: string;
  ordersCompleted: number;
  target: number;
  rank?: number;
}

const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
};

const getRankIcon = (rank?: number) => {
  if (!rank) return <span className="text-sm font-medium text-muted-foreground">{rank || '-'}</span>;
  if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-400" title="Gold" />;
  if (rank === 2) return <Trophy className="h-6 w-6 text-slate-400" title="Silver" />;
  if (rank === 3) return <Trophy className="h-6 w-6 text-orange-400" title="Bronze" />;
  return <Star className="h-5 w-5 text-muted-foreground" title={`Rank ${rank}`} />;
};

const getRankColorClass = (rank?: number): string => {
  if (!rank) return 'border-border';
  if (rank === 1) return 'border-yellow-400 bg-yellow-400/10 hover:shadow-yellow-400/20';
  if (rank === 2) return 'border-slate-400 bg-slate-400/10 hover:shadow-slate-400/20';
  if (rank === 3) return 'border-orange-400 bg-orange-400/10 hover:shadow-orange-400/20';
  return 'border-border bg-card hover:shadow-md';
};

const getProgressColorClass = (percentage: number): string => {
  if (percentage < 0) percentage = 0;
  const colorPercentage = Math.min(percentage, 100);
  if (colorPercentage <= 33) return '[&>div]:bg-destructive';
  if (colorPercentage <= 66) return '[&>div]:bg-yellow-400';
  return '[&>div]:bg-green-500';
};

const LeaderboardList: React.FC<{ data: CrmPerformanceData[], timePeriod: 'month' | 'week' }> = ({ data, timePeriod }) => {
  return (
    <ScrollArea className="h-[calc(100vh-280px)] md:h-auto md:max-h-[calc(100vh-320px)]"> {/* Adjusted height */}
      <div className="p-1 sm:p-4 md:p-6 space-y-4">
        {data.map((crm) => {
          const progressPercentage = crm.target > 0 ? (crm.ordersCompleted / crm.target) * 100 : 0;
          const progressColor = getProgressColorClass(progressPercentage);
          return (
            <motion.div
              layout 
              key={crm.userId} 
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 ease-in-out shadow-sm hover:shadow-lg hover:scale-[1.01] ${getRankColorClass(crm.rank)}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex-shrink-0 w-8 h-10 flex items-center justify-center text-lg font-bold">
                 {getRankIcon(crm.rank)}
              </div>
              <Avatar className="h-10 w-10 border-2 border-primary/30">
                <AvatarImage src={crm.userAvatar || `https://placehold.co/48x48.png?text=${getInitials(crm.userName)}`} alt={crm.userName} data-ai-hint="user avatar" />
                <AvatarFallback className="text-base bg-primary/20 text-primary">{getInitials(crm.userName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-md font-semibold text-foreground leading-tight truncate">{crm.userName}</p>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {crm.ordersCompleted} / {crm.target} orders this {timePeriod}
                </div>
                <Progress value={Math.min(progressPercentage, 100)} className={`h-1.5 mt-1 ${progressColor}`} />
              </div>
              <div className="text-md font-bold text-primary ml-2">
                #{crm.rank}
              </div>
            </motion.div>
          );
        })}
        {data.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground">
            <Users className="w-20 h-20 mb-4 opacity-50" />
            <p className="text-lg">No CRM performance data available for this {timePeriod}.</p>
            <p>Check back later for updates.</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default function LeaderboardPage() {
  const [globalMonthlyTarget, setGlobalMonthlyTarget] = useState(DEFAULT_GLOBAL_MONTHLY_TARGET);
  const [globalWeeklyTarget, setGlobalWeeklyTarget] = useState(DEFAULT_GLOBAL_WEEKLY_TARGET);

  useEffect(() => {
    const storedMonthly = localStorage.getItem(LOCAL_STORAGE_GLOBAL_MONTHLY_SALES_TARGET_KEY);
    if (storedMonthly) setGlobalMonthlyTarget(parseInt(storedMonthly, 10));
    const storedWeekly = localStorage.getItem(LOCAL_STORAGE_GLOBAL_WEEKLY_SALES_TARGET_KEY);
    if (storedWeekly) setGlobalWeeklyTarget(parseInt(storedWeekly, 10));
  }, []);

  const crmUsers = MOCK_USERS.filter(user => user.role === 'CRM');

  const mockCrmMonthlyPerformance: CrmPerformanceData[] = crmUsers.map(user => ({
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatarUrl || `https://placehold.co/40x40.png?text=${getInitials(user.name)}`,
    ordersCompleted: Math.floor(Math.random() * (user.monthlyOrderTarget || globalMonthlyTarget) * 1.1),
    target: user.monthlyOrderTarget || globalMonthlyTarget || DEFAULT_GLOBAL_MONTHLY_TARGET,
  })).sort((a, b) => b.ordersCompleted - a.ordersCompleted)
   .map((crm, index) => ({ ...crm, rank: index + 1 }));

  const mockCrmWeeklyPerformance: CrmPerformanceData[] = crmUsers.map(user => ({
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatarUrl || `https://placehold.co/40x40.png?text=${getInitials(user.name)}`,
    ordersCompleted: Math.floor(Math.random() * (user.weeklyOrderTarget || globalWeeklyTarget) * 1.1),
    target: user.weeklyOrderTarget || globalWeeklyTarget || DEFAULT_GLOBAL_WEEKLY_TARGET,
  })).sort((a, b) => b.ordersCompleted - a.ordersCompleted)
   .map((crm, index) => ({ ...crm, rank: index + 1 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CRM Sales Leaderboard</h1>
        <p className="text-muted-foreground">
          Ranking of CRM performance. Targets are specific to each CRM or fall back to global defaults.
        </p>
      </div>

      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monthly">Monthly Performance</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-95">
          <Card className="shadow-xl bg-card transition-all duration-300 ease-in-out hover:shadow-2xl">
            <CardHeader>
              <CardTitle className="text-foreground">Top Performing CRMs (Monthly)</CardTitle>
              <CardDescription className="text-muted-foreground">Monthly orders completed ranking against individual or global targets.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <LeaderboardList data={mockCrmMonthlyPerformance} timePeriod="month" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-95">
          <Card className="shadow-xl bg-card transition-all duration-300 ease-in-out hover:shadow-2xl">
            <CardHeader>
              <CardTitle className="text-foreground">Top Performing CRMs (Weekly)</CardTitle>
              <CardDescription className="text-muted-foreground">Weekly orders completed ranking against individual or global targets.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <LeaderboardList data={mockCrmWeeklyPerformance} timePeriod="week" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    
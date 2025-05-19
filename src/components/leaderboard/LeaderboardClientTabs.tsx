
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Star, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import type { GlobalSalesTargets } from '@/types'; // Assuming User type is also in types

interface CrmPerformanceData {
  userId: string;
  userName: string;
  userAvatar?: string;
  ordersCompleted: number;
  target: number;
  rank?: number;
}

interface LeaderboardClientTabsProps {
  monthlyPerformanceData: CrmPerformanceData[];
  weeklyPerformanceData: CrmPerformanceData[];
}

const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
};

const getRankIcon = (rank?: number) => {
  if (rank === undefined) return <span className="text-sm font-medium text-muted-foreground">-</span>;
  if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-400" title="Gold" />;
  if (rank === 2) return <Trophy className="h-6 w-6 text-slate-400" title="Silver" />;
  if (rank === 3) return <Trophy className="h-6 w-6 text-orange-400" title="Bronze" />;
  return <Star className="h-5 w-5 text-muted-foreground" title={`Rank ${rank}`} />;
};

const getRankColorClass = (rank?: number): string => {
  if (rank === undefined) return 'border-border';
  if (rank === 1) return 'border-yellow-400 bg-yellow-400/10 hover:shadow-yellow-400/20';
  if (rank === 2) return 'border-slate-400 bg-slate-400/10 hover:shadow-slate-400/20';
  if (rank === 3) return 'border-orange-400 bg-orange-400/10 hover:shadow-orange-400/20';
  return 'border-border bg-card hover:shadow-md';
};

const LeaderboardList: React.FC<{ data: CrmPerformanceData[], timePeriod: 'month' | 'week', isLoading?: boolean }> = ({ data, timePeriod, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="p-1 sm:p-4 md:p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={`skel-lb-${i}`} className="flex items-center space-x-3 p-3 rounded-lg border border-border/30 shadow-sm h-[76px]">
            <Skeleton className="h-10 w-8 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-muted-foreground">
          <Users className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg">No CRM performance data available for this period.</p>
          <p className="text-sm">Check back later or ensure CRMs have assigned orders.</p>
        </div>
      );
  }

  return (
    <ScrollArea className="h-auto max-h-[calc(100vh-380px)] sm:max-h-[calc(100vh-420px)]">
      <div className="p-1 sm:p-4 md:p-6 space-y-4">
        {data.map((crm) => (
            <motion.div
              layout
              key={crm.userId + timePeriod} 
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
                  {crm.ordersCompleted} / {crm.target > 0 ? crm.target : '-'} orders this {timePeriod}
                </div>
              </div>
              <div className="text-md font-bold text-primary ml-2">
                #{crm.rank}
              </div>
            </motion.div>
          )
        )}
      </div>
    </ScrollArea>
  );
};

export function LeaderboardClientTabs({ monthlyPerformanceData, weeklyPerformanceData }: LeaderboardClientTabsProps) {
  return (
    <Tabs defaultValue="monthly" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 sm:max-w-xs">
        <TabsTrigger value="monthly">Monthly Performance</TabsTrigger>
        <TabsTrigger value="weekly">Weekly Performance</TabsTrigger>
      </TabsList>

      <TabsContent value="monthly" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-95">
        <Card className="shadow-xl bg-card transition-all duration-300 ease-in-out hover:shadow-2xl">
          <CardHeader>
            <CardTitle className="text-foreground">Top Performing CRMs (Monthly)</CardTitle>
            <CardDescription className="text-muted-foreground">Monthly orders managed ranking against individual or global targets.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <LeaderboardList data={monthlyPerformanceData} timePeriod="month" />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="weekly" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-95">
        <Card className="shadow-xl bg-card transition-all duration-300 ease-in-out hover:shadow-2xl">
          <CardHeader>
            <CardTitle className="text-foreground">Top Performing CRMs (Weekly)</CardTitle>
            <CardDescription className="text-muted-foreground">Weekly orders managed ranking against individual or global targets.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <LeaderboardList data={weeklyPerformanceData} timePeriod="week" />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

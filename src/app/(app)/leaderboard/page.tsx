
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Star, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CrmPerformanceData {
  userId: string;
  userName: string;
  userAvatar?: string;
  ordersCompleted: number; // Generic field for orders
  rank?: number;
}

// Mock CRM monthly performance data
const mockCrmMonthlyPerformance: CrmPerformanceData[] = [
  { userId: 'user-crm-001', userName: 'Bob CRM', ordersCompleted: 75, userAvatar: `https://placehold.co/40x40.png?text=BC` },
  { userId: 'user-crm-002', userName: 'David CRM', ordersCompleted: 62, userAvatar: `https://placehold.co/40x40.png?text=DC` },
  { userId: 'user-crm-003', userName: 'Eve CRM', ordersCompleted: 88, userAvatar: `https://placehold.co/40x40.png?text=EC` },
  { userId: 'user-crm-004', userName: 'Frank CRM', ordersCompleted: 50, userAvatar: `https://placehold.co/40x40.png?text=FC` },
  { userId: 'user-crm-005', userName: 'Grace CRM', ordersCompleted: 95, userAvatar: `https://placehold.co/40x40.png?text=GC` },
  { userId: 'user-crm-006', userName: 'Henry CRM', ordersCompleted: 70, userAvatar: `https://placehold.co/40x40.png?text=HC` },
].sort((a, b) => b.ordersCompleted - a.ordersCompleted)
 .map((crm, index) => ({ ...crm, rank: index + 1 }));

 // Mock CRM weekly performance data
const mockCrmWeeklyPerformance: CrmPerformanceData[] = [
  { userId: 'user-crm-001', userName: 'Bob CRM', ordersCompleted: 18, userAvatar: `https://placehold.co/40x40.png?text=BC` },
  { userId: 'user-crm-002', userName: 'David CRM', ordersCompleted: 15, userAvatar: `https://placehold.co/40x40.png?text=DC` },
  { userId: 'user-crm-003', userName: 'Eve CRM', ordersCompleted: 22, userAvatar: `https://placehold.co/40x40.png?text=EC` },
  { userId: 'user-crm-004', userName: 'Frank CRM', ordersCompleted: 12, userAvatar: `https://placehold.co/40x40.png?text=FC` },
  { userId: 'user-crm-005', userName: 'Grace CRM', ordersCompleted: 25, userAvatar: `https://placehold.co/40x40.png?text=GC` },
  { userId: 'user-crm-006', userName: 'Henry CRM', ordersCompleted: 16, userAvatar: `https://placehold.co/40x40.png?text=HC` },
].sort((a, b) => b.ordersCompleted - a.ordersCompleted)
 .map((crm, index) => ({ ...crm, rank: index + 1 }));


const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
}

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
}

const LeaderboardList: React.FC<{ data: CrmPerformanceData[], timePeriod: 'month' | 'week' }> = ({ data, timePeriod }) => {
  return (
    <ScrollArea className="h-[calc(100vh-280px)] md:h-auto md:max-h-[600px]"> {/* Adjust height as needed */}
      <div className="p-6 space-y-4">
        {data.map((crm, index) => (
          <div 
            key={crm.userId} 
            className={`flex items-center space-x-4 p-4 rounded-lg border transition-all duration-300 ease-in-out shadow-sm hover:shadow-xl hover:scale-[1.02] ${getRankColorClass(crm.rank)} animate-slide-in-up`}
            style={{ animationDelay: `${index * 100}ms`, opacity: 0 }} // Initial opacity 0 for animation
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-xl font-bold">
               {getRankIcon(crm.rank)}
            </div>
            <Avatar className="h-12 w-12 border-2 border-primary/30">
              <AvatarImage src={crm.userAvatar || `https://placehold.co/48x48.png?text=${getInitials(crm.userName)}`} alt={crm.userName} data-ai-hint="user avatar" />
              <AvatarFallback className="text-lg bg-primary/20 text-primary">{getInitials(crm.userName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-lg font-semibold text-foreground leading-tight">{crm.userName}</p>
              <p className="text-sm text-muted-foreground">{crm.ordersCompleted} orders this {timePeriod}</p>
            </div>
            <div className="text-lg font-bold text-primary">
              #{crm.rank}
            </div>
          </div>
        ))}
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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CRM Sales Leaderboard</h1>
        <p className="text-muted-foreground">
          Ranking of CRM performance based on orders completed.
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
              <CardDescription className="text-muted-foreground">Monthly orders completed ranking.</CardDescription>
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
              <CardDescription className="text-muted-foreground">Weekly orders completed ranking.</CardDescription>
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


"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Star, Users } from 'lucide-react';
import Image from 'next/image';

interface CrmPerformanceData {
  userId: string;
  userName: string;
  userAvatar?: string;
  monthlyOrdersCompleted: number;
  rank?: number;
}

// Mock CRM performance data - in a real app, fetch this from your backend
const mockCrmPerformance: CrmPerformanceData[] = [
  { userId: 'user-crm-001', userName: 'Bob CRM', monthlyOrdersCompleted: 75, userAvatar: `https://placehold.co/40x40.png?text=BC` },
  { userId: 'user-crm-002', userName: 'David CRM', monthlyOrdersCompleted: 62, userAvatar: `https://placehold.co/40x40.png?text=DC` },
  { userId: 'user-crm-003', userName: 'Eve CRM', monthlyOrdersCompleted: 88, userAvatar: `https://placehold.co/40x40.png?text=EC` }, // Mock user
  { userId: 'user-crm-004', userName: 'Frank CRM', monthlyOrdersCompleted: 50, userAvatar: `https://placehold.co/40x40.png?text=FC` }, // Mock user
  { userId: 'user-crm-005', userName: 'Grace CRM', monthlyOrdersCompleted: 95, userAvatar: `https://placehold.co/40x40.png?text=GC` }, // Mock user
  { userId: 'user-crm-006', userName: 'Henry CRM', monthlyOrdersCompleted: 70, userAvatar: `https://placehold.co/40x40.png?text=HC` }, // Mock user
].sort((a, b) => b.monthlyOrdersCompleted - a.monthlyOrdersCompleted)
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

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CRM Sales Leaderboard</h1>
        <p className="text-muted-foreground">
          Ranking of CRM performance based on monthly orders completed.
        </p>
      </div>

      <Card className="shadow-xl bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Top Performing CRMs</CardTitle>
          <CardDescription className="text-muted-foreground">Monthly orders completed ranking.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-220px)] md:h-auto md:max-h-[600px]"> {/* Adjust height as needed */}
            <div className="p-6 space-y-4">
              {mockCrmPerformance.map((crm) => (
                <div key={crm.userId} className={`flex items-center space-x-4 p-4 rounded-lg border transition-all duration-200 ease-in-out shadow-sm hover:shadow-lg ${getRankColorClass(crm.rank)}`}>
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-xl font-bold">
                     {getRankIcon(crm.rank)}
                  </div>
                  <Avatar className="h-12 w-12 border-2 border-primary/30">
                    <AvatarImage src={crm.userAvatar || `https://placehold.co/48x48.png?text=${getInitials(crm.userName)}`} alt={crm.userName} data-ai-hint="user avatar" />
                    <AvatarFallback className="text-lg bg-primary/20 text-primary">{getInitials(crm.userName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-foreground leading-tight">{crm.userName}</p>
                    <p className="text-sm text-muted-foreground">{crm.monthlyOrdersCompleted} orders this month</p>
                  </div>
                  <div className="text-lg font-bold text-primary">
                    #{crm.rank}
                  </div>
                </div>
              ))}
              {mockCrmPerformance.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground">
                  <Users className="w-20 h-20 mb-4 opacity-50" />
                  <p className="text-lg">No CRM performance data available.</p>
                  <p>Check back later for updates.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

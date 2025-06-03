
"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Users, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from 'framer-motion';
import type { User } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CrmPerformanceData {
  userId: string;
  userName: string;
  userAvatar?: string;
  ordersCompleted: number; // This will be used as "points"
  target: number;
  rank?: number;
  trend?: 'up' | 'down' | 'same';
}

interface LeaderboardClientTabsProps {
  monthlyPerformanceData: CrmPerformanceData[];
  weeklyPerformanceData: CrmPerformanceData[];
  currentUser: User | null;
}

const getInitials = (name: string) => {
  if (!name || typeof name !== 'string') return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names[names.length - 1] ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

const PodiumItem: React.FC<{ user: CrmPerformanceData; isCenter?: boolean }> = ({ user, isCenter }) => (
  <motion.div
    className={cn(
      "flex-1 flex flex-col items-center p-4 sm:p-6 rounded-2xl shadow-lg bg-card border border-border/50 transform transition-all duration-300 ease-out",
      isCenter ? "sm:scale-110 sm:z-10 sm:mx-[-0.5rem] shadow-primary/20 border-primary/50" : "sm:scale-100"
    )}
    whileHover={{ y: -5, scale: isCenter ? 1.12 : 1.03, boxShadow: "0 20px 25px -5px rgba(var(--primary-hsl),0.15), 0 10px 10px -5px rgba(var(--primary-hsl),0.08)" }}
  >
    <p className="text-xl font-bold text-primary mb-2 sm:mb-3">#{user.rank}</p>
    <div className="relative">
      <Avatar className={cn("h-20 w-20 sm:h-28 sm:w-28 border-4 shadow-md", isCenter ? "border-primary" : "border-border")}>
        <AvatarImage src={user.userAvatar || `https://placehold.co/112x112.png?text=${getInitials(user.userName)}`} alt={user.userName} data-ai-hint="user portrait" />
        <AvatarFallback className="text-4xl bg-muted text-muted-foreground">{getInitials(user.userName)}</AvatarFallback>
      </Avatar>
      {user.rank === 1 && (
        <div className="absolute -bottom-1 -right-1 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 border-2 border-card flex items-center justify-center shadow-lg">
          <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-300" />
        </div>
      )}
    </div>
    <p className="mt-3 sm:mt-4 text-md sm:text-lg font-semibold text-foreground truncate max-w-[130px] sm:max-w-[150px]">{user.userName}</p>
    <p className="text-sm text-muted-foreground">{user.ordersCompleted} points</p>
  </motion.div>
);

const ListItem: React.FC<{ user: CrmPerformanceData; isCurrentUser: boolean }> = ({ user, isCurrentUser }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    className={cn(
      "flex items-center p-3 sm:p-4 rounded-xl shadow-sm transition-all duration-300 ease-out",
      isCurrentUser ? "bg-primary/10 border-2 border-primary/40 shadow-primary/10" : "bg-card border border-border hover:shadow-md hover:border-border/80 hover:bg-muted/30"
    )}
  >
    <p className={cn("text-md font-bold w-8 text-center", isCurrentUser ? "text-primary" : "text-muted-foreground")}>#{user.rank}</p>
    <Avatar className="h-10 w-10 sm:h-11 sm:w-11 mx-2 sm:mx-4 border-2 border-border/50">
      <AvatarImage src={user.userAvatar || `https://placehold.co/44x44.png?text=${getInitials(user.userName)}`} alt={user.userName} data-ai-hint="user avatar" />
      <AvatarFallback className="bg-muted text-muted-foreground">{getInitials(user.userName)}</AvatarFallback>
    </Avatar>
    <p className={cn("flex-1 text-sm font-medium truncate", isCurrentUser ? "text-primary font-semibold" : "text-foreground")}>{user.userName}</p>
    <div className="flex items-center ml-2 space-x-1">
      {user.trend === 'up' && <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />}
      {user.trend === 'down' && <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" />}
      <p className={cn("text-sm font-semibold", isCurrentUser ? "text-primary" : "text-foreground")}>{user.ordersCompleted} points</p>
    </div>
  </motion.div>
);

const LeaderboardContent: React.FC<{
  performanceData: CrmPerformanceData[];
  currentUser: User | null;
  timePeriodLabel: string;
}> = ({ performanceData, currentUser, timePeriodLabel }) => {
  if (!performanceData || performanceData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-muted-foreground bg-card rounded-xl shadow-sm border border-border/30">
        <Users className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg">No performance data available for this period.</p>
        <p className="text-sm">Check back later or ensure CRMs have assigned orders.</p>
      </div>
    );
  }

  const topThree = performanceData.slice(0, 3);
  const rest = performanceData.slice(3);

  return (
    <div className="space-y-8 sm:space-y-10">
      {topThree.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-around items-end gap-4 sm:gap-0 mt-4 sm:mt-6 px-2 sm:px-0">
          {topThree[1] && <PodiumItem user={topThree[1]} />}
          {topThree[0] && <PodiumItem user={topThree[0]} isCenter />}
          {topThree[2] && <PodiumItem user={topThree[2]} />}
        </div>
      )}
      
      {rest.length > 0 && (
        <div className="space-y-3 sm:space-y-4 mt-6 sm:mt-8">
          {rest.map((user) => (
            <ListItem
              key={user.userId + timePeriodLabel}
              user={user}
              isCurrentUser={!!currentUser && user.userId === currentUser.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};


export function LeaderboardClientTabs({ monthlyPerformanceData, weeklyPerformanceData, currentUser }: LeaderboardClientTabsProps) {
  const [activeTab, setActiveTab] = React.useState<'weekly' | 'monthly'>('weekly');
  const [currentPeriodOffset, setCurrentPeriodOffset] = React.useState(0);

  const getPeriodLabel = (tab: 'weekly' | 'monthly', offset: number): string => {
    // This is a simplified label, actual date calculations would be needed for real period navigation
    if (offset === 0) return tab === 'weekly' ? "This Week" : "This Month";
    if (offset === -1) return tab === 'weekly' ? "Last Week" : "Last Month";
    return tab === 'weekly' ? "Custom Week" : "Custom Month"; // Placeholder
  }
  
  const currentDisplayLabel = getPeriodLabel(activeTab, currentPeriodOffset);

  return (
    <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value as 'weekly' | 'monthly');
        setCurrentPeriodOffset(0); 
    }} className="w-full">
      <div className="flex items-center justify-center my-6 sm:my-8 relative">
        <Button variant="ghost" size="icon" onClick={() => setCurrentPeriodOffset(p => p - 1)} className="text-primary hover:text-primary/80 absolute left-0 disabled:opacity-50" disabled>
          <ChevronLeft className="h-7 w-7" />
        </Button>
        <TabsList className="mx-auto bg-transparent p-0 h-auto">
          <TabsTrigger
            value="weekly"
            className="text-lg sm:text-xl font-semibold px-4 py-2 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent hover:text-primary/80 text-muted-foreground relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary after:scale-x-0 after:transition-transform after:duration-300 data-[state=active]:after:scale-x-100"
          >
            Weekly
          </TabsTrigger>
           <div className="text-xl font-semibold text-muted-foreground/50 mx-2 sm:mx-3">/</div>
          <TabsTrigger
            value="monthly"
            className="text-lg sm:text-xl font-semibold px-4 py-2 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent hover:text-primary/80 text-muted-foreground relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary after:scale-x-0 after:transition-transform after:duration-300 data-[state=active]:after:scale-x-100"
          >
            Monthly
          </TabsTrigger>
        </TabsList>
        <Button variant="ghost" size="icon" onClick={() => setCurrentPeriodOffset(p => p + 1)} className="text-primary hover:text-primary/80 absolute right-0 disabled:opacity-50" disabled>
          <ChevronRight className="h-7 w-7" />
        </Button>
      </div>
      <p className="text-center text-md font-medium text-foreground/80 mb-6 sm:mb-8 -mt-2">{currentDisplayLabel} Performance</p>


      <TabsContent value="weekly">
        <LeaderboardContent
          performanceData={weeklyPerformanceData}
          currentUser={currentUser}
          timePeriodLabel="week"
        />
      </TabsContent>
      <TabsContent value="monthly">
        <LeaderboardContent
          performanceData={monthlyPerformanceData}
          currentUser={currentUser}
          timePeriodLabel="month"
        />
      </TabsContent>
    </Tabs>
  );
}

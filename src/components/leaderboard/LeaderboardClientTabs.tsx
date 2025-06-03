
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
      "flex-1 flex flex-col items-center p-4 sm:p-6 rounded-xl shadow-lg bg-card transform transition-all duration-300 ease-out",
      isCenter ? "sm:scale-110 sm:z-10 sm:mx-[-1rem] shadow-2xl" : "sm:scale-100"
    )}
    whileHover={{ y: -5, scale: isCenter ? 1.12 : 1.03, shadow: "0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.08)" }}
  >
    <p className="text-xl font-bold text-primary mb-2 sm:mb-3">#{user.rank}</p>
    <div className="relative">
      <Avatar className={cn("h-20 w-20 sm:h-24 sm:w-24 border-4", isCenter ? "border-primary" : "border-border")}>
        <AvatarImage src={user.userAvatar || `https://placehold.co/96x96.png?text=${getInitials(user.userName)}`} alt={user.userName} data-ai-hint="user portrait" />
        <AvatarFallback className="text-3xl bg-muted text-muted-foreground">{getInitials(user.userName)}</AvatarFallback>
      </Avatar>
      {user.rank === 1 && (
        <div className="absolute bottom-0 right-0 h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-purple-600 border-2 border-card flex items-center justify-center shadow-md">
          <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
        </div>
      )}
    </div>
    <p className="mt-2 sm:mt-3 text-md sm:text-lg font-semibold text-foreground truncate max-w-[120px]">{user.userName}</p>
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
      "flex items-center p-3 sm:p-4 rounded-lg shadow-sm transition-all duration-300 ease-out",
      isCurrentUser ? "bg-blue-500/10 border border-blue-500" : "bg-card border border-border hover:shadow-md"
    )}
  >
    <p className={cn("text-md font-bold w-8 text-center", isCurrentUser ? "text-blue-600" : "text-muted-foreground")}>#{user.rank}</p>
    <Avatar className="h-10 w-10 mx-2 sm:mx-3 border-2 border-border">
      <AvatarImage src={user.userAvatar || `https://placehold.co/40x40.png?text=${getInitials(user.userName)}`} alt={user.userName} data-ai-hint="user avatar" />
      <AvatarFallback className="bg-muted text-muted-foreground">{getInitials(user.userName)}</AvatarFallback>
    </Avatar>
    <p className={cn("flex-1 text-sm font-medium truncate", isCurrentUser ? "text-blue-700" : "text-foreground")}>{user.userName}</p>
    <div className="flex items-center ml-2">
      {user.trend === 'up' && <ArrowUp className="h-5 w-5 text-green-500 mr-1" />}
      {user.trend === 'down' && <ArrowDown className="h-5 w-5 text-pink-500 mr-1" />}
      <p className={cn("text-sm font-semibold", isCurrentUser ? "text-blue-700" : "text-foreground")}>{user.ordersCompleted} points</p>
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
      <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-muted-foreground bg-card rounded-lg shadow-sm">
        <Users className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg">No performance data available for this period.</p>
        <p className="text-sm">Check back later or ensure CRMs have assigned orders.</p>
      </div>
    );
  }

  const topThree = performanceData.slice(0, 3);
  const rest = performanceData.slice(3);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Podium for Top 3 */}
      {topThree.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-around items-end gap-4 sm:gap-2 mt-4 sm:mt-6 px-2 sm:px-0">
          {/* Rank 2 */}
          {topThree[1] && <PodiumItem user={topThree[1]} />}
          {/* Rank 1 (Center) */}
          {topThree[0] && <PodiumItem user={topThree[0]} isCenter />}
          {/* Rank 3 */}
          {topThree[2] && <PodiumItem user={topThree[2]} />}
        </div>
      )}
      
      {/* List for Ranks 4+ */}
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

  // Dummy state for week/month navigation, actual logic would be more complex
  const [currentPeriodOffset, setCurrentPeriodOffset] = React.useState(0);

  const getPeriodLabel = (tab: 'weekly' | 'monthly', offset: number): string => {
    if (offset === 0) return tab === 'weekly' ? "This Week" : "This Month";
    if (offset === -1) return tab === 'weekly' ? "Last Week" : "Last Month";
    // Add more logic for other offsets if needed
    return tab === 'weekly' ? "Custom Week" : "Custom Month";
  }
  
  const currentDisplayLabel = getPeriodLabel(activeTab, currentPeriodOffset);

  return (
    <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value as 'weekly' | 'monthly');
        setCurrentPeriodOffset(0); // Reset offset when changing tab
    }} className="w-full">
      <div className="flex items-center justify-center my-4 sm:my-6">
        <Button variant="ghost" size="icon" onClick={() => setCurrentPeriodOffset(p => p - 1)} className="text-primary hover:text-primary/80" disabled>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <TabsList className="mx-2 sm:mx-4 bg-transparent p-0">
          <TabsTrigger
            value="weekly"
            className="text-lg font-semibold px-3 py-2 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent hover:text-primary/80 text-muted-foreground"
          >
            Weekly
          </TabsTrigger>
           <div className="text-lg font-semibold text-muted-foreground mx-1">/</div>
          <TabsTrigger
            value="monthly"
            className="text-lg font-semibold px-3 py-2 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent hover:text-primary/80 text-muted-foreground"
          >
            Monthly
          </TabsTrigger>
        </TabsList>
        <Button variant="ghost" size="icon" onClick={() => setCurrentPeriodOffset(p => p + 1)} className="text-primary hover:text-primary/80" disabled>
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
      <p className="text-center text-sm text-muted-foreground mb-6 -mt-2">{currentDisplayLabel} Performance</p>


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


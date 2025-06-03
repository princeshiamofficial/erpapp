
"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Users, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';
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

const PodiumItem: React.FC<{ user: CrmPerformanceData; isCenter?: boolean; animationDelay: number }> = ({ user, isCenter, animationDelay }) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, delay: animationDelay, ease: "easeOut" }}
    whileHover={{ scale: isCenter ? 1.15 : 1.1, y: -10, boxShadow: "0 25px 50px -12px rgba(var(--primary-hsl),0.25)" }}
    className={cn(
      "flex-1 flex flex-col items-center p-4 sm:p-6 rounded-2xl shadow-xl bg-card border transform transition-all duration-300 ease-out",
      isCenter ? "sm:scale-110 sm:z-10 sm:mx-[-0.75rem] border-primary shadow-primary/30" : "sm:scale-100 border-border/50"
    )}
  >
    <p className="text-2xl font-bold text-primary mb-2 sm:mb-4">#{user.rank}</p>
    <div className="relative mb-3 sm:mb-4">
      <Avatar className={cn("h-24 w-24 sm:h-32 sm:w-32 border-4 shadow-lg", isCenter ? "border-primary" : "border-muted")}>
        <AvatarImage src={user.userAvatar || `https://placehold.co/128x128.png?text=${getInitials(user.userName)}`} alt={user.userName} data-ai-hint="user portrait" />
        <AvatarFallback className="text-4xl sm:text-5xl bg-muted text-muted-foreground">{getInitials(user.userName)}</AvatarFallback>
      </Avatar>
      {user.rank === 1 && (
        <motion.div
          animate={{ scale: [1, 1.2, 1, 1.1, 1], rotate: [0, -8, 8, -4, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.5 }}
          className="absolute -bottom-2 -right-2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 border-2 border-card flex items-center justify-center shadow-xl"
        >
          <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </motion.div>
      )}
    </div>
    <p className="text-md sm:text-xl font-semibold text-foreground truncate max-w-[140px] sm:max-w-[180px]">{user.userName}</p>
    <p className="text-sm sm:text-base text-muted-foreground">{user.ordersCompleted} points</p>
  </motion.div>
);

const ListItem: React.FC<{ user: CrmPerformanceData; isCurrentUser: boolean; index: number }> = ({ user, isCurrentUser, index }) => (
  <motion.div
    layout
    initial={{ opacity: 0, x: -30 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 30 }}
    transition={{ duration: 0.3, delay: index * 0.05 }}
    whileHover={isCurrentUser ? {} : { scale: 1.02, y: -4, backgroundColor: "hsl(var(--muted))" }}
    className={cn(
      "flex items-center p-3 sm:p-4 rounded-xl shadow-sm transition-all duration-200 ease-out border",
      isCurrentUser ? "bg-primary/10 border-primary/40 shadow-primary/15" : "bg-card border-border hover:shadow-lg"
    )}
    style={isCurrentUser ? {
      animation: 'pulseBorder 2.5s infinite ease-in-out'
    } : {}}
  >
    <p className={cn("text-lg font-bold w-10 text-center", isCurrentUser ? "text-primary" : "text-muted-foreground")}>#{user.rank}</p>
    <Avatar className="h-11 w-11 sm:h-12 sm:w-12 mx-3 sm:mx-4 border-2 border-border/60 shadow-sm">
      <AvatarImage src={user.userAvatar || `https://placehold.co/48x48.png?text=${getInitials(user.userName)}`} alt={user.userName} data-ai-hint="user avatar" />
      <AvatarFallback className="bg-muted text-muted-foreground">{getInitials(user.userName)}</AvatarFallback>
    </Avatar>
    <p className={cn("flex-1 text-base font-medium truncate", isCurrentUser ? "text-primary font-semibold" : "text-foreground")}>{user.userName}</p>
    <div className="flex items-center ml-2 space-x-1.5">
      {user.trend === 'up' && <motion.div whileHover={{ scale: 1.2 }}><ArrowUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" /></motion.div>}
      {user.trend === 'down' && <motion.div whileHover={{ scale: 1.2 }}><ArrowDown className="h-5 w-5 sm:h-6 sm:w-6 text-pink-500" /></motion.div>}
      <p className={cn("text-base font-semibold", isCurrentUser ? "text-primary" : "text-foreground")}>{user.ordersCompleted} points</p>
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[300px] py-10 text-muted-foreground bg-card rounded-xl shadow-sm border border-border/30"
      >
        <Users className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg">No performance data available for this period.</p>
        <p className="text-sm">Check back later or ensure CRMs have assigned orders.</p>
      </motion.div>
    );
  }

  const topThree = performanceData.slice(0, 3);
  const rest = performanceData.slice(3);

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
      }}
      className="space-y-8 sm:space-y-12"
    >
      {topThree.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-around items-end gap-6 sm:gap-0 mt-4 sm:mt-8 px-2 sm:px-0">
          {topThree[1] && <PodiumItem user={topThree[1]} animationDelay={0.1} />}
          {topThree[0] && <PodiumItem user={topThree[0]} isCenter animationDelay={0} />}
          {topThree[2] && <PodiumItem user={topThree[2]} animationDelay={0.2} />}
        </div>
      )}
      
      {rest.length > 0 && (
        <div className="space-y-3 sm:space-y-4 mt-6 sm:mt-10">
          {rest.map((user, index) => (
            <ListItem
              key={user.userId + timePeriodLabel}
              user={user}
              isCurrentUser={!!currentUser && user.userId === currentUser.id}
              index={index}
            />
          ))}
        </div>
      )}
       <style jsx global>{`
        @keyframes pulseBorder {
          0% { border-color: hsl(var(--primary)/0.4); box-shadow: 0 0 0 0 hsl(var(--primary)/0.2); }
          50% { border-color: hsl(var(--primary)/0.8); box-shadow: 0 0 0 4px hsl(var(--primary)/0.05); }
          100% { border-color: hsl(var(--primary)/0.4); box-shadow: 0 0 0 0 hsl(var(--primary)/0.2); }
        }
      `}</style>
    </motion.div>
  );
};


export function LeaderboardClientTabs({ monthlyPerformanceData, weeklyPerformanceData, currentUser }: LeaderboardClientTabsProps) {
  const [activeTab, setActiveTab] = React.useState<'weekly' | 'monthly'>('weekly');
  const [currentPeriodOffset, setCurrentPeriodOffset] = React.useState(0);

  const getPeriodLabel = (tab: 'weekly' | 'monthly', offset: number): string => {
    if (offset === 0) return tab === 'weekly' ? "This Week" : "This Month";
    if (offset === -1) return tab === 'weekly' ? "Last Week" : "Last Month";
    return tab === 'weekly' ? "Custom Week" : "Custom Month"; 
  }
  
  const currentDisplayLabel = getPeriodLabel(activeTab, currentPeriodOffset);

  return (
    <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value as 'weekly' | 'monthly');
        setCurrentPeriodOffset(0); 
    }} className="w-full">
      <div className="flex items-center justify-center my-6 sm:my-10 relative">
        <Button variant="ghost" size="icon" onClick={() => setCurrentPeriodOffset(p => p - 1)} className="text-primary hover:text-primary/80 absolute left-0 disabled:opacity-50" disabled>
          <ChevronLeft className="h-7 w-7 sm:h-8 sm:w-8" />
        </Button>
        <TabsList className="mx-auto bg-transparent p-0 h-auto">
          <TabsTrigger
            value="weekly"
            className="text-lg sm:text-xl font-semibold px-4 py-2.5 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent hover:text-primary/80 text-muted-foreground relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:bg-primary after:scale-x-0 after:transition-transform after:duration-300 data-[state=active]:after:scale-x-100"
          >
            Weekly
          </TabsTrigger>
           <div className="text-xl sm:text-2xl font-semibold text-muted-foreground/40 mx-2 sm:mx-4">/</div>
          <TabsTrigger
            value="monthly"
            className="text-lg sm:text-xl font-semibold px-4 py-2.5 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent hover:text-primary/80 text-muted-foreground relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:bg-primary after:scale-x-0 after:transition-transform after:duration-300 data-[state=active]:after:scale-x-100"
          >
            Monthly
          </TabsTrigger>
        </TabsList>
        <Button variant="ghost" size="icon" onClick={() => setCurrentPeriodOffset(p => p + 1)} className="text-primary hover:text-primary/80 absolute right-0 disabled:opacity-50" disabled>
          <ChevronRight className="h-7 w-7 sm:h-8 sm:w-8" />
        </Button>
      </div>
      <p className="text-center text-md sm:text-lg font-semibold text-foreground/80 mb-8 sm:mb-10 -mt-2 sm:-mt-3">{currentDisplayLabel} Performance</p>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'weekly' && (
            <LeaderboardContent
              performanceData={weeklyPerformanceData}
              currentUser={currentUser}
              timePeriodLabel="week"
            />
          )}
          {activeTab === 'monthly' && (
            <LeaderboardContent
              performanceData={monthlyPerformanceData}
              currentUser={currentUser}
              timePeriodLabel="month"
            />
          )}
        </motion.div>
      </AnimatePresence>
    </Tabs>
  );
}

    
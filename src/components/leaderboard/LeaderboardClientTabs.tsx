
"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Users, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';
import type { User, UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CrmPerformanceData {
  userId: string;
  userName: string;
  userAvatar?: string;
  ordersCompleted: number; 
  target: number;
  rank?: number;
  trend?: 'up' | 'down' | 'same';
  role?: UserRole;
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

const formatRoleDisplay = (role?: UserRole): string => {
  if (!role) return '';
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const PodiumItem: React.FC<{ user: CrmPerformanceData; isCenter?: boolean; animationDelay: number }> = ({ user, isCenter, animationDelay }) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, delay: user.rank ? (user.rank * 0.1) : animationDelay }}
    whileHover={{ scale: isCenter ? 1.15 : 1.05, y: -10, boxShadow: "0 25px 50px -12px hsl(var(--primary-hsl)/0.4)" }}
    className={cn(
      "flex-1 w-full flex flex-col items-center p-3 sm:p-4 md:p-6 rounded-2xl shadow-xl bg-card transform transition-all duration-300 ease-out",
      isCenter ? "border-2 border-primary shadow-primary/30 sm:scale-110 sm:z-10" : "border border-border/50 sm:scale-100",
      "base:p-3 sm:p-4 md:p-6" 
    )}
  >
    <p className={cn("text-lg sm:text-xl md:text-2xl font-bold text-primary mb-1 sm:mb-2 md:mb-3 text-center", "base:text-lg sm:text-xl md:text-2xl")}>{`#${user.rank}`}</p>
    <div className="relative mb-2 sm:mb-3 md:mb-4">
      <Avatar className={cn(
        "border-4 shadow-lg",
        "h-16 w-16 sm:h-20 md:h-24 base:h-16 base:w-16 sm:h-20 md:h-24", 
        isCenter ? "border-primary" : "border-muted"
      )}>
        <AvatarImage src={user.userAvatar || `https://placehold.co/128x128.png?text=${getInitials(user.userName)}`} alt={user.userName} data-ai-hint="user portrait" />
        <AvatarFallback className={cn("bg-muted text-muted-foreground", "text-xl sm:text-2xl md:text-3xl")}>{getInitials(user.userName)}</AvatarFallback>
      </Avatar>
      {user.rank === 1 && (
        <motion.div
           animate={{ scale: [1, 1.2, 1, 1.1, 1], rotate: [0, -8, 8, -4, 4, 0] }}
           transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.5 }}
          className={cn(
            "absolute -bottom-1 -right-1 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 border-2 border-card flex items-center justify-center shadow-xl",
            "h-6 w-6 sm:h-7 md:h-8 base:h-6 base:w-6 sm:w-7 md:w-8"
          )}
        >
          <Trophy className={cn("text-white", "h-3 w-3 sm:h-3.5 md:h-4 base:h-3 base:w-3 sm:w-3.5 md:w-4")} />
        </motion.div>
      )}
    </div>
    <p className={cn("font-semibold text-foreground truncate max-w-[100px] sm:max-w-[120px] md:max-w-[140px] text-center", "text-sm sm:text-base md:text-lg base:text-sm")}>{user.userName}</p>
    <p className={cn("text-muted-foreground text-center", "text-xs sm:text-sm base:text-xs")}>{formatRoleDisplay(user.role)}</p>
    <p className={cn("text-muted-foreground text-center", "text-xs sm:text-sm base:text-xs")}>{user.ordersCompleted} points</p>
  </motion.div>
);

const ListItem: React.FC<{ user: CrmPerformanceData; isCurrentUser: boolean; index: number }> = ({ user, isCurrentUser, index }) => (
  <motion.div
    layout
    initial={{ opacity: 0, x: -30 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 30 }}
    transition={{ duration: 0.3, delay: index * 0.05 }}
    whileHover={isCurrentUser ? {} : { scale: 1.02, y: -4, backgroundColor: "hsl(var(--muted)/0.5)" }}
    className={cn(
      "flex items-center p-2.5 sm:p-3 md:p-4 rounded-xl shadow-sm transition-all duration-200 ease-out border",
      isCurrentUser ? "border-primary/40 shadow-primary/15 animate-pulseBorder" : "bg-card border-border hover:shadow-lg hover:bg-muted/30 hover:border-border/80",
       "base:p-2.5" 
    )}
  >
    <p className={cn("font-bold w-7 sm:w-8 md:w-10 text-center", isCurrentUser ? "text-primary" : "text-muted-foreground", "text-sm sm:text-base md:text-lg base:text-sm")}>#{user.rank}</p>
    <Avatar className={cn("mx-1.5 sm:mx-2 md:mx-3 border-2 shadow-sm", "h-8 w-8 sm:h-9 md:h-10 base:h-8 base:w-8 sm:w-9 md:w-10", isCurrentUser ? "border-primary/50" : "border-border")}>
      <AvatarImage src={user.userAvatar || `https://placehold.co/48x48.png?text=${getInitials(user.userName)}`} alt={user.userName} data-ai-hint="user avatar" />
      <AvatarFallback className={cn("bg-muted text-muted-foreground", "text-xs sm:text-sm base:text-xs")}>{getInitials(user.userName)}</AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <p className={cn("font-medium truncate", isCurrentUser ? "text-primary font-semibold" : "text-foreground", "text-xs sm:text-sm md:text-base base:text-xs")}>{user.userName}</p>
      <p className={cn("text-xs text-muted-foreground", "base:text-xs")}>{formatRoleDisplay(user.role)}</p>
    </div>
    <div className="flex items-center ml-1.5 sm:ml-2 space-x-1 sm:space-x-1.5">
      {user.trend === 'up' && <motion.div whileHover={{ scale: 1.2 }}><ArrowUp className={cn("text-green-500", "h-3.5 w-3.5 sm:h-4 md:h-5 base:h-3.5 base:w-3.5 sm:w-4 md:w-5")} /></motion.div>}
      {user.trend === 'down' && <motion.div whileHover={{ scale: 1.2 }}><ArrowDown className={cn("text-pink-500", "h-3.5 w-3.5 sm:h-4 md:h-5 base:h-3.5 base:w-3.5 sm:w-4 md:w-5")} /></motion.div>}
      <p className={cn("font-semibold", isCurrentUser ? "text-primary" : "text-foreground", "text-xs sm:text-sm md:text-base base:text-xs")}>{user.ordersCompleted} points</p>
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
        className="flex flex-col items-center justify-center min-h-[200px] sm:min-h-[300px] py-10 text-muted-foreground bg-card rounded-xl shadow-sm border border-border/30"
      >
        <Users className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-30" />
        <p className="text-md sm:text-lg">No performance data available.</p>
        <p className="text-xs sm:text-sm">Check back later or ensure data is processed.</p>
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
      className="space-y-6 sm:space-y-8 md:space-y-12"
    >
      {topThree.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-around items-end gap-3 sm:gap-2 md:gap-0 mt-4 sm:mt-8 px-2 sm:px-0">
          {topThree.find(u => u.rank === 2) && <PodiumItem user={topThree.find(u => u.rank === 2)!} animationDelay={0.1} />}
          {topThree.find(u => u.rank === 1) && <PodiumItem user={topThree.find(u => u.rank === 1)!} isCenter animationDelay={0} />}
          {topThree.find(u => u.rank === 3) && <PodiumItem user={topThree.find(u => u.rank === 3)!} animationDelay={0.2} />}
        </div>
      )}
      
      {rest.length > 0 && (
        <div className="space-y-2 sm:space-y-2.5 md:space-y-3 mt-6 sm:mt-10">
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
          0% { border-color: hsl(var(--primary)/0.4); box-shadow: 0 0 0 0 hsl(var(--primary)/0.15); }
          50% { border-color: hsl(var(--primary)/0.8); box-shadow: 0 0 2px 3px hsl(var(--primary)/0.05); }
          100% { border-color: hsl(var(--primary)/0.4); box-shadow: 0 0 0 0 hsl(var(--primary)/0.15); }
        }
        .animate-pulseBorder {
          animation: pulseBorder 2.5s infinite ease-in-out;
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
      <div className="flex flex-col sm:flex-row items-center justify-center my-3 sm:my-4 md:my-6 relative">
        <Button variant="ghost" size="icon" onClick={() => setCurrentPeriodOffset(p => p - 1)} className="text-primary hover:text-primary/80 absolute left-0 top-1/2 -translate-y-1/2 sm:relative sm:left-auto sm:top-auto disabled:opacity-50 h-7 w-7 sm:h-8 md:h-10 base:h-5 base:w-5 sm:w-8 md:w-10" disabled>
          <ChevronLeft className="h-4 w-4 sm:h-5 md:h-6 base:h-4 base:w-4 sm:w-5 md:w-6" />
        </Button>
        <TabsList className="mx-auto bg-transparent p-0 h-auto my-1 sm:my-0">
          <TabsTrigger
            value="weekly"
            className="text-sm sm:text-base md:text-lg font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent hover:text-primary/80 text-muted-foreground relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[2.5px] after:w-full after:bg-primary after:scale-x-0 after:transition-transform after:duration-300 data-[state=active]:after:scale-x-100 base:text-sm"
          >
            Weekly
          </TabsTrigger>
           <div className="text-base sm:text-lg md:text-xl font-semibold text-muted-foreground/40 mx-1 sm:mx-2 base:text-base">/</div>
          <TabsTrigger
            value="monthly"
            className="text-sm sm:text-base md:text-lg font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent hover:text-primary/80 text-muted-foreground relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[2.5px] after:w-full after:bg-primary after:scale-x-0 after:transition-transform after:duration-300 data-[state=active]:after:scale-x-100 base:text-sm"
          >
            Monthly
          </TabsTrigger>
        </TabsList>
        <Button variant="ghost" size="icon" onClick={() => setCurrentPeriodOffset(p => p + 1)} className="text-primary hover:text-primary/80 absolute right-0 top-1/2 -translate-y-1/2 sm:relative sm:right-auto sm:top-auto disabled:opacity-50 h-7 w-7 sm:h-8 md:h-10 base:h-5 base:w-5 sm:w-8 md:w-10" disabled>
          <ChevronRight className="h-4 w-4 sm:h-5 md:h-6 base:h-4 base:w-4 sm:w-5 md:w-6" />
        </Button>
      </div>
      <p className="text-center font-semibold text-foreground/80 mb-4 sm:mb-6 md:mb-8 -mt-0.5 sm:-mt-1 text-xs sm:text-sm md:text-base base:text-xs">{currentDisplayLabel} Performance</p>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + currentPeriodOffset} 
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


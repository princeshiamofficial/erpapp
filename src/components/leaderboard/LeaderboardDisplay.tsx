
"use client";

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, ArrowUp, ArrowDown, Award } from 'lucide-react'; // Added Award
import { motion, AnimatePresence } from 'framer-motion';
import type { User, UserRole } from '@/types';
import { cn } from '@/lib/utils';

// This interface is now defined in page.tsx and passed here
export interface CrmPerformanceData {
  userId: string;
  userName: string;
  userAvatar?: string;
  ordersCompleted: number; // This is the "points"
  target: number; 
  rank?: number;
  role?: UserRole; 
  trend?: 'up' | 'down' | 'same';
  pointChange?: number;
}

interface LeaderboardDisplayProps {
  performanceData: CrmPerformanceData[];
  currentUser: User | null; 
  timePeriodLabel: string; 
}

const getInitials = (name: string) => {
  if (!name || typeof name !== 'string') return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names[names.length - 1] ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

const PodiumItem: React.FC<{ user: CrmPerformanceData; rank: number; isCenter?: boolean }> = ({ user, rank, isCenter }) => {
  const rankColors = {
    1: "bg-[hsl(var(--leaderboard-rank-badge-bg))]", 
    2: "bg-slate-400", // Silver-ish for rank 2
    3: "bg-yellow-600",  // Bronze-ish for rank 3
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: rank * 0.1 }}
      className={cn(
        "flex flex-col items-center text-center relative px-2 pt-3 pb-4 rounded-t-3xl shadow-lg bg-gradient-to-b from-[hsl(var(--leaderboard-podium-bg))] to-[hsl(var(--leaderboard-podium-bg)/0.8)]",
        isCenter ? "w-[130px] sm:w-[150px] h-[190px] sm:h-[220px] mt-[-20px] z-10 shadow-2xl" : "w-[110px] sm:w-[130px] h-[170px] sm:h-[200px]"
      )}
    >
      <div className={cn(
          "absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-full text-[hsl(var(--leaderboard-rank-badge-text))] font-bold text-sm sm:text-base border-2 border-white shadow-lg",
          rankColors[rank as keyof typeof rankColors] || "bg-gray-400"
      )}>
        {rank}
      </div>
      <Avatar className={cn(
          "border-4 shadow-xl overflow-hidden",
          isCenter ? "h-20 w-20 sm:h-24 sm:w-24 mt-3 border-[hsl(var(--leaderboard-gold))] border-[4px]" : "h-16 w-16 sm:h-20 sm:w-20 mt-3 border-white/70 border-2"
      )}>
        <AvatarImage src={user.userAvatar || `https://placehold.co/128x128.png?text=${getInitials(user.userName)}`} alt={user.userName} data-ai-hint="leaderboard user avatar" />
        <AvatarFallback className="bg-gray-700 text-white text-2xl sm:text-3xl">{getInitials(user.userName)}</AvatarFallback>
      </Avatar>
      <p className="font-semibold text-sm sm:text-base mt-2 truncate w-full px-1 text-[hsl(var(--leaderboard-text-light))]">{user.userName}</p>
      <p className="text-xs text-[hsl(var(--leaderboard-text-light))]/70 mt-0.5 truncate w-full px-1">
        {user.role?.replace(/_/g, ' ') || 'Member'}
      </p>
      <p className="text-lg sm:text-xl font-bold mt-0.5 text-[hsl(var(--leaderboard-text-light))]">{user.ordersCompleted.toLocaleString()}</p>
    </motion.div>
  );
};

const RankListItem: React.FC<{ user: CrmPerformanceData; index: number }> = ({ user, index }) => (
  <motion.div
    layout
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ duration: 0.3, delay: index * 0.05 }}
    className="flex items-center py-3.5 px-3 sm:px-4 my-2 mx-2 sm:mx-3 rounded-lg shadow-md bg-[hsl(var(--leaderboard-list-item-bg))] dark:bg-[hsl(var(--leaderboard-list-item-bg-dark))] relative hover:shadow-lg transition-shadow duration-150"
  >
    {/* Trend Bar */}
    {user.trend === 'up' && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[hsl(var(--leaderboard-arrow-up))] rounded-l-md"></div>}
    {user.trend === 'down' && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[hsl(var(--leaderboard-arrow-down))] rounded-l-md"></div>}
    {user.trend === 'same' && !user.pointChange && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-400 dark:bg-gray-500 rounded-l-md"></div>}

    <div className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[hsl(var(--leaderboard-gold))] text-[hsl(var(--leaderboard-rank-badge-text))] font-bold text-sm shadow-sm ml-2 mr-2 sm:mr-3 shrink-0">
      {user.rank}
    </div>
    
    <Avatar className="h-10 w-10 sm:h-11 sm:w-11 border-2 border-gray-200 dark:border-gray-700 shrink-0">
      <AvatarImage src={user.userAvatar || `https://placehold.co/48x48.png?text=${getInitials(user.userName)}`} alt={user.userName} data-ai-hint="list user avatar" />
      <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{getInitials(user.userName)}</AvatarFallback>
    </Avatar>

    <div className="flex-1 min-w-0 ml-3">
      <p className="font-semibold truncate text-sm text-[hsl(var(--leaderboard-list-text))] dark:text-[hsl(var(--leaderboard-list-text-dark))]">{user.userName}</p>
       <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
        {user.role?.replace(/_/g, ' ') || 'Member'}
      </p>
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        <Award className="h-3.5 w-3.5 mr-1 text-[hsl(var(--leaderboard-gold))]" />
        {user.ordersCompleted.toLocaleString()} pts
      </div>
    </div>
    {user.pointChange !== undefined && user.pointChange !== 0 && (
      <div className={cn(
        "flex items-center text-sm font-semibold ml-2 shrink-0",
        user.trend === 'up' ? "text-[hsl(var(--leaderboard-arrow-up))]" : "text-[hsl(var(--leaderboard-arrow-down))]"
      )}>
        {user.trend === 'up' ? "+" : "-"}
        {user.pointChange}
        {user.trend === 'up' ? <ArrowUp className="h-4 w-4 ml-0.5" /> : <ArrowDown className="h-4 w-4 ml-0.5" />}
      </div>
    )}
  </motion.div>
);

export function LeaderboardDisplay({ performanceData, currentUser, timePeriodLabel }: LeaderboardDisplayProps) {
  if (!performanceData || performanceData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-10 text-[hsl(var(--leaderboard-text-light))]"
      >
        <p className="text-lg">No performance data available for {timePeriodLabel}.</p>
      </motion.div>
    );
  }

  const topThree = performanceData.slice(0, 3);
  const rest = performanceData.slice(3);

  const podiumUsers = {
    rank1: topThree.find(u => u.rank === 1),
    rank2: topThree.find(u => u.rank === 2),
    rank3: topThree.find(u => u.rank === 3),
  };

  return (
    <div className="relative z-10">
      {topThree.length > 0 && (
        <div className="px-4 pt-8 pb-12 sm:pt-10 sm:pb-16 relative">
           <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 120 }}
            className="relative z-20"
          >
            <Crown className="h-14 w-14 sm:h-20 sm:w-20 text-[hsl(var(--leaderboard-gold))] mx-auto mb-[-20px] sm:mb-[-25px] drop-shadow-lg animate-pulse" 
              style={{ animationDuration: '2s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' }}
            />
          </motion.div>
          <div className="flex justify-around items-end max-w-sm sm:max-w-md mx-auto">
            {podiumUsers.rank2 ? <PodiumItem user={podiumUsers.rank2} rank={2} /> : <div className="w-[110px] sm:w-[130px]"></div>}
            {podiumUsers.rank1 ? <PodiumItem user={podiumUsers.rank1} rank={1} isCenter /> : <div className="w-[130px] sm:w-[150px]"></div>}
            {podiumUsers.rank3 ? <PodiumItem user={podiumUsers.rank3} rank={3} /> : <div className="w-[110px] sm:w-[130px]"></div>}
          </div>
        </div>
      )}
      
      {performanceData.length > 0 && ( 
        <div className="bg-[hsl(var(--leaderboard-list-area-bg))] rounded-t-[30px] sm:rounded-t-[40px] shadow-2xl pt-6 pb-8 min-h-[300px] mt-[-50px] sm:mt-[-60px] mx-0 sm:mx-2 md:mx-4 lg:mx-auto lg:max-w-2xl">
          <AnimatePresence>
            {rest.map((user, index) => (
              <RankListItem
                key={user.userId + (user.rank || index)} 
                user={user}
                index={index}
              />
            ))}
          </AnimatePresence>
          {rest.length === 0 && topThree.length > 0 && (
             <p className="text-center text-sm text-[hsl(var(--leaderboard-text-light))]/70 py-8">Only podium members this period.</p>
          )}
           {performanceData.length === 0 && ( 
             <p className="text-center text-sm text-[hsl(var(--leaderboard-text-light))]/70 py-8">No one on the leaderboard yet for {timePeriodLabel}.</p>
          )}
        </div>
      )}
    </div>
  );
}


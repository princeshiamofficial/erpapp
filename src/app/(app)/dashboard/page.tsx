
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, MessageSquare, PlusCircle, UserCircle, Edit3, CalendarDays, CalendarClock, Target, TrendingUp, ListChecks } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { SetSalesTargetDialog } from '@/components/dashboard/set-sales-target-dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/types';

interface ActivityItem {
  id: string;
  type: 'status_update' | 'new_comment' | 'order_created' | 'dr_assigned';
  orderId: string;
  title: string;
  details: string;
  userName:string;
  userAvatar?: string;
  timestamp: string;
}

// Mock recent activities - In a real app, this would come from a backend
const mockRecentActivities: ActivityItem[] = [
  { id: '1', type: 'order_created', orderId: 'ORD-001', title: 'New Order Created: ORD-001', details: 'Customer: Tech Solutions Inc.', userName: 'Default Admin', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), userAvatar: 'https://placehold.co/40x40.png?text=DA' },
  { id: '2', type: 'status_update', orderId: 'ORD-001', title: 'Status Update: ORD-001 to In Production', details: 'Order moved to production phase.', userName: 'Default Admin', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), userAvatar: 'https://placehold.co/40x40.png?text=DA' },
  { id: '3', type: 'new_comment', orderId: 'ORD-001', title: 'New Comment on ORD-001', details: 'Client: "Looking forward to the demo!"', userName: 'Tech Solutions Inc. (Client)', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), userAvatar: 'https://placehold.co/40x40.png?text=TS' },
  { id: '4', type: 'dr_assigned', orderId: 'ORD-002', title: 'Designer Assigned to ORD-002', details: 'Carol DesignerRep assigned.', userName: 'Default Admin', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), userAvatar: 'https://placehold.co/40x40.png?text=DA' },
  { id: '5', type: 'status_update', orderId: 'ORD-002', title: 'Status Update: ORD-002 to Pending Client Approval', details: 'Initial designs submitted.', userName: 'Carol DesignerRep', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), userAvatar: 'https://placehold.co/40x40.png?text=CD' },
];


const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'status_update':
      return <ListChecks className="h-5 w-5 text-primary" />;
    case 'new_comment':
      return <MessageSquare className="h-5 w-5 text-green-500" />;
    case 'order_created':
      return <PlusCircle className="h-5 w-5 text-accent" />; 
    case 'dr_assigned':
      return <UserCircle className="h-5 w-5 text-purple-500" />;
    default:
      return <UserCircle className="h-5 w-5 text-muted-foreground" />;
  }
};

const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
}

const LOCAL_STORAGE_GLOBAL_MONTHLY_SALES_TARGET_KEY = 'trackflow-global-monthly-sales-target';
const LOCAL_STORAGE_GLOBAL_WEEKLY_SALES_TARGET_KEY = 'trackflow-global-weekly-sales-target';

const DEFAULT_GLOBAL_MONTHLY_TARGET = 0; 
const DEFAULT_GLOBAL_WEEKLY_TARGET = 0;  

const MOCK_CURRENT_MONTHLY_ORDERS_COMPLETED_FOR_CRM = 0; 
const MOCK_CURRENT_WEEKLY_ORDERS_COMPLETED_FOR_CRM = 0;  

const getProgressColorClass = (percentage: number): string => {
  if (percentage < 0) percentage = 0;
  const colorPercentage = Math.min(percentage, 100); // Cap at 100 for color calculation
  if (colorPercentage < 33) return 'bg-red-500 dark:bg-red-600';
  if (colorPercentage < 67) return 'bg-yellow-500 dark:bg-yellow-400';
  return 'bg-green-500 dark:bg-green-600';
};

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [isClient, setIsClient] = useState(false);

  const [globalMonthlyOrderTarget, setGlobalMonthlyOrderTarget] = useState<number>(DEFAULT_GLOBAL_MONTHLY_TARGET);
  const [globalWeeklyOrderTarget, setGlobalWeeklyOrderTarget] = useState<number>(DEFAULT_GLOBAL_WEEKLY_TARGET);

  const [isSetGlobalMonthlyTargetDialogOpen, setIsSetGlobalMonthlyTargetDialogOpen] = useState(false);
  const [isSetGlobalWeeklyTargetDialogOpen, setIsSetGlobalWeeklyTargetDialogOpen] = useState(false);
  
  useEffect(() => {
    setIsClient(true); 
    const storedGlobalMonthly = localStorage.getItem(LOCAL_STORAGE_GLOBAL_MONTHLY_SALES_TARGET_KEY);
    if (storedGlobalMonthly) {
      setGlobalMonthlyOrderTarget(parseInt(storedGlobalMonthly, 10));
    }
    const storedGlobalWeekly = localStorage.getItem(LOCAL_STORAGE_GLOBAL_WEEKLY_SALES_TARGET_KEY);
    if (storedGlobalWeekly) {
      setGlobalWeeklyOrderTarget(parseInt(storedGlobalWeekly, 10));
    }
  }, []);

  const crmEffectiveMonthlyTarget = currentUser?.role === 'CRM' ? (currentUser.monthlyOrderTarget ?? globalMonthlyOrderTarget) : globalMonthlyOrderTarget;
  const crmEffectiveWeeklyTarget = currentUser?.role === 'CRM' ? (currentUser.weeklyOrderTarget ?? globalWeeklyOrderTarget) : globalWeeklyOrderTarget;

  const crmMonthlyOrdersCompleted = currentUser?.role === 'CRM' ? MOCK_CURRENT_MONTHLY_ORDERS_COMPLETED_FOR_CRM : 0;
  const crmWeeklyOrdersCompleted = currentUser?.role === 'CRM' ? MOCK_CURRENT_WEEKLY_ORDERS_COMPLETED_FOR_CRM : 0;


  const handleSetGlobalMonthlyOrderTarget = (newTarget: number) => {
    setGlobalMonthlyOrderTarget(newTarget);
    if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_GLOBAL_MONTHLY_SALES_TARGET_KEY, newTarget.toString());
    }
    setIsSetGlobalMonthlyTargetDialogOpen(false);
  };

  const handleSetGlobalWeeklyOrderTarget = (newTarget: number) => {
    setGlobalWeeklyOrderTarget(newTarget);
     if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_GLOBAL_WEEKLY_SALES_TARGET_KEY, newTarget.toString());
    }
    setIsSetGlobalWeeklyTargetDialogOpen(false);
  };

  if (!currentUser) {
    return (
      <div className="space-y-8 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
        </div>
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    );
  }

  let summaryCards = [
    { title: "Active Orders", value: "0", icon: Package, change: "+0% this month", dataAiHint: "delivery boxes", type: "info" as const, trend: "up" as const },
  ];

  if (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN') {
    summaryCards.push(
      {
        title: "Global Monthly Order Target",
        value: `${globalMonthlyOrderTarget} Orders`,
        icon: Target,
        change: "Set global default for CRMs",
        dataAiHint: "target goal",
        actionType: 'global_monthly' as const,
        type: "target" as const
      },
      {
        title: "Global Weekly Order Target",
        value: `${globalWeeklyOrderTarget} Orders`,
        icon: Target,
        change: "Set global default for CRMs",
        dataAiHint: "target goal small",
        actionType: 'global_weekly' as const,
        type: "target" as const
      }
    );
  } else if (currentUser.role === 'CRM') {
    summaryCards.push(
      {
        title: "Your Monthly Orders",
        value: `${crmMonthlyOrdersCompleted} / ${crmEffectiveMonthlyTarget} Orders`,
        icon: CalendarDays,
        currentCompleted: crmMonthlyOrdersCompleted,
        targetValue: crmEffectiveMonthlyTarget,
        dataAiHint: "monthly calendar checklist",
        type: "progress" as const
      },
      {
        title: "Your Weekly Orders",
        value: `${crmWeeklyOrdersCompleted} / ${crmEffectiveWeeklyTarget} Orders`,
        icon: CalendarClock,
        currentCompleted: crmWeeklyOrdersCompleted,
        targetValue: crmEffectiveWeeklyTarget,
        dataAiHint: "weekly calendar tasks",
        type: "progress" as const
      }
    );
  }


  return (
    <div className="space-y-6 sm:space-y-8 p-1 sm:p-0">
      <Card className="shadow-2xl bg-gradient-to-br from-primary/80 via-primary to-orange-600 dark:from-primary/70 dark:via-primary dark:to-orange-500 border-none text-primary-foreground rounded-xl overflow-hidden transform hover:shadow-primary/20 transition-shadow duration-300">
        <CardHeader className="pb-4 p-6 sm:p-8">
          <CardTitle className="text-3xl sm:text-4xl font-bold">Welcome, {currentUser.name.split(' ')[0]}!</CardTitle>
          <CardDescription className="text-md sm:text-lg text-primary-foreground/80">
            You are logged in as <span className="font-semibold text-white">{currentUser.role.replace(/_/g, ' ')}</span>. Here's your workspace overview.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 pt-0">
          <p className="text-primary-foreground/90 max-w-3xl text-sm sm:text-md">This is your central hub for managing orders and tracking progress. Use the sidebar to navigate and stay on top of your tasks and key metrics.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {summaryCards.map((card) => {
          let progressPercentage = 0;
          let progressColorClass = '';

          if (card.type === 'progress' && card.targetValue && card.targetValue > 0) {
            progressPercentage = ( (card.currentCompleted ?? 0) / card.targetValue) * 100;
            progressColorClass = getProgressColorClass(progressPercentage);
          }

          return (
            <Card 
              key={card.title} 
              className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out border bg-card relative flex flex-col group hover:scale-[1.02] rounded-xl overflow-hidden border-border/30"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-4 sm:pt-5 px-4 sm:px-5">
                <CardTitle className="text-md sm:text-lg font-semibold text-card-foreground">{card.title}</CardTitle>
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <card.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover:scale-110 transition-transform" />
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between px-4 sm:px-5 pb-4 sm:pb-5">
                <div>
                  {card.type === 'progress' ? (
                    <>
                      <div className="text-2xl sm:text-3xl font-bold text-card-foreground">
                        {card.currentCompleted} <span className="text-lg sm:text-xl text-muted-foreground">/ {card.targetValue}</span>
                      </div>
                       <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-2">
                        Orders ({progressPercentage.toFixed(0)}% complete)
                      </p>
                      <Progress value={Math.min(progressPercentage, 100)} indicatorClassName={progressColorClass} className="h-2 sm:h-2.5 rounded-full mb-3" aria-label={`${card.title} progress ${progressPercentage.toFixed(0)}%`} />
                    </>
                  ) : (
                    <div className="text-3xl sm:text-4xl font-bold text-card-foreground">{card.value}</div>
                  )}
                  {card.change && card.type === 'info' && (
                     <p className="text-xs text-green-600 dark:text-green-400 flex items-center mt-1">
                       <TrendingUp className="h-4 w-4 mr-1"/> {card.change}
                    </p>
                  )}
                  {card.change && card.type !== 'info' && (
                     <p className="text-xs text-muted-foreground mt-1">{card.change}</p>
                  )}
                </div>
                {(card.type === 'target' && (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN')) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 sm:mt-4 self-start transition-all group-hover:border-primary group-hover:text-primary group-hover:bg-primary/5 text-xs py-1.5 px-3 h-auto border-border/80 hover:bg-primary/10 rounded-md shadow-sm hover:shadow-md"
                    onClick={() => {
                      if (card.actionType === 'global_monthly') setIsSetGlobalMonthlyTargetDialogOpen(true);
                      if (card.actionType === 'global_weekly') setIsSetGlobalWeeklyTargetDialogOpen(true);
                    }}
                  >
                    <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit Global Target
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN') && isClient && (
        <>
          <SetSalesTargetDialog
            isOpen={isSetGlobalMonthlyTargetDialogOpen}
            onOpenChange={setIsSetGlobalMonthlyTargetDialogOpen}
            currentTarget={globalMonthlyOrderTarget}
            onSetTarget={handleSetGlobalMonthlyOrderTarget}
            targetType="monthly"
          />
          <SetSalesTargetDialog
            isOpen={isSetGlobalWeeklyTargetDialogOpen}
            onOpenChange={setIsSetGlobalWeeklyTargetDialogOpen}
            currentTarget={globalWeeklyOrderTarget}
            onSetTarget={handleSetGlobalWeeklyOrderTarget}
            targetType="weekly"
          />
        </>
      )}

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
        <Card className="shadow-lg bg-card h-[350px] sm:h-[400px] transition-shadow duration-300 ease-in-out hover:shadow-xl rounded-xl border-border/30">
          <CardHeader className="border-b border-border/50 py-3 sm:py-4 px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl font-semibold text-foreground">Recent Activity</CardTitle>
            <CardDescription className="text-muted-foreground text-xs sm:text-sm">Latest order updates and comments.</CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-72px)] sm:h-[calc(100%-80px)] p-0"> 
            <ScrollArea className="h-full">
              <div className="p-2 sm:p-4 space-y-2 sm:space-y-3">
                {mockRecentActivities.length > 0 ? mockRecentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-3.5 rounded-lg hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/20 cursor-pointer group">
                    <div className="flex-shrink-0 pt-1 sm:pt-1.5 text-primary">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm font-medium text-foreground leading-tight group-hover:text-primary transition-colors">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.details}</p>
                      <div className="flex items-center space-x-2 mt-1.5 sm:mt-2">
                        <Avatar className="h-6 w-6 sm:h-7 sm:w-7 border border-border/50">
                           <AvatarImage src={activity.userAvatar || `https://placehold.co/40x40.png?text=${getInitials(activity.userName)}`} alt={activity.userName} data-ai-hint="user avatar"/>
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(activity.userName)}</AvatarFallback>
                        </Avatar>
                        <div className="text-xs text-muted-foreground">
                          {activity.userName} &bull; {isClient ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }) : <Skeleton className="h-3 w-20 inline-block" />}
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
                    <ListChecks className="w-16 h-16 sm:w-20 sm:h-20 mb-4 opacity-20" />
                    <p className="text-md sm:text-lg">No recent activity.</p>
                    <p className="text-xs text-muted-foreground">Updates will appear here as they happen.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


    
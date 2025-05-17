
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, ListChecks, MessageSquare, PlusCircle, UserCircle, Edit3, CalendarDays, CalendarClock, Target, Users, Trophy, Star, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { SetSalesTargetDialog } from '@/components/dashboard/set-sales-target-dialog';
import { Progress } from '@/components/ui/progress';

interface ActivityItem {
  id: string;
  type: 'status_update' | 'new_comment' | 'order_created';
  orderId: string;
  title: string;
  details: string;
  userName:string;
  userAvatar?: string;
  timestamp: string;
}

const mockRecentActivities: ActivityItem[] = [
  {
    id: 'act-001',
    type: 'status_update',
    orderId: 'ORD-001',
    title: 'Status changed to IN_PRODUCTION',
    details: 'Production has commenced for Tech Solutions Inc.',
    userName: 'Bob CRM',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-002',
    type: 'new_comment',
    orderId: 'ORD-002',
    title: 'New comment on GreenScape Ltd.',
    details: 'Alice (Client): "Could we get an update on the design phase?"',
    userName: 'Alice Wonderland',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-003',
    type: 'order_created',
    orderId: 'ORD-004',
    title: 'New Order: Innovate Fast',
    details: 'Order created by David CRM.',
    userName: 'David CRM',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
   {
    id: 'act-004',
    type: 'status_update',
    orderId: 'ORD-003',
    title: 'Status changed to SHIPPED',
    details: 'Innovate Hub order has been shipped.',
    userName: 'System',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-005',
    type: 'new_comment',
    orderId: 'ORD-001',
    title: 'Internal comment on Tech Solutions Inc.',
    details: 'Carol (DR): "Design files uploaded to shared drive."',
    userName: 'Carol DesignerRep',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'status_update':
      return <ListChecks className="h-5 w-5 text-primary" />;
    case 'new_comment':
      return <MessageSquare className="h-5 w-5 text-green-500" />;
    case 'order_created':
      return <PlusCircle className="h-5 w-5 text-accent-foreground" />; 
    default:
      return <UserCircle className="h-5 w-5 text-muted-foreground" />;
  }
};

const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
}

const LOCAL_STORAGE_GLOBAL_MONTHLY_SALES_TARGET_KEY = 'trackflow-global-monthly-sales-target';
const LOCAL_STORAGE_GLOBAL_WEEKLY_SALES_TARGET_KEY = 'trackflow-global-weekly-sales-target';

const DEFAULT_GLOBAL_MONTHLY_TARGET = 120; 
const DEFAULT_GLOBAL_WEEKLY_TARGET = 30;  

const MOCK_CURRENT_MONTHLY_ORDERS_COMPLETED_FOR_CRM = 67; 
const MOCK_CURRENT_WEEKLY_ORDERS_COMPLETED_FOR_CRM = 12;  

const getProgressColorClass = (percentage: number): string => {
  if (percentage < 0) percentage = 0;
  const colorPercentage = Math.min(percentage, 100);
  if (colorPercentage < 33) return '[&>div]:bg-destructive';
  if (colorPercentage < 67) return '[&>div]:bg-orange-400 dark:[&>div]:bg-orange-500';
  return '[&>div]:bg-green-500 dark:[&>div]:bg-green-600';
};

export default function DashboardPage() {
  const { currentUser } = useAuth();

  const [globalMonthlyOrderTarget, setGlobalMonthlyOrderTarget] = useState<number>(DEFAULT_GLOBAL_MONTHLY_TARGET);
  const [globalWeeklyOrderTarget, setGlobalWeeklyOrderTarget] = useState<number>(DEFAULT_GLOBAL_WEEKLY_TARGET);

  const [isSetGlobalMonthlyTargetDialogOpen, setIsSetGlobalMonthlyTargetDialogOpen] = useState(false);
  const [isSetGlobalWeeklyTargetDialogOpen, setIsSetGlobalWeeklyTargetDialogOpen] = useState(false);
  
  useEffect(() => {
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


  const handleSetGlobalMonthlyOrderTarget = (newTarget: number) => {
    setGlobalMonthlyOrderTarget(newTarget);
    localStorage.setItem(LOCAL_STORAGE_GLOBAL_MONTHLY_SALES_TARGET_KEY, newTarget.toString());
    setIsSetGlobalMonthlyTargetDialogOpen(false);
  };

  const handleSetGlobalWeeklyOrderTarget = (newTarget: number) => {
    setGlobalWeeklyOrderTarget(newTarget);
    localStorage.setItem(LOCAL_STORAGE_GLOBAL_WEEKLY_SALES_TARGET_KEY, newTarget.toString());
    setIsSetGlobalWeeklyTargetDialogOpen(false);
  };

  if (!currentUser) {
    return null;
  }

  let summaryCards = [
    { title: "Active Orders", value: "125", icon: Package, change: "+15.2% this month", dataAiHint: "delivery boxes", type: "info" as const, trend: "up" as const },
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
        value: `${MOCK_CURRENT_MONTHLY_ORDERS_COMPLETED_FOR_CRM} / ${crmEffectiveMonthlyTarget} Orders`,
        icon: CalendarDays,
        currentCompleted: MOCK_CURRENT_MONTHLY_ORDERS_COMPLETED_FOR_CRM,
        targetValue: crmEffectiveMonthlyTarget,
        dataAiHint: "monthly calendar checklist",
        type: "progress" as const
      },
      {
        title: "Your Weekly Orders",
        value: `${MOCK_CURRENT_WEEKLY_ORDERS_COMPLETED_FOR_CRM} / ${crmEffectiveWeeklyTarget} Orders`,
        icon: CalendarClock,
        currentCompleted: MOCK_CURRENT_WEEKLY_ORDERS_COMPLETED_FOR_CRM,
        targetValue: crmEffectiveWeeklyTarget,
        dataAiHint: "weekly calendar tasks",
        type: "progress" as const
      }
    );
  }


  return (
    <div className="space-y-8 p-1">
      <Card className="shadow-xl bg-card border-border/50 rounded-lg overflow-hidden transform hover:shadow-primary/20 transition-shadow duration-300">
        <CardHeader className="pb-4 bg-gradient-to-r from-primary to-orange-500 dark:from-primary dark:to-orange-600 text-primary-foreground p-6 rounded-t-lg">
          <CardTitle className="text-4xl font-bold">Welcome, {currentUser.name.split(' ')[0]}!</CardTitle>
          <CardDescription className="text-lg text-primary-foreground/90">
            You are logged in as <span className="font-semibold">{currentUser.role.replace(/_/g, ' ')}</span>. Here's your workspace overview.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-card-foreground/90 max-w-3xl text-md">This is your central hub for managing orders and tracking progress. Use the sidebar to navigate and stay on top of your tasks and key metrics.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
              className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out border bg-card relative flex flex-col group hover:scale-[1.03] rounded-lg overflow-hidden"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-5 px-5">
                <CardTitle className="text-lg font-semibold text-card-foreground">{card.title}</CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <card.icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between px-5 pb-5">
                <div>
                  {card.type === 'progress' ? (
                    <>
                      <div className="text-3xl font-bold text-card-foreground">
                        {card.currentCompleted} <span className="text-xl text-muted-foreground">/ {card.targetValue}</span>
                      </div>
                       <p className="text-sm text-muted-foreground mt-1 mb-2">
                        Orders ({progressPercentage.toFixed(0)}% complete)
                      </p>
                      <Progress value={Math.min(progressPercentage, 100)} className={`h-2.5 rounded-full mb-3 ${progressColorClass}`} aria-label={`${card.title} progress ${progressPercentage.toFixed(0)}%`} />
                    </>
                  ) : (
                    <div className="text-4xl font-bold text-card-foreground">{card.value}</div>
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
                    className="mt-4 self-start transition-all group-hover:border-primary group-hover:text-primary group-hover:bg-primary/5 text-xs py-1.5 px-3 h-auto border-border/80 hover:bg-primary/10 rounded-md shadow-sm hover:shadow-md"
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

      {(currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN') && (
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
        <Card className="shadow-lg bg-card h-[400px] transition-shadow duration-300 ease-in-out hover:shadow-xl rounded-lg border-border/50">
          <CardHeader className="border-b border-border/50 py-4 px-6">
            <CardTitle className="text-xl font-semibold text-foreground">Recent Activity</CardTitle>
            <CardDescription className="text-muted-foreground text-sm">Latest order updates and comments.</CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-80px)] p-0"> 
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {mockRecentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4 p-3.5 rounded-lg hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/20 cursor-pointer group">
                    <div className="flex-shrink-0 pt-1.5 text-primary">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground leading-tight group-hover:text-primary transition-colors">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.details}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Avatar className="h-7 w-7 border border-border/50">
                           <AvatarImage src={activity.userAvatar || `https://placehold.co/40x40.png?text=${getInitials(activity.userName)}`} alt={activity.userName} data-ai-hint="user avatar"/>
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(activity.userName)}</AvatarFallback>
                        </Avatar>
                        <p className="text-xs text-muted-foreground">
                          {activity.userName} &bull; {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {mockRecentActivities.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
                    <ListChecks className="w-20 h-20 mb-4 opacity-20" />
                    <p className="text-lg">No recent activity.</p>
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

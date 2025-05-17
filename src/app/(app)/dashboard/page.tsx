
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, ListChecks, MessageSquare, PlusCircle, UserCircle, Edit3, CalendarDays, CalendarClock, Target, Users, Trophy, Star } from 'lucide-react';
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
      return <MessageSquare className="h-5 w-5 text-green-500" />; // Keep semantic color
    case 'order_created':
      return <PlusCircle className="h-5 w-5 text-accent" />; 
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

const DEFAULT_GLOBAL_MONTHLY_TARGET = 100;
const DEFAULT_GLOBAL_WEEKLY_TARGET = 20;

const MOCK_CURRENT_MONTHLY_ORDERS_COMPLETED_FOR_CRM = 67; 
const MOCK_CURRENT_WEEKLY_ORDERS_COMPLETED_FOR_CRM = 12;  

const getProgressColorClass = (percentage: number): string => {
  if (percentage < 0) percentage = 0;
  const colorPercentage = Math.min(percentage, 100);
  if (colorPercentage < 33) return '[&>div]:bg-destructive'; // Use theme destructive
  if (colorPercentage < 67) return '[&>div]:bg-yellow-400 dark:[&>div]:bg-yellow-500'; // Keep semantic yellow
  return '[&>div]:bg-green-500 dark:[&>div]:bg-green-600'; // Keep semantic green
};

export default function DashboardPage() {
  const { currentUser } = useAuth();

  const [globalMonthlyOrderTarget, setGlobalMonthlyOrderTarget] = useState<number>(DEFAULT_GLOBAL_MONTHLY_TARGET);
  const [globalWeeklyOrderTarget, setGlobalWeeklyOrderTarget] = useState<number>(DEFAULT_GLOBAL_WEEKLY_TARGET);

  const [isSetGlobalMonthlyTargetDialogOpen, setIsSetGlobalMonthlyTargetDialogOpen] = useState(false);
  const [isSetGlobalWeeklyTargetDialogOpen, setIsSetGlobalWeeklyTargetDialogOpen] = useState(false);

  const crmEffectiveMonthlyTarget = currentUser?.role === 'CRM' ? (currentUser.monthlyOrderTarget ?? globalMonthlyOrderTarget) : 0;
  const crmEffectiveWeeklyTarget = currentUser?.role === 'CRM' ? (currentUser.weeklyOrderTarget ?? globalWeeklyOrderTarget) : 0;

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
    { title: "Active Orders", value: "125", icon: Package, change: "+15.2% from last month", dataAiHint: "delivery boxes", type: "info" as const },
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
        title: "Your Monthly Order Target",
        value: `${MOCK_CURRENT_MONTHLY_ORDERS_COMPLETED_FOR_CRM} / ${crmEffectiveMonthlyTarget} Orders`,
        icon: CalendarDays,
        currentCompleted: MOCK_CURRENT_MONTHLY_ORDERS_COMPLETED_FOR_CRM,
        targetValue: crmEffectiveMonthlyTarget,
        dataAiHint: "monthly calendar checklist",
        type: "progress" as const
      },
      {
        title: "Your Weekly Order Target",
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
    <div className="space-y-8">
      <Card className="shadow-lg bg-card border">
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-bold text-card-foreground">Welcome to TrackFlow, {currentUser.name.split(' ')[0]}!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            You are logged in as {currentUser.role.replace(/_/g, ' ')}. Here's a quick overview of your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-card-foreground/90 max-w-2xl">This is your main dashboard. From here, you can navigate to various sections of the application using the sidebar. Stay on top of your tasks and monitor key metrics.</p>
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
              className="shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out border bg-card relative flex flex-col group hover:scale-[1.02]"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold text-card-foreground">{card.title}</CardTitle>
                <card.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <div>
                  {card.type === 'progress' ? (
                    <>
                      <div className="text-3xl font-bold text-card-foreground">
                        {card.currentCompleted} <span className="text-xl text-muted-foreground">/ {card.targetValue} Orders</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 mb-3">
                        ({progressPercentage.toFixed(0)}% complete)
                      </p>
                      <Progress value={Math.min(progressPercentage, 100)} className={`h-2.5 mb-3 ${progressColorClass}`} aria-label={`${card.title} progress ${progressPercentage.toFixed(0)}%`} />
                    </>
                  ) : (
                    <div className="text-3xl font-bold text-card-foreground">{card.value}</div>
                  )}
                  {card.change && (
                    <p className="text-xs text-muted-foreground">
                      {card.change}
                    </p>
                  )}
                </div>
                {(card.type === 'target' && (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN')) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-auto self-end transition-colors group-hover:border-primary group-hover:text-primary"
                    onClick={() => {
                      if (card.actionType === 'global_monthly') setIsSetGlobalMonthlyTargetDialogOpen(true);
                      if (card.actionType === 'global_weekly') setIsSetGlobalWeeklyTargetDialogOpen(true);
                    }}
                  >
                    <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit Global
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

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1"> {/* Changed from md:grid-cols-3 lg:grid-cols-3 */}
        <Card className="shadow-lg bg-card h-[400px] transition-shadow duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Recent Activity</CardTitle>
            <CardDescription className="text-muted-foreground">Overview of recent order updates and comments.</CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-84px)] p-0"> 
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                {mockRecentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0 pt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground leading-tight">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.details}</p>
                      <div className="flex items-center space-x-2 mt-1.5">
                        <Avatar className="h-6 w-6">
                           <AvatarImage src={activity.userAvatar || `https://placehold.co/40x40.png?text=${getInitials(activity.userName)}`} alt={activity.userName} data-ai-hint="user avatar"/>
                          <AvatarFallback className="text-xs bg-primary/20 text-primary">{getInitials(activity.userName)}</AvatarFallback>
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
                    <ListChecks className="w-20 h-20 mb-4 opacity-50" />
                    <p className="text-lg">No recent activity to display.</p>
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

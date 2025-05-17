
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from "next/link";
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, MessageSquare, PlusCircle, UserCircle, Edit3, CalendarDays, CalendarClock, Target, TrendingUp, ListChecks, Edit, PackageCheck, Truck } from 'lucide-react';
import { formatDistanceToNow, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { SetSalesTargetDialog } from '@/components/dashboard/set-sales-target-dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { User, TrackingLink, CustomStatus, OrderLogEntry, Comment as OrderComment } from '@/types';
import { getOrders } from '@/lib/order-service';
import { getStatuses } from '@/lib/status-service';
import { getGlobalSalesTargets, type GlobalSalesTargets } from '@/lib/settings-service';
import { setGlobalTargetAction } from './actions';
import { useToast } from '@/hooks/use-toast';


interface ActivityItem {
  id: string;
  type: 'status_update' | 'new_comment' | 'order_created' | 'dr_assigned';
  orderId: string;
  title: string;
  details: string;
  userName: string;
  userAvatar?: string;
  timestamp: string;
}

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

const DEFAULT_GLOBAL_TARGETS_STATE: GlobalSalesTargets = {
  globalMonthlyOrderTarget: 0,
  globalWeeklyOrderTarget: 0,
};

// These mock values will be replaced once actual order data integration for CRMs is done
const MOCK_CURRENT_MONTHLY_ORDERS_COMPLETED_FOR_CRM = 0;
const MOCK_CURRENT_WEEKLY_ORDERS_COMPLETED_FOR_CRM = 0;

const getProgressColorClass = (percentage: number): string => {
  if (percentage < 0) percentage = 0;
  const colorPercentage = Math.min(percentage, 100);
  if (colorPercentage < 33) return 'bg-red-500 dark:bg-red-600';
  if (colorPercentage < 67) return 'bg-yellow-500 dark:bg-yellow-400';
  return 'bg-green-500 dark:bg-green-600';
};

const MAX_RECENT_ACTIVITIES_DISPLAY = 15;
const ORDERS_TO_SCAN_FOR_ACTIVITY = 10;

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [isLoadingGlobalTargets, setIsLoadingGlobalTargets] = useState(true);
  const [activeOrdersCount, setActiveOrdersCount] = useState<number | null>(null);
  const [isLoadingActiveOrders, setIsLoadingActiveOrders] = useState(true);
  const [monthlyDeliveriesCount, setMonthlyDeliveriesCount] = useState<number | null>(null);
  const [isLoadingMonthlyDeliveries, setIsLoadingMonthlyDeliveries] = useState(true);


  const [globalTargets, setGlobalTargets] = useState<GlobalSalesTargets>(DEFAULT_GLOBAL_TARGETS_STATE);

  const [isSetGlobalMonthlyTargetDialogOpen, setIsSetGlobalMonthlyTargetDialogOpen] = useState(false);
  const [isSetGlobalWeeklyTargetDialogOpen, setIsSetGlobalWeeklyTargetDialogOpen] = useState(false);

  const fetchGlobalTargets = useCallback(async () => {
    setIsLoadingGlobalTargets(true);
    try {
      const targets = await getGlobalSalesTargets();
      setGlobalTargets(targets);
    } catch (error) {
      console.error("Failed to fetch global sales targets:", error);
      toast({ title: "Error", description: "Could not load global sales targets.", variant: "destructive" });
      setGlobalTargets(DEFAULT_GLOBAL_TARGETS_STATE); // Fallback to defaults
    } finally {
      setIsLoadingGlobalTargets(false);
    }
  }, [toast]);


  const fetchDashboardData = useCallback(async () => {
    setIsLoadingActivities(true);
    setIsLoadingActiveOrders(true);
    setIsLoadingMonthlyDeliveries(true);
    try {
      const [fetchedOrders, allStatuses] = await Promise.all([
        getOrders(),
        getStatuses()
      ]);
      
      const statusMap = new Map(allStatuses.map(s => [s.id, s.name]));
      const activities: ActivityItem[] = [];

      const sortedOrders = [...fetchedOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const ordersToProcessForActivity = sortedOrders.slice(0, ORDERS_TO_SCAN_FOR_ACTIVITY);


      for (const order of ordersToProcessForActivity) {
        activities.push({
          id: `order-created-${order.id}`,
          type: 'order_created',
          orderId: order.id,
          title: `New Order: ${order.id}`,
          details: `For ${order.customerName}`,
          userName: order.crmUserName,
          timestamp: order.createdAt,
        });

        let drAssignedForThisOrder = false;
        for (const log of order.statusHistory) {
          const statusName = statusMap.get(log.status) || log.status;
          activities.push({
            id: log.id,
            type: 'status_update',
            orderId: order.id,
            title: `Status: ${order.id} to ${statusName}`,
            details: log.notes || `Order status changed to ${statusName}`,
            userName: log.changedByUserName,
            timestamp: log.timestamp,
          });

          if (!drAssignedForThisOrder && order.designerRepresentativeName && log.notes?.toLowerCase().includes(`assigned to designer: ${order.designerRepresentativeName.toLowerCase()}`)) {
            activities.push({
              id: `dr-assigned-${order.id}-${log.id}`,
              type: 'dr_assigned',
              orderId: order.id,
              title: `Designer Assigned: ${order.id}`,
              details: `${order.designerRepresentativeName} assigned by ${log.changedByUserName}.`,
              userName: log.changedByUserName,
              timestamp: log.timestamp,
            });
            drAssignedForThisOrder = true;
          }
        }

        if (!drAssignedForThisOrder && order.designerRepresentativeName) {
            const readyForDesignLog = order.statusHistory.find(log => statusMap.get(log.status)?.toLowerCase() === 'ready for design');
            activities.push({
              id: `dr-assigned-${order.id}-fallback`,
              type: 'dr_assigned',
              orderId: order.id,
              title: `Designer Assigned: ${order.id}`,
              details: `${order.designerRepresentativeName} assigned.`,
              userName: readyForDesignLog?.changedByUserName || order.crmUserName,
              timestamp: readyForDesignLog?.timestamp || order.createdAt,
            });
        }

        for (const comment of order.comments) {
          if (comment.isInternal && currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SYSTEM_ADMIN' && currentUser?.id !== order.crmUserId && currentUser?.id !== order.designerRepresentativeId) {
            continue;
          }
          activities.push({
            id: comment.id,
            type: 'new_comment',
            orderId: order.id,
            title: `New Comment on ${order.id}`,
            details: comment.text.substring(0, 100) + (comment.text.length > 100 ? '...' : ''),
            userName: comment.userName,
            timestamp: comment.timestamp,
          });
        }
      }

      const sortedActivities = activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivities(sortedActivities.slice(0, MAX_RECENT_ACTIVITIES_DISPLAY));

      // Calculate active orders
      const deliveredStatusId = allStatuses.find(s => s.name.toLowerCase() === 'delivered')?.id;
      const cancelledStatusId = allStatuses.find(s => s.name.toLowerCase() === 'cancelled')?.id;
      
      const activeOrders = fetchedOrders.filter(order => {
        return order.currentStatus !== deliveredStatusId && order.currentStatus !== cancelledStatusId;
      });
      setActiveOrdersCount(activeOrders.length);

      // Calculate monthly deliveries
      if (deliveredStatusId) {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        let deliveriesThisMonth = 0;

        fetchedOrders.forEach(order => {
          const deliveredLog = order.statusHistory.find(
            log => log.status === deliveredStatusId && isWithinInterval(new Date(log.timestamp), { start: monthStart, end: monthEnd })
          );
          if (deliveredLog) {
            deliveriesThisMonth++;
          }
        });
        setMonthlyDeliveriesCount(deliveriesThisMonth);
      } else {
        setMonthlyDeliveriesCount(0); // If 'Delivered' status doesn't exist
      }


    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast({ title: "Error", description: "Could not load dashboard data.", variant: "destructive" });
      setActiveOrdersCount(0); // Fallback on error
      setMonthlyDeliveriesCount(0);
    } finally {
      setIsLoadingActivities(false);
      setIsLoadingActiveOrders(false);
      setIsLoadingMonthlyDeliveries(false);
    }
  }, [currentUser, toast]);


  useEffect(() => {
    setIsClient(true);
    fetchGlobalTargets();
    if (currentUser) {
        fetchDashboardData();
    }
  }, [fetchDashboardData, currentUser, fetchGlobalTargets]);

  const crmEffectiveMonthlyTarget = currentUser?.role === 'CRM' ? (currentUser.monthlyOrderTarget ?? globalTargets.globalMonthlyOrderTarget) : globalTargets.globalMonthlyOrderTarget;
  const crmEffectiveWeeklyTarget = currentUser?.role === 'CRM' ? (currentUser.weeklyOrderTarget ?? globalTargets.globalWeeklyOrderTarget) : globalTargets.globalWeeklyOrderTarget;

  const crmMonthlyOrdersCompleted = currentUser?.role === 'CRM' ? MOCK_CURRENT_MONTHLY_ORDERS_COMPLETED_FOR_CRM : 0;
  const crmWeeklyOrdersCompleted = currentUser?.role === 'CRM' ? MOCK_CURRENT_WEEKLY_ORDERS_COMPLETED_FOR_CRM : 0;


  const handleSetGlobalMonthlyOrderTarget = async (newTarget: number) => {
    const result = await setGlobalTargetAction('monthly', newTarget);
    if (result.success) {
      toast({ title: "Success", description: `Global monthly target updated to ${newTarget}.` });
      await fetchGlobalTargets(); // Re-fetch from Firestore
    } else {
      toast({ title: "Error", description: result.error || "Could not update global monthly target.", variant: "destructive" });
    }
    setIsSetGlobalMonthlyTargetDialogOpen(false);
  };

  const handleSetGlobalWeeklyOrderTarget = async (newTarget: number) => {
    const result = await setGlobalTargetAction('weekly', newTarget);
     if (result.success) {
      toast({ title: "Success", description: `Global weekly target updated to ${newTarget}.` });
      await fetchGlobalTargets(); // Re-fetch from Firestore
    } else {
      toast({ title: "Error", description: result.error || "Could not update global weekly target.", variant: "destructive" });
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

  let summaryCards = [];

  if (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN') {
    summaryCards.push(
      {
        title: "Active Orders",
        value: isLoadingActiveOrders || activeOrdersCount === null ? <Skeleton className="h-10 w-16 inline-block" /> : activeOrdersCount.toString(),
        icon: Package,
        change: "+0% this month", // Placeholder
        dataAiHint: "delivery boxes",
        type: "info" as const,
        trend: "up" as const
      },
      {
        title: "Monthly Deliveries",
        value: isLoadingMonthlyDeliveries || monthlyDeliveriesCount === null ? <Skeleton className="h-10 w-16 inline-block" /> : monthlyDeliveriesCount.toString(),
        icon: Truck, // Or PackageCheck
        change: "This month",
        dataAiHint: "delivery truck calendar",
        type: "info" as const,
      },
      {
        title: "Global Weekly Order Target",
        value: isLoadingGlobalTargets ? <Skeleton className="h-6 w-24 inline-block" /> : `${globalTargets.globalWeeklyOrderTarget} Orders`,
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
        title: "Active Orders",
        value: isLoadingActiveOrders || activeOrdersCount === null ? <Skeleton className="h-10 w-16 inline-block" /> : activeOrdersCount.toString(),
        icon: Package,
        change: "+0% this month", // Placeholder
        dataAiHint: "delivery boxes",
        type: "info" as const,
        trend: "up" as const
      },
      {
        title: "Your Monthly Orders",
        value: `${crmMonthlyOrdersCompleted} / ${crmEffectiveMonthlyTarget} Orders`,
        icon: CalendarDays,
        currentCompleted: crmMonthlyOrdersCompleted,
        targetValue: crmEffectiveMonthlyTarget,
        dataAiHint: "monthly calendar checklist",
        type: "progress" as const,
        isLoadingTargetValue: isLoadingGlobalTargets && currentUser.monthlyOrderTarget === undefined,
      },
      {
        title: "Your Weekly Orders",
        value: `${crmWeeklyOrdersCompleted} / ${crmEffectiveWeeklyTarget} Orders`,
        icon: CalendarClock,
        currentCompleted: crmWeeklyOrdersCompleted,
        targetValue: crmEffectiveWeeklyTarget,
        dataAiHint: "weekly calendar tasks",
        type: "progress" as const,
        isLoadingTargetValue: isLoadingGlobalTargets && currentUser.weeklyOrderTarget === undefined,
      }
    );
  } else { // For Designer Representatives or other roles
     summaryCards.push(
      {
        title: "Active Orders",
        value: isLoadingActiveOrders || activeOrdersCount === null ? <Skeleton className="h-10 w-16 inline-block" /> : activeOrdersCount.toString(),
        icon: Package,
        change: "+0% this month", // Placeholder
        dataAiHint: "delivery boxes",
        type: "info" as const,
        trend: "up" as const
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
          const targetValue = card.type === 'progress' ? card.targetValue : (card.type === 'target' ? (card.actionType === 'global_weekly' ? globalTargets.globalWeeklyOrderTarget : undefined) : undefined);
          const currentCompleted = card.type === 'progress' ? card.currentCompleted : undefined;


          if (card.type === 'progress' && targetValue && targetValue > 0) {
            progressPercentage = ( (currentCompleted ?? 0) / targetValue) * 100;
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
                     card.isLoadingTargetValue ? <Skeleton className="h-12 w-3/4 mb-3" /> : (
                      <>
                        <div className="text-2xl sm:text-3xl font-bold text-card-foreground">
                          {currentCompleted} <span className="text-lg sm:text-xl text-muted-foreground">/ {targetValue}</span>
                        </div>
                         <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-2">
                          Orders ({progressPercentage.toFixed(0)}% complete)
                        </p>
                        <Progress value={Math.min(progressPercentage, 100)} indicatorClassName={progressColorClass} className="h-2 sm:h-2.5 rounded-full mb-3" aria-label={`${card.title} progress ${progressPercentage.toFixed(0)}%`} />
                      </>
                     )
                  ) : card.type === 'target' ? (
                     isLoadingGlobalTargets ? <Skeleton className="h-10 w-32" /> : <div className="text-3xl sm:text-4xl font-bold text-card-foreground">{card.value}</div>
                  ) : (
                    <div className="text-3xl sm:text-4xl font-bold text-card-foreground">{card.value}</div>
                  )}
                  {card.change && card.type === 'info' && (
                     <p className="text-xs text-green-600 dark:text-green-400 flex items-center mt-1">
                       <TrendingUp className="h-4 w-4 mr-1"/> {card.change}
                    </p>
                  )}
                  {card.change && card.type !== 'info' && card.type !== 'progress' && ( // Only for 'target' or other future types
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
                    disabled={isLoadingGlobalTargets}
                  >
                    <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Global Target
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN') && isClient && (
        <>
          {/* This dialog is no longer directly triggered by a card, but can be kept for future use or removed if "Global Monthly Target" card is permanently replaced */}
          {/* 
          <SetSalesTargetDialog
            isOpen={isSetGlobalMonthlyTargetDialogOpen}
            onOpenChange={setIsSetGlobalMonthlyTargetDialogOpen}
            currentTarget={globalTargets.globalMonthlyOrderTarget}
            onSetTarget={handleSetGlobalMonthlyOrderTarget}
            targetType="monthly"
          />
          */}
          <SetSalesTargetDialog
            isOpen={isSetGlobalWeeklyTargetDialogOpen}
            onOpenChange={setIsSetGlobalWeeklyTargetDialogOpen}
            currentTarget={globalTargets.globalWeeklyOrderTarget}
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
                {isLoadingActivities ? (
                  [...Array(5)].map((_, i) => (
                    <div key={`skel-activity-${i}`} className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-3.5 rounded-lg border border-transparent">
                      <Skeleton className="h-5 w-5 sm:h-6 sm:w-6 rounded-md mt-1 sm:mt-1.5" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-3/4 rounded" />
                        <Skeleton className="h-3 w-1/2 rounded" />
                         <div className="flex items-center space-x-2 mt-1.5 sm:mt-2">
                           <Skeleton className="h-6 w-6 sm:h-7 sm:w-7 rounded-full" />
                           <Skeleton className="h-3 w-24 rounded" />
                         </div>
                      </div>
                    </div>
                  ))
                ) : recentActivities.length > 0 ? recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-3.5 rounded-lg hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/20 cursor-pointer group">
                    <div className="flex-shrink-0 pt-1 sm:pt-1.5 text-primary">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <Link href={`/track/${activity.orderId}`} className="group">
                        <p className="text-xs sm:text-sm font-medium text-foreground leading-tight group-hover:text-primary transition-colors group-hover:underline">{activity.title}</p>
                      </Link>
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
    

    
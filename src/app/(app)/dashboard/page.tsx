
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, CheckSquare, Users, DollarSign, ListChecks, MessageSquare, PlusCircle, UserCircle, Target, Edit3, CalendarDays, CalendarClock } from 'lucide-react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { SetSalesTargetDialog } from '@/components/dashboard/set-sales-target-dialog';

interface ActivityItem {
  id: string;
  type: 'status_update' | 'new_comment' | 'order_created';
  orderId: string;
  title: string;
  details: string;
  userName: string;
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
    title: 'Internal note on Tech Solutions Inc.',
    details: 'Carol DR: "Client approved final mockups."',
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
      return <PlusCircle className="h-5 w-5 text-purple-500" />;
    default:
      return <UserCircle className="h-5 w-5 text-gray-500" />;
  }
};

const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
}

const LOCAL_STORAGE_MONTHLY_SALES_TARGET_KEY = 'trackflow-monthly-sales-target';
const LOCAL_STORAGE_WEEKLY_SALES_TARGET_KEY = 'trackflow-weekly-sales-target';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [monthlySalesTarget, setMonthlySalesTarget] = useState<number>(50000); // Default
  const [weeklySalesTarget, setWeeklySalesTarget] = useState<number>(10000); // Default
  const [isSetMonthlyTargetDialogOpen, setIsSetMonthlyTargetDialogOpen] = useState(false);
  const [isSetWeeklyTargetDialogOpen, setIsSetWeeklyTargetDialogOpen] = useState(false);

  useEffect(() => {
    const storedMonthlyTarget = localStorage.getItem(LOCAL_STORAGE_MONTHLY_SALES_TARGET_KEY);
    if (storedMonthlyTarget) {
      setMonthlySalesTarget(parseFloat(storedMonthlyTarget));
    }
    const storedWeeklyTarget = localStorage.getItem(LOCAL_STORAGE_WEEKLY_SALES_TARGET_KEY);
    if (storedWeeklyTarget) {
      setWeeklySalesTarget(parseFloat(storedWeeklyTarget));
    }
  }, []);

  const handleSetMonthlySalesTarget = (newTarget: number) => {
    setMonthlySalesTarget(newTarget);
    localStorage.setItem(LOCAL_STORAGE_MONTHLY_SALES_TARGET_KEY, newTarget.toString());
    setIsSetMonthlyTargetDialogOpen(false);
  };

  const handleSetWeeklySalesTarget = (newTarget: number) => {
    setWeeklySalesTarget(newTarget);
    localStorage.setItem(LOCAL_STORAGE_WEEKLY_SALES_TARGET_KEY, newTarget.toString());
    setIsSetWeeklyTargetDialogOpen(false);
  };

  if (!currentUser) {
    return null;
  }

  const summaryCards = [
    { title: "Active Orders", value: "125", icon: Package, change: "+15.2%", dataAiHint: "delivery boxes" },
    { title: "Pending Approval", value: "12", icon: CheckSquare, change: "-3.1%", dataAiHint: "checklist form" },
    { title: "Revenue (MTD)", value: "$15,6K", icon: DollarSign, change: "+8.0%", dataAiHint: "financial chart" },
    { 
      title: "Monthly Sales Target (CRM)", 
      value: `$${monthlySalesTarget.toLocaleString()}`, 
      icon: CalendarDays, 
      change: currentUser.role === 'ADMIN' ? "Editable by Admin" : "Set by Admin", 
      dataAiHint: "monthly calendar target",
      isAdminOnlyAction: true,
      actionType: 'monthly' as const
    },
    { 
      title: "Weekly Sales Target (CRM)", 
      value: `$${weeklySalesTarget.toLocaleString()}`, 
      icon: CalendarClock, 
      change: currentUser.role === 'ADMIN' ? "Editable by Admin" : "Set by Admin", 
      dataAiHint: "weekly calendar goal",
      isAdminOnlyAction: true,
      actionType: 'weekly' as const
    },
  ];


  return (
    <div className="space-y-6">
      <Card className="shadow-xl bg-gradient-to-br from-primary/90 via-primary/70 to-primary/90 border-primary/70">
        <CardHeader>
          <CardTitle className="text-3xl text-primary-foreground">Welcome to TrackFlow, {currentUser.name}!</CardTitle>
          <CardDescription className="text-lg text-primary-foreground/90">
            You are logged in as {currentUser.role}. Here's a quick overview of your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-primary-foreground/95">This is your main dashboard. From here, you can navigate to various sections of the application using the sidebar.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <Card key={card.title} className="shadow-md hover:shadow-lg transition-shadow border hover:border-primary/70 duration-300 bg-card relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">{card.title}</CardTitle>
              <card.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.change}
              </p>
              {card.isAdminOnlyAction && currentUser.role === 'ADMIN' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="absolute bottom-3 right-3 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                  onClick={() => {
                    if (card.actionType === 'monthly') setIsSetMonthlyTargetDialogOpen(true);
                    if (card.actionType === 'weekly') setIsSetWeeklyTargetDialogOpen(true);
                  }}
                >
                  <Edit3 className="mr-1 h-3 w-3" /> Edit
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {currentUser.role === 'ADMIN' && (
        <>
          <SetSalesTargetDialog
            isOpen={isSetMonthlyTargetDialogOpen}
            onOpenChange={setIsSetMonthlyTargetDialogOpen}
            currentTarget={monthlySalesTarget}
            onSetTarget={handleSetMonthlySalesTarget}
            targetType="monthly"
          />
          <SetSalesTargetDialog
            isOpen={isSetWeeklyTargetDialogOpen}
            onOpenChange={setIsSetWeeklyTargetDialogOpen}
            currentTarget={weeklySalesTarget}
            onSetTarget={handleSetWeeklySalesTarget}
            targetType="weekly"
          />
        </>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-xl bg-card h-[350px]">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Activity</CardTitle>
            <CardDescription className="text-muted-foreground">Overview of recent order updates and comments.</CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-76px)] p-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                {mockRecentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 pt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground leading-tight">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.details}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Avatar className="h-5 w-5">
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
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <ListChecks className="w-16 h-16 mb-4 opacity-50" />
                    <p>No recent activity to display.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className="shadow-xl bg-card h-[350px]">
          <CardHeader>
            <CardTitle className="text-foreground">Order Status Distribution</CardTitle>
            <CardDescription className="text-muted-foreground">Visual breakdown of current order statuses.</CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-76px)] flex items-center justify-center">
            <Image src="https://placehold.co/600x300.png" alt="Order Status Chart Placeholder" data-ai-hint="pie chart" width={600} height={300} className="rounded-md object-contain max-h-full"/>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


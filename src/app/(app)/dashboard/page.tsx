
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; 
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DateRangePicker, type PredefinedRange } from '@/components/dashboard/date-range-picker';
import type { DateRange } from "react-day-picker";
import { format, isWithinInterval, parseISO, subDays, addDays, getHours } from "date-fns"; 
import { 
  Hand, 
  ShoppingCart, 
  BadgeDollarSign, 
  FileText, 
  Undo2, 
  Download, 
  AlertTriangle, 
  Redo2, 
  Receipt, 
  BarChartBig,
  Users,
  CalendarDays, 
  ChevronDown,
  Loader2,
  Briefcase,
  ClipboardCheck,
  ClipboardX,
  DraftingCompass,
  PauseCircle,
  Truck,
  CheckCircle,
  PackageCheck,
  PieChart as PieChartIcon,
  User as UserIcon, // Added for new section
  BaggageClaim, // Added for new section
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend as RechartsLegend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import type { TrackingLink, OrderItem, ServiceModelItem, User, Project, ProjectStatusType, GlobalSettings, Lead, LeadCategory } from '@/types'; 
import { getOrders } from '@/lib/order-service';
import { getModels } from '@/lib/service-options-service'; 
import { useToast } from '@/hooks/use-toast';
import { getUsers } from '@/lib/user-service';
import { getProjects } from '@/lib/project-service';
import { getLeads } from '@/lib/lead-service';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getGlobalSettings } from '@/lib/settings-service';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const chartConfig = {
  sales: {
    label: "Total Sales (BDT)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const trafficSourcesChartConfig = {
  "Facebook": { label: "Facebook", color: "hsl(var(--chart-3))" },
  "WhatsApp": { label: "WhatsApp", color: "hsl(var(--chart-2))" },
  "Office Visit": { label: "Office Visit", color: "hsl(var(--chart-5))" },
  "Phone Call": { label: "Phone Call", color: "hsl(var(--chart-1))" },
  "Others": { label: "Others", color: "hsl(var(--muted-foreground))" },
} satisfies ChartConfig;


const formatCurrency = (value: number): string => {
  const numberPart = value.toLocaleString('en-US', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `৳${numberPart}`; 
};

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  iconColorClass?: string;
  circleBgClass?: string;
  isLoading?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon: Icon, iconColorClass = "text-primary", circleBgClass = "bg-primary/10", isLoading }) => {
  if (isLoading) {
    return (
      <Card className="bg-card p-4 shadow-md">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-32" />
          </div>
        </div>
      </Card>
    );
  }
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow bg-card p-4">
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-full ${circleBgClass}`}>
          <Icon className={`h-6 w-6 ${iconColorClass}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
        </div>
      </div>
    </Card>
  );
};


const ALL_PROJECT_STATUSES_CONFIG: Array<{ title: string; status: ProjectStatusType; icon: React.ElementType; color: string; gradient: string; shadow: string; }> = [
    { title: 'CR Clearance', status: 'CR Clearance', icon: ClipboardCheck, color: '#3b82f6', gradient: 'linear-gradient(to right, #3b82f6, #60a5fa)', shadow: '0 4px 15px 0 rgba(59, 130, 246, 0.4)' },
    { title: 'Cancel', status: 'Cancel', icon: ClipboardX, color: '#ef4444', gradient: 'linear-gradient(to right, #ef4444, #f87171)', shadow: '0 4px 15px 0 rgba(239, 68, 68, 0.4)' },
    { title: 'On Design', status: 'On Design', icon: DraftingCompass, color: '#8b5cf6', gradient: 'linear-gradient(to right, #8b5cf6, #a78bfa)', shadow: '0 4px 15px 0 rgba(139, 92, 246, 0.4)' },
    { title: 'On Hold', status: 'On Hold', icon: PauseCircle, color: '#f97316', gradient: 'linear-gradient(to right, #f97316, #fb923c)', shadow: '0 4px 15px 0 rgba(249, 115, 22, 0.4)' },
    { title: 'Logistics', status: 'Logistics', icon: Truck, color: '#78350f', gradient: 'linear-gradient(to right, #78350f, #a16207)', shadow: '0 4px 15px 0 rgba(120, 53, 15, 0.4)' },
    { title: 'Courier', status: 'Courier', icon: CheckCircle, color: '#16a34a', gradient: 'linear-gradient(to right, #16a34a, #4ade80)', shadow: '0 4px 15px 0 rgba(22, 163, 74, 0.4)' },
    { title: 'Delivered', status: 'Delivered', icon: PackageCheck, color: '#65a30d', gradient: 'linear-gradient(to right, #65a30d, #84cc16)', shadow: '0 4px 15px 0 rgba(101, 163, 13, 0.4)' },
];

const ALL_LEAD_CATEGORIES_CONFIG: Array<{ title: string; category: LeadCategory; icon: React.ElementType; color: string; gradient: string; shadow: string; }> = [
    { title: 'POP', category: 'POP', icon: UserIcon, color: '#0ea5e9', gradient: 'linear-gradient(to right, #0ea5e9, #38bdf8)', shadow: '0 4px 15px 0 rgba(14, 165, 233, 0.4)' },
    { title: 'POG', category: 'POG', icon: Users, color: '#1d4ed8', gradient: 'linear-gradient(to right, #1d4ed8, #3b82f6)', shadow: '0 4px 15px 0 rgba(29, 78, 216, 0.4)' },
    { title: 'OC', category: 'OC', icon: BaggageClaim, color: '#9333ea', gradient: 'linear-gradient(to right, #9333ea, #a855f7)', shadow: '0 4px 15px 0 rgba(147, 51, 234, 0.4)' },
    { title: 'OD', category: 'OD', icon: Briefcase, color: '#16a34a', gradient: 'linear-gradient(to right, #16a34a, #22c55e)', shadow: '0 4px 15px 0 rgba(22, 163, 74, 0.4)' },
    { title: 'B2B', category: 'B2B', icon: ShoppingCart, color: '#ea580c', gradient: 'linear-gradient(to right, #ea580c, #f97316)', shadow: '0 4px 15px 0 rgba(234, 88, 12, 0.4)' },
];


export default function DashboardPage() {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [allOrders, setAllOrders] = useState<TrackingLink[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allModels, setAllModels] = useState<ServiceModelItem[]>([]); 
  const [allCrmUsers, setAllCrmUsers] = useState<User[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const [currentDateRangeLabel, setCurrentDateRangeLabel] = useState("Last 30 Days");
  const [selectedPredefinedValue, setSelectedPredefinedValue] = useState<PredefinedRange | "custom" | null>("last30Days");
  const [chartGranularity, setChartGranularity] = useState<'daily' | 'hourly'>('daily');
  const [selectedCrmId, setSelectedCrmId] = useState<string>('all');


  const [totalSales, setTotalSales] = useState(formatCurrency(0));
  const [invoiceDue, setInvoiceDue] = useState(formatCurrency(0));
  const [salesChartData, setSalesChartData] = useState<Array<{ date: string; sales: number; orders: number; }>>([]);
  const [totalPurchase, setTotalPurchase] = useState(formatCurrency(0)); 

  const [netValue, setNetValue] = useState(formatCurrency(0));
  const [totalSellReturn, setTotalSellReturn] = useState(formatCurrency(0));
  const [purchaseDue, setPurchaseDue] = useState(formatCurrency(0));
  const [totalPurchaseReturn, setTotalPurchaseReturn] = useState(formatCurrency(0));
  const [expense, setExpense] = useState(formatCurrency(0));
  
  const isDesignerRepOrLr = currentUser?.role === 'DESIGNER_REPRESENTATIVE' || currentUser?.role === 'LR';

  useEffect(() => {
    setSelectedDateRange({
      from: subDays(new Date(), 29), 
      to: new Date(),
    });
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!currentUser) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const [fetchedOrders, fetchedModels, fetchedUsers, fetchedProjects, fetchedSettings, fetchedLeads] = await Promise.all([ 
        getOrders(),
        getModels(),
        getUsers(),
        getProjects(),
        getGlobalSettings(),
        getLeads(),
      ]);
      setAllOrders(fetchedOrders);
      setAllProjects(fetchedProjects);
      setAllModels(fetchedModels); 
      setAllCrmUsers(fetchedUsers.filter(u => u.role === 'CRM'));
      setGlobalSettings(fetchedSettings);
      setAllLeads(fetchedLeads);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast({ title: "Error", description: "Could not load dashboard data.", variant: "destructive" });
      setAllOrders([]);
      setAllProjects([]);
      setAllModels([]);
      setAllCrmUsers([]);
      setAllLeads([]);
      setGlobalSettings(null);
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, currentUser]);

  const filteredOrders = useMemo(() => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) return [];
    
    const startDate = new Date(selectedDateRange.from as Date);
    startDate.setHours(0, 0, 0, 0); 

    const endDate = new Date(selectedDateRange.to as Date);
    endDate.setHours(23, 59, 59, 999);

    let ordersToFilter = allOrders.filter(order => 
      order.createdAt && isWithinInterval(parseISO(order.createdAt), {
        start: startDate, 
        end: endDate
      })
    );
    
    if (currentUser?.role === 'CRM') {
      ordersToFilter = ordersToFilter.filter(order => order.crmUserId === currentUser.id);
    } else if (selectedCrmId !== 'all') {
      ordersToFilter = ordersToFilter.filter(order => order.crmUserId === selectedCrmId);
    }
    
    return ordersToFilter;
  }, [allOrders, selectedDateRange, currentUser, selectedCrmId]);

  const trafficSourcesData = useMemo(() => {
    if (!allLeads.length) return [];
    const sourceCounts: Record<string, number> = {};
    allLeads.forEach(lead => {
      const source = lead.source || "Others";
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    const total = allLeads.length;
    if (total === 0) return [];

    return Object.entries(sourceCounts)
      .map(([name, value]) => ({
        name,
        value,
        fill: trafficSourcesChartConfig[name as keyof typeof trafficSourcesChartConfig]?.color || "hsl(var(--muted-foreground))"
      }))
      .sort((a,b) => b.value - a.value);
  }, [allLeads]);

  const projectCounts = useMemo(() => {
    const counts: Record<ProjectStatusType, number> = {
      'CR Clearance': 0, 'Cancel': 0, 'On Design': 0, 'On Hold': 0, 'Logistics': 0, 'Courier': 0, 'Delivered': 0,
    };
    
    let projectsToCount = allProjects;
    if (currentUser?.role === 'CRM') {
        projectsToCount = allProjects.filter(p => p.assigneeId === currentUser.id);
    } else if (currentUser?.role === 'DESIGNER_REPRESENTATIVE') {
        projectsToCount = allProjects.filter(p => p.designerRepresentativeId === currentUser.id);
    }

    projectsToCount.forEach(p => {
        if(counts[p.status] !== undefined) {
            counts[p.status]++;
        }
    });
    return counts;
  }, [allProjects, currentUser]);
  
  const leadCategoryCounts = useMemo(() => {
    const counts: Record<LeadCategory, number> = {
        'POP': 0, 'POG': 0, 'OC': 0, 'OD': 0, 'B2B': 0
    };
    let leadsToCount = allLeads;
    if (currentUser?.role === 'CRM') {
        leadsToCount = allLeads.filter(l => l.crmId === currentUser.id);
    }
    leadsToCount.forEach(l => {
        if(counts[l.category] !== undefined) {
            counts[l.category]++;
        }
    });
    return counts;
  }, [allLeads, currentUser]);

  useEffect(() => {
    if (isLoadingData || !selectedDateRange) return;

    let currentTotalSales = 0;
    let currentTotalAdvance = 0;
    let currentTotalPurchaseValue = 0;

    filteredOrders.forEach(order => {
      if (Array.isArray(order.orderItems)) {
        order.orderItems.forEach((item: OrderItem) => {
          currentTotalSales += item.lineItemTotalPrice || 0;
          const modelDetails = allModels.find(m => m.name === item.model);
          if (modelDetails && typeof modelDetails.buyingPrice === 'number' && typeof item.quantity === 'number' && item.quantity > 0) {
            currentTotalPurchaseValue += (modelDetails.buyingPrice * item.quantity);
          }
        });
      }
      if (Array.isArray(order.advancePayments) && order.advancePayments.length > 0) {
        currentTotalAdvance += order.advancePayments.reduce((sum, payment) => sum + payment.amount, 0);
      } else if (order.advancePayment) { 
        currentTotalAdvance += order.advancePayment;
      }
    });
    
    setTotalSales(formatCurrency(currentTotalSales));
    setInvoiceDue(formatCurrency(currentTotalSales - currentTotalAdvance));
    setTotalPurchase(formatCurrency(currentTotalPurchaseValue));
    setNetValue(formatCurrency(currentTotalSales - currentTotalPurchaseValue));

    if (selectedPredefinedValue === 'today' || selectedPredefinedValue === 'yesterday') {
      setChartGranularity('hourly');
      const hourlyData = new Map<number, { sales: number; orders: number }>();
      for (let i = 0; i < 24; i++) {
        hourlyData.set(i, { sales: 0, orders: 0 }); 
      }
      filteredOrders.forEach(order => {
        if (order.createdAt) {
          try {
            const orderDate = parseISO(order.createdAt);
            const hour = getHours(orderDate);
            const orderTotalForChart = order.orderItems.reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0);
            const existing = hourlyData.get(hour) || { sales: 0, orders: 0 };
            hourlyData.set(hour, { sales: existing.sales + orderTotalForChart, orders: existing.orders + 1 });
          } catch (e) {
            console.error("Error processing order for hourly chart:", order.id, e);
          }
        }
      });
      const chartData = Array.from(hourlyData.entries())
        .map(([hour, data]) => ({ date: hour.toString(), sales: data.sales, orders: data.orders })) 
        .sort((a, b) => parseInt(a.date) - parseInt(b.date));
      setSalesChartData(chartData);
    } else if (selectedDateRange?.from && selectedDateRange?.to) {
      setChartGranularity('daily');
      const dailyData = new Map<string, { sales: number; orders: number }>();
      let tempDatePointerForInit = new Date(selectedDateRange.from);
      tempDatePointerForInit.setHours(0,0,0,0);
      const endDateForInit = new Date(selectedDateRange.to); 
      endDateForInit.setHours(23,59,59,999);
      
      while (tempDatePointerForInit <= endDateForInit) { 
          dailyData.set(format(tempDatePointerForInit, 'yyyy-MM-dd'), { sales: 0, orders: 0 });
          tempDatePointerForInit = addDays(tempDatePointerForInit, 1);
      }
      filteredOrders.forEach(order => {
        if (order.createdAt) {
          try {
            const orderDate = parseISO(order.createdAt);
            orderDate.setHours(0,0,0,0); 
            const orderDateStr = format(orderDate, 'yyyy-MM-dd');
            if (dailyData.has(orderDateStr)) {
              const orderTotalForChart = order.orderItems.reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0);
              const existing = dailyData.get(orderDateStr) || { sales: 0, orders: 0 };
              dailyData.set(orderDateStr, { sales: existing.sales + orderTotalForChart, orders: existing.orders + 1 });
            }
          } catch (e) {
            console.error("Error processing order for daily chart:", order.id, e);
          }
        }
      });
      const chartData = Array.from(dailyData.entries())
        .map(([date, data]) => ({ date, sales: data.sales, orders: data.orders }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setSalesChartData(chartData);
    } else {
      setSalesChartData([]);
      setChartGranularity('daily');
    }
  }, [isLoadingData, filteredOrders, selectedDateRange, allModels, selectedPredefinedValue, currentUser]);


  const handleDateRangeChange = (range: DateRange | undefined, label: string, predefined: PredefinedRange | "custom" | null) => {
    setSelectedDateRange(range);
    setCurrentDateRangeLabel(label);
    setSelectedPredefinedValue(predefined);
  };

 const summaryCardDefinitions = [
    { title: "Total Sales", value: totalSales, icon: ShoppingCart, iconColorClass: "text-sky-600", circleBgClass: "bg-sky-100 dark:bg-sky-500/20", isLoading: isLoadingData },
    { title: "Net", value: netValue, icon: BadgeDollarSign, iconColorClass: "text-emerald-600", circleBgClass: "bg-emerald-100 dark:bg-emerald-500/20", isLoading: isLoadingData },
    { title: "Invoice due", value: invoiceDue, icon: FileText, iconColorClass: "text-amber-600", circleBgClass: "bg-amber-100 dark:bg-amber-500/20", isLoading: isLoadingData },
    { title: "Total Sell Return", value: totalSellReturn, icon: Undo2, iconColorClass: "text-rose-600", circleBgClass: "bg-rose-100 dark:bg-rose-500/20", isLoading: isLoadingData },
    { title: "Total purchase", value: totalPurchase, icon: Download, iconColorClass: "text-sky-600", circleBgClass: "bg-sky-100 dark:bg-sky-500/20", isLoading: isLoadingData },
    { title: "Purchase due", value: purchaseDue, icon: AlertTriangle, iconColorClass: "text-amber-600", circleBgClass: "bg-amber-100 dark:bg-amber-500/20", isLoading: isLoadingData },
    { title: "Total Purchase Return", value: totalPurchaseReturn, icon: Redo2, iconColorClass: "text-rose-600", circleBgClass: "bg-rose-100 dark:bg-rose-500/20", isLoading: isLoadingData },
    { title: "Expense", value: expense, icon: Receipt, iconColorClass: "text-rose-600", circleBgClass: "bg-rose-100 dark:bg-rose-500/20", isLoading: isLoadingData },
  ];

  const summaryCardData = useMemo(() => {
    if (currentUser?.role === 'VENDOR') {
      return summaryCardDefinitions.filter(card => 
        card.title === "Total Sales" || card.title === "Invoice due" || card.title === "Net"
      );
    }
    return summaryCardDefinitions;
  }, [isLoadingData, totalSales, netValue, invoiceDue, totalSellReturn, totalPurchase, purchaseDue, totalPurchaseReturn, expense, currentUser, summaryCardDefinitions]);

  const selectedCrmName = useMemo(() => {
    if (selectedCrmId === 'all') return "All CRs";
    return allCrmUsers.find(u => u.id === selectedCrmId)?.name || "Select CR";
  }, [selectedCrmId, allCrmUsers]);


  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!currentUser && !isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    );
  }
  
  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const salesPayload = payload.find((p: any) => p.dataKey === 'sales');
      const ordersPayload = payload.find((p: any) => p.dataKey === 'orders');

      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {chartGranularity === 'hourly' ? 'Time' : 'Date'}
              </span>
              <span className="font-bold text-muted-foreground">
                {label ? (
                  chartGranularity === 'hourly' ? 
                  (() => {
                      const hour = parseInt(label); 
                      const nextHour = (hour + 1) % 24;
                      const formatHour = (h: number) => {
                          if (h === 0) return '12 AM';
                          if (h === 12) return '12 PM';
                          if (h < 12) return `${h} AM`;
                          return `${h - 12} PM`;
                      };
                      return `${formatHour(hour)} - ${formatHour(nextHour).replace(/\s(A|P)M/, '')}${nextHour === 0 ? ' AM' : ''}`;
                  })()
                  : format(parseISO(label), 'd MMM, yyyy')
                ) : 'N/A'}
              </span>
            </div>
            {salesPayload && (
              <div className="flex flex-col">
                 <span className="text-[0.70rem] uppercase text-muted-foreground" style={{ color: salesPayload.color }}>
                  Sales ({salesPayload.payload.orders || 0} orders)
                </span>
                <span
                  className="font-bold"
                  style={{ color: salesPayload.color }}
                >
                  {formatCurrency(salesPayload.value as number)}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const isLoadingContent = isLoadingData || !selectedDateRange;

  const canSelectCR = currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';
  
  const visibleProjectStatusDisplayConfig = useMemo(() => {
    if (isLoadingContent || !currentUser || !globalSettings?.projectStageAccess) {
        return [];
    }
    if (currentUser.role === 'SYSTEM_ADMIN' || currentUser.role === 'LR') {
        return ALL_PROJECT_STATUSES_CONFIG;
    }
    const userPermissions = globalSettings.projectStageAccess;
    return ALL_PROJECT_STATUSES_CONFIG.filter(column => 
        userPermissions[column.status as ProjectStatusType]?.includes(currentUser.role)
    );
  }, [currentUser, globalSettings, isLoadingContent]);


  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 custom-scrollbar-hidden">
      <div className="bg-gradient-to-r from-[hsl(var(--sidebar-background))] to-[hsl(var(--primary))] text-primary-foreground p-6 sm:p-8 rounded-xl shadow-xl">
        <h1 className="text-3xl sm:text-4xl font-bold flex items-center">
          Welcome {currentUser?.name.split(' ')[0] || 'User'}
          <Hand className="ml-2 h-8 w-8 transform rotate-[20deg] text-yellow-300" />
        </h1>
        <p className="text-md sm:text-lg text-primary-foreground/90 mt-1">
          Here's an overview of your business activity.
        </p>
      </div>

      {!isDesignerRepOrLr && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="shadow-sm bg-card">
              <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="h-5 w-5 mr-2 text-primary/80" />
                  <span>Select CR</span>
                </div>
                {canSelectCR ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs h-9 sm:h-10 truncate">
                          {selectedCrmName} <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-70" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                        <DropdownMenuLabel>Filter by CRM</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setSelectedCrmId('all')}>All CRs</DropdownMenuItem>
                        {allCrmUsers.map(crm => (
                            <DropdownMenuItem key={crm.id} onSelect={() => setSelectedCrmId(crm.id)}>
                            {crm.name}
                            </DropdownMenuItem>
                        ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Button variant="outline" size="sm" className="text-xs h-9 sm:h-10" disabled>
                        Your Data
                    </Button>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-sm bg-card">
              <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarDays className="h-5 w-5 mr-2 text-primary/80" />
                  <span>Filter by Date</span>
                </div>
                {selectedDateRange ? (
                  <DateRangePicker initialRange={selectedDateRange} onDateRangeChange={handleDateRangeChange} />
                ) : (
                  <Skeleton className="h-10 w-full sm:w-[260px]"/>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {summaryCardData.map((card) => (
              <SummaryCard
                key={card.title}
                title={card.title}
                value={card.value}
                icon={card.icon}
                iconColorClass={card.iconColorClass}
                circleBgClass={card.circleBgClass}
                isLoading={isLoadingContent}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="shadow-xl bg-card lg:col-span-3">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center text-xl text-foreground">
                  <BarChartBig className="mr-2 h-6 w-6 text-primary" />
                  Sales ({currentDateRangeLabel})
                  {currentUser?.role === 'CRM' && <span className="ml-2 text-sm font-normal text-muted-foreground">(Your Sales)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] sm:h-[350px] p-2 sm:p-4">
                {isLoadingContent ? ( 
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <RechartsLineChart
                      data={salesChartData}
                      margin={{
                        top: 5,
                        right: 20,
                        left: -10, 
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
                      <XAxis
                        dataKey="date" 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => {
                          if (chartGranularity === 'hourly') {
                            const hour = parseInt(value);
                            if (isNaN(hour)) return value; 
                            if (hour === 0) return '12 AM';
                            if (hour === 12) return '12 PM';
                            if (hour < 12) return `${hour} AM`;
                            return `${hour - 12} PM`;
                          }
                          try {
                            return format(parseISO(value), 'd MMM');
                          } catch (e) { return value; } 
                        }}
                        className="text-xs"
                        interval={chartGranularity === 'hourly' && salesChartData.length > 12 ? 'preserveStartEnd' : undefined} 
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => `৳${Number(value).toLocaleString('en-US', {minimumFractionDigits:0, maximumFractionDigits:0})}`}
                        className="text-xs"
                      />
                      <Tooltip
                        cursor={false}
                        content={<CustomTooltipContent />}
                      />
                      <RechartsLegend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: '10px'}} />
                      <Line
                        dataKey="sales"
                        type="monotone"
                        stroke="var(--color-sales)"
                        strokeWidth={2}
                        dot={{
                          r: 4,
                          fill: "var(--color-sales)",
                          strokeWidth: 2,
                          stroke: "hsl(var(--background))",
                        }}
                        activeDot={{
                           r: 6,
                           fill: "var(--color-sales)",
                           strokeWidth: 2,
                           stroke: "hsl(var(--background))",
                        }}
                      />
                    </RechartsLineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-xl bg-card lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl text-foreground">
                      <PieChartIcon className="mr-2 h-6 w-6 text-primary" />
                      Traffic Sources
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] p-4">
                  {isLoadingContent ? (
                    <div className="flex items-center justify-center h-full">
                      <Skeleton className="h-48 w-48 rounded-full" />
                    </div>
                  ) : trafficSourcesData.length > 0 ? (
                      <ChartContainer config={trafficSourcesChartConfig} className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                                <Pie data={trafficSourcesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                    {trafficSourcesData.map((entry) => (
                                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                            </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        No lead source data available.
                    </div>
                  )}
                </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="shadow-xl bg-card">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-foreground">
              <Briefcase className="mr-2 h-6 w-6 text-primary" />
              Project Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusTimeline
              counts={projectCounts}
              config={visibleProjectStatusDisplayConfig}
              isLoading={isLoadingContent}
              title="Project Status"
            />
          </CardContent>
        </Card>
        
        <Card className="shadow-xl bg-card">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-foreground">
              <Users className="mr-2 h-6 w-6 text-primary" />
              Pipeline Category Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusTimeline
              counts={leadCategoryCounts}
              config={ALL_LEAD_CATEGORIES_CONFIG}
              isLoading={isLoadingContent}
              title="Lead Category"
            />
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

// Generic Timeline Component
interface StatusTimelineProps {
  counts: Record<string, number>;
  config: { title: string; icon: React.ElementType; color: string; gradient: string; shadow: string; [key:string]: any }[];
  isLoading: boolean;
  title: string;
}

const StatusTimeline: React.FC<StatusTimelineProps> = ({ counts, config, isLoading, title }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (isLoading || config.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % config.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isLoading, config.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-between p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-1">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (config.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        No {title.toLowerCase()} stages are visible for your role.
      </div>
    );
  }

  const progressPercentage = activeIndex > 0 ? (activeIndex / (config.length - 1)) * 100 : 0;
  
  const getGradient = () => {
    if (activeIndex === 0) {
        return config[0]?.gradient || 'hsl(var(--primary))';
    }
    const colors = config.slice(0, activeIndex + 1).map(step => step.color);
    return `linear-gradient(to right, ${colors.join(', ')})`;
  };

  return (
    <div className="w-full overflow-x-auto py-4 custom-scrollbar-hidden">
      <div className="relative flex items-center justify-between min-w-max px-2">
        {/* The background line */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-muted rounded-full transform -translate-y-[calc(50%+1rem)]"></div>

        {/* The animated progress bar */}
        <div className="absolute top-1/2 left-0 h-1 rounded-full transform -translate-y-[calc(50%+1rem)]" style={{ width: '100%' }}>
            <motion.div
                className="h-full rounded-full"
                animate={{
                    width: `${progressPercentage}%`,
                    background: getGradient(),
                    boxShadow: config[activeIndex]?.shadow || 'none',
                }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
        </div>

        {config.map((step, index) => {
          const isActive = index === activeIndex;
          const key = step.status || step.category;
          return (
            <motion.div 
              key={key} 
              className="relative z-10 flex flex-col items-center flex-1 min-w-[90px]"
              animate={{ scale: isActive ? 1.1 : 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              {/* The colored circle */}
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg border-4 transition-all"
                style={{
                  backgroundColor: step.color,
                  borderColor: isActive ? step.color : 'hsl(var(--background))'
                }}
              >
                {counts[key as keyof typeof counts]}
              </div>
              {/* The label */}
              <p className="mt-2 text-xs font-medium text-center text-muted-foreground transition-colors" style={{ color: isActive ? step.color : 'hsl(var(--muted-foreground))'}}>
                {step.title}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

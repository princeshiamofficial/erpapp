

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; 
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format, isWithinInterval, parseISO, subDays, getHours, getYear, getMonth, startOfMonth, endOfMonth, differenceInDays, startOfYear, endOfYear, startOfDay, endOfDay, getDaysInMonth, isSameDay, addDays, subMonths } from "date-fns"; 
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
  User as UserIcon,
  BaggageClaim,
  MapPin, // For Top Sales Area
  Landmark, // For Payment Methods
  MessageSquare, // For Feedback
  Star, // For Feedback stars
  Trash2, // For delete icon
  ClipboardList,
  TrendingUp, // For Assets icon
  Target, // For Target icon
  LineChart as LineChartIcon
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
  Pie,
  PieChart as RechartsPieChart,
  Cell,
  Bar,
  BarChart as RechartsBarChart,
  LabelList,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import type { TrackingLink, OrderItem, ServiceModelItem, User, Project, ProjectStatusType, GlobalSettings, Lead, LeadCategory, UserRole, Feedback } from '@/types'; 
import { getOrders } from '@/lib/order-service';
import { getModels } from '@/lib/service-options-service'; 
import { useToast } from '@/hooks/use-toast';
import { getUsers } from '@/lib/user-service';
import { getProjects } from '@/lib/project-service';
import { getLeads } from '@/lib/lead-service';
import { getFeedback, deleteFeedbackAction } from '@/lib/feedback-service'; // Import getFeedback and deleteFeedbackAction
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"; // Added AlertDialog
import { getGlobalSettings } from '@/lib/settings-service';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { divisions } from '@/lib/district-data'; // Import divisions data
import type { DateRange, PredefinedRange } from "@/components/dashboard/date-range-picker";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TeamPerformanceGraph } from '@/components/dashboard/TeamPerformanceGraph';
import { getTaskEntries, type TaskEntry, getMonthlyTargetHistory, setMonthlyTargetHistory } from '@/lib/team-performance-service'; // Import new service
import { CANCELLED_STATUS_ID } from '@/lib/status-service'; // Import CANCELLED_STATUS_ID


// Lazy loading components
const DateRangePicker = dynamic(() => import('@/components/dashboard/date-range-picker').then(mod => mod.DateRangePicker), {
  ssr: false,
  loading: () => <Skeleton className="h-10 w-full sm:w-[260px]"/>
});

const SalesPerformanceClient = dynamic(() => import('@/components/leaderboard/SalesPerformanceClient').then(mod => mod.SalesPerformanceClient), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />
});

const OrderAnalysisClient = dynamic(() => import('@/components/dashboard/OrderAnalysisClient').then(mod => mod.OrderAnalysisClient), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />
});

const StatusTimeline = dynamic(() => import('./StatusTimeline').then(mod => mod.StatusTimeline), {
  ssr: false,
  loading: () => <Skeleton className="h-24 w-full" />
});


const chartConfig = {
  sales: {
    label: "Total Sales (BDT)",
    color: "hsl(var(--chart-1))",
  },
  orders: { // Added for CRM view
    label: "Sales",
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

const topSalesAreaChartConfig: ChartConfig = {
    sales: {
        label: "Sales",
        color: "hsl(var(--chart-1))",
    },
};

const paymentMethodsChartConfig: ChartConfig = {
  count: {
    label: "Count",
    color: "hsl(var(--chart-2))",
  },
};


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
  currentUser: User | null;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon: Icon, iconColorClass = "text-primary", circleBgClass = "bg-primary/10", isLoading, currentUser }) => {
  if (isLoading) {
    return (
      <Card className="bg-card p-4 shadow-md rounded-lg">
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
    <Card className="shadow-md hover:shadow-lg transition-shadow bg-card p-4 rounded-lg">
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-full ${circleBgClass}`}>
          <Icon className={`h-6 w-6 ${iconColorClass}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground font-mono">
            {currentUser?.role === 'SYSTEM_ADMIN' ? (
              <spoiler-span>{value}</spoiler-span>
            ) : (
              value
            )}
          </p>
        </div>
      </div>
    </Card>
  );
};


const ALL_PROJECT_STATUSES_CONFIG: Array<{ title: string; status: ProjectStatusType; icon: React.ElementType; color: string; gradient: string; shadow: string; }> = [
    { title: 'CR Clearance', status: 'CR Clearance', icon: ClipboardCheck, color: '#3b82f6', gradient: 'linear-gradient(to right, #3b82f6, #60a5fa)', shadow: '0 4px 15px 0 rgba(59, 130, 246, 0.4)' },
    { title: 'CO Clearance', status: 'CO Clearance', icon: ClipboardList, color: '#10b981', gradient: 'linear-gradient(to right, #10b981, #34d399)', shadow: '0 4px 15px 0 rgba(16, 185, 129, 0.4)' },
    { title: 'On Design', status: 'On Design', icon: DraftingCompass, color: '#8b5cf6', gradient: 'linear-gradient(to right, #8b5cf6, #a78bfa)', shadow: '0 4px 15px 0 rgba(139, 92, 246, 0.4)' },
    { title: 'On Hold', status: 'On Hold', icon: PauseCircle, color: '#f97316', gradient: 'linear-gradient(to right, #f97316, #fb923c)', shadow: '0 4px 15px 0 rgba(249, 115, 22, 0.4)' },
    { title: 'Logistics', status: 'Logistics', icon: Truck, color: '#78350f', gradient: 'linear-gradient(to right, #78350f, #a16207)', shadow: '0 4px 15px 0 rgba(120, 53, 15, 0.4)' },
    { title: 'Courier', status: 'Courier', icon: CheckCircle, color: '#16a34a', gradient: 'linear-gradient(to right, #16a34a, #4ade80)', shadow: '0 4px 15px 0 rgba(22, 163, 74, 0.4)' },
    { title: 'Delivered', status: 'Delivered', icon: PackageCheck, color: '#65a30d', gradient: 'linear-gradient(to right, #65a30d, #84cc16)', shadow: '0 4px 15px 0 rgba(101, 163, 13, 0.4)' },
    { title: 'Cancel', status: 'Cancel', icon: ClipboardX, color: '#ef4444', gradient: 'linear-gradient(to right, #ef4444, #f87171)', shadow: '0 4px 15px 0 rgba(239, 68, 68, 0.4)' },
];

const ALL_LEAD_CATEGORIES_CONFIG: Array<{ title: string; category: LeadCategory; icon: React.ElementType; color: string; gradient: string; shadow: string; }> = [
    { title: 'POP', category: 'POP', icon: UserIcon, color: '#0ea5e9', gradient: 'linear-gradient(to right, #0ea5e9, #38bdf8)', shadow: '0 4px 15px 0 rgba(14, 165, 233, 0.4)' },
    { title: 'POG', category: 'POG', icon: Users, color: '#1d4ed8', gradient: 'linear-gradient(to right, #1d4ed8, #3b82f6)', shadow: '0 4px 15px 0 rgba(29, 78, 216, 0.4)' },
    { title: 'OC', category: 'OC', icon: BaggageClaim, color: '#9333ea', gradient: 'linear-gradient(to right, #9333ea, #a855f7)', shadow: '0 4px 15px 0 rgba(147, 51, 234, 0.4)' },
    { title: 'OD', category: 'OD', icon: Briefcase, color: '#16a34a', gradient: 'linear-gradient(to right, #16a34a, #22c55e)', shadow: '0 4px 15px 0 rgba(22, 163, 74, 0.4)' },
    { title: 'ROD', category: 'ROD', icon: ShoppingCart, color: '#ea580c', gradient: 'linear-gradient(to right, #ea580c, #f97316)', shadow: '0 4px 15px 0 rgba(234, 88, 12, 0.4)' },
];

const queryClient = new QueryClient();

export default function DashboardPage() {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, isAuthLoading, router]);

  if (isAuthLoading || !isClient) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return null; // Redirect is handled by the useEffect above
  }
  
  if (currentUser.role === 'VENDOR') {
    return <div />; // Render a blank page for vendors
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names[names.length - 1] ? names[names.length - 1].charAt(0).toUpperCase() : '');
};


function DashboardContent() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const now = new Date();
    return {
        from: startOfMonth(now),
        to: endOfMonth(now),
    };
  });
  const [currentDateRangeLabel, setCurrentDateRangeLabel] = useState("This Month");
  const [selectedPredefinedValue, setSelectedPredefinedValue] = useState<PredefinedRange | "custom" | null>("thisMonth");
  const [chartGranularity, setChartGranularity] = useState<'daily' | 'hourly'>('daily');
  const [selectedCrmId, setSelectedCrmId] = useState<string>('all');
  const [feedbackToDelete, setFeedbackToDelete] = useState<Feedback | null>(null);
  const [isDeletingFeedback, setIsDeletingFeedback] = useState(false);

  
  const isDesignerRepOrLrOrCo = currentUser?.role === 'DESIGNER_REPRESENTATIVE' || currentUser?.role === 'LR' || currentUser?.role === 'CO';


  const fetchDashboardData = useCallback(async () => {
    if (!currentUser) {
      return null;
    }
    try {
      const [fetchedOrders, fetchedModels, fetchedUsers, fetchedProjects, fetchedSettings, fetchedLeads, fetchedTasks, fetchedFeedback] = await Promise.all([ 
        getOrders(), getModels(), getUsers(), getProjects(), getGlobalSettings(), getLeads(), getTaskEntries(), getFeedback(),
      ]);
      return { 
        allOrders: fetchedOrders, allModels: fetchedModels, allUsers: fetchedUsers, 
        allProjects: fetchedProjects, globalSettings: fetchedSettings, allLeads: fetchedLeads, allTasks: fetchedTasks, allFeedback: fetchedFeedback
      };
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast({ title: "Error", description: "Could not load dashboard data.", variant: "destructive" });
      throw new Error("Data fetch failed");
    }
  }, [currentUser, toast]);

  const { data: queryData, isLoading: isLoadingData, refetch } = useQuery({
    queryKey: ['dashboardData', currentUser?.id],
    queryFn: fetchDashboardData,
    enabled: !!currentUser,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true, 
    retry: 1, 
  });

  const { allOrders = [], allModels = [], allUsers = [], allProjects = [], globalSettings = null, allLeads = [], allTasks = [], allFeedback = [] } = queryData || {};
  const allCrmUsers = useMemo(() => allUsers.filter(u => u.role === 'CRM' && !u.isBanned), [allUsers]);

  const getDateRangeInterval = () => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) return null;
    const startDate = new Date(selectedDateRange.from);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedDateRange.to);
    endDate.setHours(23, 59, 59, 999);
    return { start: startDate, end: endDate };
  };

  const filteredOrders = useMemo(() => {
    const interval = getDateRangeInterval();
    if (!interval) return [];
    
    let ordersToFilter = allOrders.filter(order => 
      order.createdAt && isWithinInterval(parseISO(order.createdAt), interval)
    );
    
    if (currentUser?.role === 'CRM') {
      ordersToFilter = ordersToFilter.filter(order => order.crmUserId === currentUser.id);
    } else if (currentUser?.role === 'DESIGNER_REPRESENTATIVE') {
      ordersToFilter = ordersToFilter.filter(order => order.designerRepresentativeId === currentUser.id);
    } else if ((currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN') && selectedCrmId !== 'all') {
      ordersToFilter = ordersToFilter.filter(order => order.crmUserId === selectedCrmId);
    }
    
    return ordersToFilter;
  }, [allOrders, selectedDateRange, currentUser, selectedCrmId]);

  const filteredLeads = useMemo(() => {
      const interval = getDateRangeInterval();
      if (!interval) return [];
      
      let leadsToFilter = allLeads.filter(lead => lead.date && isWithinInterval(parseISO(lead.date), interval));
      
      if(currentUser?.role === 'CRM'){
          leadsToFilter = leadsToFilter.filter(l => l.crmId === currentUser.id);
      } else if ((currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN') && selectedCrmId !== 'all') {
          leadsToFilter = leadsToFilter.filter(l => l.crmId === selectedCrmId);
      }
      return leadsToFilter;
  }, [allLeads, selectedDateRange, currentUser, selectedCrmId]);

  const filteredProjects = useMemo(() => {
    const isDrLrOrCo = currentUser?.role === 'DESIGNER_REPRESENTATIVE' || currentUser?.role === 'LR' || currentUser?.role === 'CO';
    
    let projectsToFilter = allProjects;

    // First, filter by role
    if (currentUser?.role === 'CRM') {
        projectsToFilter = projectsToFilter.filter(p => p.assigneeId === currentUser.id);
    } else if (currentUser?.role === 'DESIGNER_REPRESENTATIVE') {
        projectsToFilter = projectsToFilter.filter(p => p.designerRepresentativeId === currentUser.id);
    } else if (currentUser?.role === 'LR') {
         projectsToFilter = projectsToFilter.filter(p => p.assigneeId === currentUser.id || p.status === 'Logistics' || p.status === 'Courier' || p.status === 'Delivered');
    } else if ((currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN') && selectedCrmId !== 'all') {
        projectsToFilter = projectsToFilter.filter(p => p.assigneeId === selectedCrmId);
    }
    
    // Then, apply date filter unless user is DR/LR/CO
    if (!isDrLrOrCo) {
      const interval = getDateRangeInterval();
      if (interval) {
        projectsToFilter = projectsToFilter.filter(project => 
            project.createdAt && isWithinInterval(parseISO(project.createdAt), interval)
        );
      } else {
        return []; // If no interval, return empty
      }
    }
    
    return projectsToFilter;
  }, [allProjects, selectedDateRange, currentUser, selectedCrmId]);


  const topSalesAreaData = useMemo(() => {
    const salesByDivision: Record<string, number> = {};
    const simplifyString = (str: string) => str.replace(/['’.,\s-]/g, '').toLowerCase();
    let totalSalesAllDivisions = 0;

    filteredOrders.forEach(order => {
        let longestMatch: { name: string; division: string; } | null = null;
        let longestMatchLength = 0;
        const simplifiedAddress = simplifyString(order.address);

        for (const div of divisions) {
            for (const dist of div.districts) {
                const namesToMatch = [dist.name, ...(dist.aliases || [])];
                for (const name of namesToMatch) {
                    const simplifiedDistName = simplifyString(name);
                    if (simplifiedDistName.length > 0 && simplifiedAddress.includes(simplifiedDistName)) {
                        if (simplifiedDistName.length > longestMatchLength) {
                            longestMatchLength = simplifiedDistName.length;
                            longestMatch = { name: dist.name, division: div.division };
                        }
                    }
                }
            }
        }
        
        const divisionName = longestMatch ? longestMatch.division : "Unknown";
        const orderTotal = (order.orderItems || []).reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
        salesByDivision[divisionName] = (salesByDivision[divisionName] || 0) + orderTotal;
        totalSalesAllDivisions += orderTotal;
    });
    
    if (totalSalesAllDivisions === 0) return [];

    return Object.entries(salesByDivision)
        .map(([name, sales]) => ({ 
            name, 
            sales,
            percentage: (sales / totalSalesAllDivisions) * 100
        }))
        .sort((a, b) => b.sales - a.sales);

  }, [filteredOrders]);
  
  const paymentMethodData = useMemo(() => {
    const interval = getDateRangeInterval();
    if (!interval) return [];

    const stats: Record<string, { count: number; amount: number }> = {};
    
    let ordersForPayments = allOrders;
    if (currentUser?.role === 'CRM') {
        ordersForPayments = allOrders.filter(order => order.crmUserId === currentUser.id);
    } else if ((currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN') && selectedCrmId !== 'all') {
        ordersForPayments = allOrders.filter(order => order.crmUserId === selectedCrmId);
    }

    ordersForPayments.forEach(order => {
      if (Array.isArray(order.advancePayments)) {
        order.advancePayments.forEach(payment => {
          if (payment.date && isWithinInterval(parseISO(payment.date), interval)) {
              if (payment.paymentMethod) {
                  let methodName = payment.paymentMethod;
                  if (methodName.toLowerCase() === 'system auto-settled' || methodName.toLowerCase() === 'courier') {
                      methodName = 'COD';
                  }
                  if (!stats[methodName]) {
                      stats[methodName] = { count: 0, amount: 0 };
                  }
                  stats[methodName].count += 1;
                  stats[methodName].amount += payment.amount;
              }
          }
        });
      }
    });

    const totalPaymentsCount = Object.values(stats).reduce((sum, { count }) => sum + count, 0);
    if (totalPaymentsCount === 0) return [];

    return Object.entries(stats)
      .map(([name, data]) => ({
          name,
          count: data.count,
          amount: data.amount,
          percentage: (data.count / totalPaymentsCount) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [allOrders, selectedDateRange, currentUser, selectedCrmId]);




  const trafficSourcesData = useMemo(() => {
    if (!filteredLeads.length) return [];
    const sourceCounts: Record<string, number> = {};
    filteredLeads.forEach(lead => {
      const source = lead.source || "Others";
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    const total = filteredLeads.length;
    if (total === 0) return [];

    return Object.entries(sourceCounts)
      .map(([name, value]) => ({
        name,
        value,
        fill: trafficSourcesChartConfig[name as keyof typeof trafficSourcesChartConfig]?.color || "hsl(var(--muted-foreground))"
      }))
      .sort((a,b) => b.value - a.value);
  }, [filteredLeads]);

  const projectCounts = useMemo(() => {
    const counts: Record<ProjectStatusType, number> = {
      'CR Clearance': 0, 'CO Clearance': 0, 'Cancel': 0, 'On Design': 0, 'On Hold': 0, 'Logistics': 0, 'Courier': 0, 'Delivered': 0,
    };
    
    let projectsToCount = filteredProjects;

    projectsToCount.forEach(p => {
        if(counts[p.status] !== undefined) {
            counts[p.status]++;
        }
    });
    return counts;
  }, [filteredProjects]);
  
  const leadCategoryCounts = useMemo(() => {
    const counts: Record<LeadCategory, number> = {
        'POP': 0, 'POG': 0, 'OC': 0, 'OD': 0, 'ROD': 0
    };
    let leadsToCount = filteredLeads;
    leadsToCount.forEach(l => {
        if(counts[l.category] !== undefined) {
            counts[l.category]++;
        }
    });
    return counts;
  }, [filteredLeads]);
  
  const { totalSales, invoiceDue, totalPurchase, netValue, salesChartData, deliveredCount, ordersWithDueCount, invoicePaid, invoiceCodPaid } = useMemo(() => {
    const interval = getDateRangeInterval();
    if (!interval) {
        return { totalSales: 0, invoiceDue: 0, totalPurchase: 0, netValue: 0, salesChartData: [], deliveredCount: '0', ordersWithDueCount: 0, invoicePaid: 0, invoiceCodPaid: 0 };
    }

    let currentTotalSales = 0;
    let currentTotalAdvance = 0;
    let currentTotalPurchaseValue = 0;
    let currentOrdersWithDueCount = 0;
    let currentInvoiceCodPaid = 0;

    let ordersForCalcs = allOrders;
    if (currentUser?.role === 'CRM') {
      ordersForCalcs = allOrders.filter(order => order.crmUserId === currentUser.id);
    } else if ((currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN') && selectedCrmId !== 'all') {
      ordersForCalcs = allOrders.filter(order => order.crmUserId === selectedCrmId);
    }

    // Filter out canceled orders before calculations
    ordersForCalcs = ordersForCalcs.filter(order => order.currentStatus !== CANCELLED_STATUS_ID);

    ordersForCalcs.forEach(order => {
        const orderCreatedAt = parseISO(order.createdAt);
        // Sales, Purchase, Due calculations based on orders *created* in the date range
        if (isWithinInterval(orderCreatedAt, interval)) {
            const orderTotal = (order.orderItems || []).reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0);
            const effectiveDiscount = order.specialClientDiscount || 0;
            const netPayable = orderTotal - effectiveDiscount;
            currentTotalSales += netPayable;

            if (Array.isArray(order.orderItems)) {
                order.orderItems.forEach((item: OrderItem) => {
                    const modelDetails = allModels.find(m => m.name === item.model);
                    if (modelDetails && typeof modelDetails.buyingPrice === 'number' && typeof item.quantity === 'number' && item.quantity > 0) {
                        currentTotalPurchaseValue += (modelDetails.buyingPrice * item.quantity);
                    }
                });
            }
            
            const orderAdvance = (order.advancePayments || []).reduce((sum, p) => sum + p.amount, 0);
            currentTotalAdvance += orderAdvance;
            const orderDue = netPayable - orderAdvance;

            if (orderDue > 0.01) {
                currentOrdersWithDueCount++;
            }
        }
        
        // COD calculation based on payments *made* in the date range
        if (Array.isArray(order.advancePayments)) {
            order.advancePayments.forEach(payment => {
                if (payment.date && isWithinInterval(parseISO(payment.date), interval)) {
                    const methodName = payment.paymentMethod?.toLowerCase() || '';
                    if (methodName === 'cod' || methodName === 'system auto-settled' || methodName === 'courier') {
                        currentInvoiceCodPaid += payment.amount;
                    }
                }
            });
        }
    });
    
    const currentInvoiceDue = currentTotalSales - currentTotalAdvance;
    const currentInvoicePaid = currentTotalSales - currentInvoiceDue;

    let currentDeliveredCount = 0;
    let ordersForDeliveryCount = allOrders; // Start with all orders
    if (currentUser?.role === 'CRM') {
        ordersForDeliveryCount = allOrders.filter(order => order.crmUserId === currentUser.id);
    } else if (currentUser?.role === 'DESIGNER_REPRESENTATIVE') {
      ordersForDeliveryCount = allOrders.filter(order => order.designerRepresentativeId === currentUser.id);
    } else if ((currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN') && selectedCrmId !== 'all') {
        ordersForDeliveryCount = allOrders.filter(order => order.crmUserId === selectedCrmId);
    }
    
    const deliveredStatusId = globalSettings?.crmCompletionStatusIds?.find(id => id === 'delivered') || 'delivered';
    
    currentDeliveredCount = ordersForDeliveryCount.filter(order => 
        (order.statusHistory || []).some(log => {
            if (log.status !== deliveredStatusId) return false;
            try {
                return isWithinInterval(parseISO(log.timestamp), interval);
            } catch (e) {
                return false;
            }
        })
    ).length;

    let chartData: Array<{ date: string; sales: number; orders: number; }> = [];
    if (selectedPredefinedValue === 'today' || selectedPredefinedValue === 'yesterday') {
      const hourlyData = new Map<number, { sales: number; orders: number }>();
      for (let i = 0; i < 24; i++) hourlyData.set(i, { sales: 0, orders: 0 }); 
      
      filteredOrders.forEach(order => {
        if (order.createdAt) {
          try {
            const hour = getHours(parseISO(order.createdAt));
            const orderTotalForChart = (order.orderItems || []).reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0) - (order.specialClientDiscount || 0);
            const existing = hourlyData.get(hour) || { sales: 0, orders: 0 };
            hourlyData.set(hour, { sales: existing.sales + orderTotalForChart, orders: existing.orders + 1 });
          } catch (e) { /* ignore */ }
        }
      });
      chartData = Array.from(hourlyData.entries())
        .map(([hour, data]) => ({ date: hour.toString(), sales: data.sales, orders: data.orders })) 
        .sort((a, b) => parseInt(a.date) - parseInt(b.date));
    } else if (selectedDateRange?.from && selectedDateRange?.to) {
      const dailyData = new Map<string, { sales: number; orders: number }>();
      let tempDate = new Date(selectedDateRange.from);
      while (tempDate <= selectedDateRange.to) {
          dailyData.set(format(tempDate, 'yyyy-MM-dd'), { sales: 0, orders: 0 });
          tempDate = addDays(tempDate, 1);
      }
      
      filteredOrders.forEach(order => {
        if (order.createdAt) {
          try {
            const orderDateStr = format(parseISO(order.createdAt), 'yyyy-MM-dd');
            if (dailyData.has(orderDateStr)) {
              const orderTotalForChart = (order.orderItems || []).reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0) - (order.specialClientDiscount || 0);
              const existing = dailyData.get(orderDateStr) || { sales: 0, orders: 0 };
              dailyData.set(orderDateStr, { sales: existing.sales + orderTotalForChart, orders: existing.orders + 1 });
            }
          } catch (e) { /* ignore */ }
        }
      });
      chartData = Array.from(dailyData.entries())
        .map(([date, data]) => ({ date, sales: data.sales, orders: data.orders }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return {
      totalSales: currentTotalSales,
      invoiceDue: currentInvoiceDue,
      totalPurchase: currentTotalPurchaseValue,
      netValue: currentTotalSales - currentTotalPurchaseValue,
      salesChartData: chartData,
      deliveredCount: currentDeliveredCount.toString(),
      ordersWithDueCount: currentOrdersWithDueCount,
      invoicePaid: currentInvoicePaid,
      invoiceCodPaid: currentInvoiceCodPaid,
    };
  }, [filteredOrders, allOrders, allModels, selectedDateRange, selectedPredefinedValue, globalSettings, currentUser, selectedCrmId]);
  
  const [teamPerformanceDateRange, setTeamPerformanceDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: startOfMonth(now),
      to: endOfMonth(now),
    };
  });
  const [selectedTeam, setSelectedTeam] = useState<UserRole | 'all'>('all');
  const [specificUserId, setSpecificUserId] = useState<string | 'all'>('all'); // New state for specific user filter
  
  const isAdminView = useMemo(() => {
    if (!currentUser) return false;
    return ['SYSTEM_ADMIN', 'ADMIN'].includes(currentUser.role);
  }, [currentUser]);

  const specificUserOptions = useMemo(() => {
    return allUsers.filter(u => u.role === 'CRM' || u.role === 'DESIGNER_REPRESENTATIVE');
  }, [allUsers]);
  
  const { teamPerformanceData, totalPerformanceTarget } = useMemo(() => {
    if (!teamPerformanceDateRange?.from || !globalSettings?.roleBasedTargets) {
      return { teamPerformanceData: [], totalPerformanceTarget: 0 };
    }
  
    const startDate = startOfDay(teamPerformanceDateRange.from);
    const endDate = endOfDay(teamPerformanceDateRange.to || teamPerformanceDateRange.from);
    const roleBasedTargets = globalSettings.roleBasedTargets;
  
    let usersToInclude = allUsers;
    if (isAdminView) {
      if (specificUserId !== 'all') {
        usersToInclude = allUsers.filter(u => u.id === specificUserId);
      } else if (selectedTeam !== 'all') {
        usersToInclude = allUsers.filter(u => u.role === selectedTeam);
      }
    } else if (currentUser) {
      usersToInclude = allUsers.filter(u => u.role === currentUser.role);
    }
  
    const numDaysInRange = differenceInDays(endDate, startDate) + 1;
    const currentMonthStartDate = startOfMonth(startDate);
    const previousMonthStartDate = subMonths(currentMonthStartDate, 1);
    const previousMonthEndDate = endOfMonth(previousMonthStartDate);
  
    // Calculate previous month's total sales
    const previousMonthSales = allTasks.filter(task => {
      const taskDate = parseISO(task.date);
      return isWithinInterval(taskDate, { start: previousMonthStartDate, end: previousMonthEndDate });
    }).reduce((sum, task) => sum + task.taskCount, 0);
  
    // New target is previous month's sales + 10
    const dynamicTarget = previousMonthSales + 10;
  
    let totalTarget = 0;
  
    if (isAdminView) {
      if (specificUserId !== 'all') {
        const user = usersToInclude[0];
        if (user) {
          const monthlyTarget = roleBasedTargets[user.role as keyof typeof roleBasedTargets] || 0;
          totalTarget = (monthlyTarget / getDaysInMonth(startDate)) * numDaysInRange;
        }
      } else if (selectedTeam === 'all') {
        totalTarget = (allUsers.filter(u => u.role === 'CRM').length * roleBasedTargets.CRM) + 
                      (allUsers.filter(u => u.role === 'DESIGNER_REPRESENTATIVE').length * roleBasedTargets.DESIGNER_REPRESENTATIVE) +
                      roleBasedTargets.LR;
      } else if (selectedTeam === 'LR') {
        totalTarget = roleBasedTargets.LR;
      } else {
        totalTarget = usersToInclude.length * (roleBasedTargets[selectedTeam as keyof typeof roleBasedTargets] || 0);
      }
    } else if (currentUser) {
      if (currentUser.role === 'LR') {
        totalTarget = roleBasedTargets.LR;
      } else {
        totalTarget = roleBasedTargets[currentUser.role as keyof typeof roleBasedTargets] || 0;
      }
    }
  
    const monthlyTotalTarget = totalTarget;
    totalTarget = Math.round((monthlyTotalTarget / getDaysInMonth(startDate)) * numDaysInRange);
  
    const dateMap = new Map<string, { totalDone: number; totalLikelihood: number; userData: { [userId: string]: { done: number; likelihood: number; role: UserRole } } }>();
  
    let currentDate = startDate;
    while (currentDate <= endDate) {
      dateMap.set(format(currentDate, 'd MMM'), { totalDone: 0, totalLikelihood: 0, userData: {} });
      currentDate = addDays(currentDate, 1);
    }
  
    allTasks.forEach(entry => {
      try {
        const entryDate = parseISO(entry.date);
        if (isWithinInterval(entryDate, { start: startDate, end: endDate }) && usersToInclude.some(u => u.id === entry.userId)) {
          const dateKey = format(entryDate, 'd MMM');
          const dayData = dateMap.get(dateKey);
          if (dayData) {
            dayData.totalDone += entry.taskCount;
            dayData.totalLikelihood += entry.likelihood || 0;
            if (!dayData.userData[entry.userId]) {
              dayData.userData[entry.userId] = { done: 0, likelihood: 0, role: entry.role };
            }
            dayData.userData[entry.userId].done += entry.taskCount;
            dayData.userData[entry.userId].likelihood += entry.likelihood || 0;
          }
        }
      } catch (e) { /* ignore invalid dates */ }
    });
  
    const finalData = Array.from(dateMap.entries()).map(([date, data]) => ({
      name: date,
      ...data,
      totalTarget: Math.round(dynamicTarget / numDaysInRange), // Distribute target evenly for graph
    }));
  
    return { teamPerformanceData: finalData, totalPerformanceTarget: Math.round(dynamicTarget * numDaysInRange / getDaysInMonth(startDate)) };
  
  }, [allTasks, allUsers, teamPerformanceDateRange, globalSettings, selectedTeam, specificUserId, currentUser, isAdminView]);


  useEffect(() => {
    if (selectedPredefinedValue === 'today' || selectedPredefinedValue === 'yesterday') {
      setChartGranularity('hourly');
    } else {
      setChartGranularity('daily');
    }
  }, [selectedPredefinedValue]);

  const handleDateRangeChange = (range: DateRange | undefined, label: string, predefined: PredefinedRange | "custom" | null) => {
    setSelectedDateRange(range);
    setCurrentDateRangeLabel(label);
    setSelectedPredefinedValue(predefined);
  };
  
  const handleTeamPerformanceDateRangeChange = (range: DateRange | undefined, label: string, predefined: PredefinedRange | "custom" | null) => {
    setTeamPerformanceDateRange(range);
  };
  
  const handleTeamChange = (team: UserRole | 'all') => {
    setSelectedTeam(team);
    setSpecificUserId('all'); // Reset specific user when team changes
  };

  const handleSpecificUserChange = (userId: string) => {
    setSpecificUserId(userId);
    if(userId !== 'all') {
        const user = allUsers.find(u => u.id === userId);
        if (user) {
            setSelectedTeam(user.role);
        }
    } else {
        setSelectedTeam('all');
    }
  }

  const isCrm = useMemo(() => currentUser?.role === 'CRM', [currentUser]);

  const summaryCardDefinitions = useMemo(() => {
    return [
      { title: isCrm ? "Sales" : "Total Sales", value: isCrm ? filteredOrders.length.toString() : formatCurrency(totalSales), icon: ShoppingCart, iconColorClass: "text-sky-600", circleBgClass: "bg-sky-100 dark:bg-sky-500/20", isLoading: isLoadingData, currentUser },
      { title: "Invoice due", value: isCrm ? ordersWithDueCount.toString() : formatCurrency(invoiceDue), icon: FileText, iconColorClass: "text-amber-600", circleBgClass: "bg-amber-100 dark:bg-amber-500/20", isLoading: isLoadingData, currentUser },
      { title: "Advance Paid", value: formatCurrency(invoicePaid), icon: Receipt, iconColorClass: "text-teal-600", circleBgClass: "bg-teal-100 dark:bg-teal-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser },
      { title: "Invoice COD Paid", value: formatCurrency(invoiceCodPaid), icon: Truck, iconColorClass: "text-cyan-600", circleBgClass: "bg-cyan-100 dark:bg-cyan-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser },
      { title: "Delivered", value: deliveredCount, icon: PackageCheck, iconColorClass: "text-green-600", circleBgClass: "bg-green-100 dark:bg-green-500/20", isLoading: isLoadingData, roles: ['CRM', 'DESIGNER_REPRESENTATIVE'], currentUser },
      { title: "Net", value: formatCurrency(netValue), icon: BadgeDollarSign, iconColorClass: "text-emerald-600", circleBgClass: "bg-emerald-100 dark:bg-emerald-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser },
      { title: "Total Sell Return", value: formatCurrency(0), icon: Undo2, iconColorClass: "text-rose-600", circleBgClass: "bg-rose-100 dark:bg-rose-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser },
      { title: "Total purchase", value: formatCurrency(totalPurchase), icon: Download, iconColorClass: "text-sky-600", circleBgClass: "bg-sky-100 dark:bg-sky-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser },
      { title: "Purchase due", value: formatCurrency(0), icon: AlertTriangle, iconColorClass: "text-amber-600", circleBgClass: "bg-amber-100 dark:bg-amber-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser },
      { title: "Total Purchase Return", value: formatCurrency(0), icon: Redo2, iconColorClass: "text-rose-600", circleBgClass: "bg-rose-100 dark:bg-rose-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser },
      { title: "Expense", value: formatCurrency(0), icon: Receipt, iconColorClass: "text-rose-600", circleBgClass: "bg-rose-100 dark:bg-rose-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser },
    ];
  }, [isCrm, filteredOrders.length, totalSales, ordersWithDueCount, invoiceDue, invoicePaid, invoiceCodPaid, deliveredCount, netValue, totalPurchase, isLoadingData, currentUser]);

  const summaryCardData = useMemo(() => {
    return summaryCardDefinitions.filter(card => {
        if (currentUser?.role === 'ADMIN') return false; // Hide for ADMIN role
        if (!card.roles) return true;
        return card.roles.includes(currentUser?.role || '');
    });
  }, [currentUser, summaryCardDefinitions]);

  const selectedCrmName = useMemo(() => {
    if (selectedCrmId === 'all') return "All CRs";
    return allCrmUsers.find(u => u.id === selectedCrmId)?.name || "Select CR";
  }, [selectedCrmId, allCrmUsers]);

  const chartDataKey = currentUser?.role === 'CRM' ? 'orders' : 'sales';
  
  const canSeeAdminCharts = useMemo(() => {
    if (!currentUser) return false;
    return ['SYSTEM_ADMIN', 'ADMIN'].includes(currentUser.role);
  }, [currentUser]);

  const canSeeSystemAdminCharts = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.role === 'SYSTEM_ADMIN';
  }, [currentUser]);


  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPayload = payload.find((p: any) => p.dataKey === chartDataKey);

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
                      const hour = parseInt(value); 
                      if (isNaN(hour)) return value; 
                      if (hour === 0) return '12 AM';
                      if (hour === 12) return '12 PM';
                      if (hour < 12) return `${hour} AM`;
                      return `${hour - 12} PM`;
                  })()
                  : format(parseISO(label), 'd MMM, yyyy')
                ) : 'N/A'}
              </span>
            </div>
            {dataPayload && (
              <div className="flex flex-col">
                 <span className="text-[0.70rem] uppercase text-muted-foreground" style={{ color: dataPayload.color }}>
                  {currentUser?.role === 'CRM' ? `Sales: ${dataPayload.payload.orders}` : `Sales (${dataPayload.payload.orders} orders)`}
                </span>
                <span
                  className="font-bold"
                  style={{ color: dataPayload.color }}
                >
                  {currentUser?.role === 'CRM' ? dataPayload.value : formatCurrency(dataPayload.value as number)}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const isLoadingContent = isLoadingData || !selectedDateRange || !globalSettings;

  const canSelectCR = currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';
  
  const visibleProjectStatusDisplayConfig = useMemo(() => {
    if (isLoadingContent || !currentUser || !globalSettings?.projectStageAccess) {
        return [];
    }
    // If user is System Admin, show all configured stages
    if (currentUser.role === 'SYSTEM_ADMIN') {
        return ALL_PROJECT_STATUSES_CONFIG;
    }
    // For all other roles, filter based on their permissions
    const userPermissions = globalSettings.projectStageAccess;
    return ALL_PROJECT_STATUSES_CONFIG.filter(column => 
        userPermissions[column.status as ProjectStatusType]?.includes(currentUser.role)
    );
  }, [currentUser, globalSettings, isLoadingContent]);

  const salesPerformanceOrders = useMemo(() => {
    if (currentUser?.role === 'CRM') {
      return allOrders.filter(order => order.crmUserId === currentUser.id);
    }
    if ((currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN') && selectedCrmId !== 'all') {
      return allOrders.filter(order => order.crmUserId === selectedCrmId);
    }
    return allOrders;
  }, [allOrders, currentUser, selectedCrmId]);
  
  const recentFeedback = useMemo(() => {
    if (!allFeedback || !currentUser) return [];

    let filteredByRole = allFeedback;
    if (currentUser.role === 'CRM') {
      filteredByRole = allFeedback.filter(feedback => feedback.crmUserId === currentUser.id);
    } else if (currentUser.role === 'DESIGNER_REPRESENTATIVE') {
      filteredByRole = allFeedback.filter(feedback => feedback.designerRepresentativeId === currentUser.id);
    }

    return filteredByRole
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 5);
  }, [allFeedback, currentUser]);
  
  const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);
  
  const renderFeedbackText = (text: string) => {
    try {
        const feedbackJson = JSON.parse(text);
        const role = currentUser?.role;

        const fieldsToShow: string[] = [];

        if (role === 'CRM') {
            fieldsToShow.push('Customer Service', 'ওপেন ফিডব্যাক');
        } else if (role === 'LR') {
            fieldsToShow.push('Printing Quality', 'Product Quality', 'ওপেন ফিডব্যাক');
        } else if (role === 'DESIGNER_REPRESENTATIVE') {
            fieldsToShow.push('Design Satisfaction', 'ওপেন ফিডব্যাক');
        } else {
            // Admins/System Admins see the raw text
            return `"${text}"`;
        }
        
        const filteredFeedback = Object.entries(feedbackJson)
            .filter(([key]) => fieldsToShow.some(field => key.includes(field)))
            .map(([key, value]) => `${key}: ${value}`)
            .join(' | ');

        return filteredFeedback ? `"${filteredFeedback}"` : <span className="italic text-muted-foreground">No relevant feedback for your role.</span>;

    } catch (e) {
        // Fallback for non-JSON or malformed JSON text
        return `"${text}"`;
    }
  };

  const handleDeleteFeedback = async () => {
    if (!feedbackToDelete) return;
    setIsDeletingFeedback(true);
    const result = await deleteFeedbackAction(feedbackToDelete.id);
    if (result.success) {
      toast({ title: "Feedback Deleted", description: "The feedback entry has been removed." });
      refetch();
    } else {
      toast({ title: "Error", description: result.error || "Could not delete feedback.", variant: "destructive" });
    }
    setIsDeletingFeedback(false);
    setFeedbackToDelete(null);
  };

  const canDeleteFeedback = useMemo(() => {
    if (!currentUser) return false;
    return ['SYSTEM_ADMIN', 'ADMIN'].includes(currentUser.role);
  }, [currentUser]);


  return (
    <>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 custom-scrollbar-hidden print:p-0">
        <div className="bg-gradient-to-r from-[hsl(var(--sidebar-background))] to-[hsl(var(--primary))] text-primary-foreground p-6 sm:p-8 rounded-xl shadow-xl print:hidden">
          <h1 className="text-3xl sm:text-4xl font-bold flex items-center">
            Welcome {currentUser?.name.split(' ')[0] || 'User'}
            <Hand className="ml-2 h-8 w-8 transform rotate-[20deg] text-yellow-300" />
          </h1>
          <p className="text-md sm:text-lg text-primary-foreground/90 mt-1">
            Here's an overview of your business activity.
          </p>
        </div>

        {!isDesignerRepOrLrOrCo && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print:hidden">
              <Card className="shadow-sm bg-card rounded-lg">
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
              <Card className="shadow-sm bg-card rounded-lg">
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
            
            {currentUser?.role !== 'ADMIN' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 print:hidden">
                {summaryCardData.map((card) => (
                  <SummaryCard
                    key={card.title}
                    title={card.title}
                    value={card.value}
                    icon={card.icon}
                    iconColorClass={card.iconColorClass}
                    circleBgClass={card.circleBgClass}
                    isLoading={isLoadingContent}
                    currentUser={currentUser}
                  />
                ))}
              </div>
            )}


            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 print:hidden">
              <Card className="shadow-xl bg-card lg:col-span-3 rounded-lg">
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
                          tickFormatter={(value) => currentUser?.role === 'CRM' ? value : `৳${Number(value).toLocaleString('en-US', {minimumFractionDigits:0, maximumFractionDigits:0})}`}
                          className="text-xs"
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<CustomTooltipContent />}
                        />
                        <RechartsLegend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{padding: '10px'}} />
                        <Line
                          dataKey={chartDataKey}
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

              <div className="lg:col-span-2 grid grid-cols-1 gap-6">
                  <Card className="shadow-xl bg-card rounded-lg">
                      <CardHeader>
                      <CardTitle className="flex items-center text-xl text-foreground">
                          <PieChartIcon className="mr-2 h-6 w-6 text-primary" />
                          Traffic Sources
                      </CardTitle>
                      </CardHeader>
                      <CardContent className="h-[250px] p-4">
                      {isLoadingContent ? (
                          <div className="flex items-center justify-center h-full">
                          <Skeleton className="h-40 w-40 rounded-full" />
                          </div>
                      ) : trafficSourcesData.length > 0 ? (
                          <ChartContainer config={trafficSourcesChartConfig} className="w-full h-full">
                              <ResponsiveContainer width="100%" height="100%">
                                  <RechartsPieChart>
                                      <ChartTooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                                      <Pie data={trafficSourcesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                          {trafficSourcesData.map((entry) => (
                                              <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                          ))}
                                      </Pie>
                                      <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                                  </RechartsPieChart>
                              </ResponsiveContainer>
                          </ChartContainer>
                      ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                              No lead source data available.
                          </div>
                      )}
                      </CardContent>
                  </Card>
                  {canSeeAdminCharts && (
                    <Card className="shadow-xl bg-card rounded-lg">
                        <CardHeader>
                        <CardTitle className="flex items-center text-xl text-foreground">
                            <Landmark className="mr-2 h-6 w-6 text-primary" />
                            Payment Analysis
                        </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px] p-4">
                        {isLoadingContent ? (
                            <Skeleton className="h-[200px] w-full" />
                          ) : paymentMethodData.length > 0 ? (
                            <ChartContainer config={paymentMethodsChartConfig} className="w-full h-full">
                                <RechartsBarChart data={paymentMethodData} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} stroke="hsl(var(--border))" axisLine={false} tickLine={false} />
                                  <XAxis type="number" hide />
                                  <ChartTooltip
                                    cursor={{ fill: 'hsl(var(--muted))' }}
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        return (
                                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                                            <div className="grid grid-cols-1 gap-1.5">
                                              <span className="text-sm font-bold text-foreground">{payload[0].payload.name}</span>
                                              <span className="text-xs text-muted-foreground">Amount: {formatCurrency(payload[0].payload.amount)}</span>
                                            </div>
                                          </div>
                                        )
                                      }
                                      return null;
                                    }}
                                  />
                                  <Bar dataKey="percentage" fill="var(--color-count)" radius={[0, 4, 4, 0]} barSize={20}>
                                      <LabelList 
                                          dataKey="percentage" 
                                          position="right" 
                                          offset={8} 
                                          className="fill-foreground text-xs font-medium"
                                          formatter={(value: number) => `${value.toFixed(1)}%`}
                                      />
                                  </Bar>
                                </RechartsBarChart>
                            </ChartContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No payment data for this period.
                            </div>
                          )}
                        </CardContent>
                    </Card>
                  )}
              </div>
            </div>
          </>
        )}
        
        <div className={cn("grid grid-cols-1 gap-6", (isDesignerRepOrLrOrCo) ? "lg:grid-cols-1" : "")}>
          <div className="lg:col-span-1">
            <TeamPerformanceGraph
              allTasks={allTasks}
              monthlyTargetData={teamPerformanceData}
              totalPerformanceTarget={totalPerformanceTarget}
              onDateRangeChange={handleTeamPerformanceDateRangeChange}
              selectedDateRange={teamPerformanceDateRange}
              userMap={new Map(allUsers.map(u => [u.id, u]))}
              globalSettings={globalSettings}
              onTeamChange={handleTeamChange}
              onSpecificUserChange={handleSpecificUserChange}
              selectedTeam={selectedTeam}
              specificUserId={specificUserId}
              isAdminView={isAdminView}
              refetchData={refetch}
              allUsers={allUsers}
              specificUserOptions={specificUserOptions}
            />
          </div>
          
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 print:hidden">
          {canSeeSystemAdminCharts && (
            <SalesPerformanceClient
              allOrders={salesPerformanceOrders}
              allCrmUsers={allCrmUsers}
            />
          )}
          {canSeeAdminCharts && (
            <OrderAnalysisClient allOrders={allOrders} />
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 mt-6 print:hidden lg:grid-cols-2">
           {!isDesignerRepOrLrOrCo && (
              <Card className="shadow-xl bg-card rounded-lg">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl text-foreground">
                    <MessageSquare className="mr-2 h-6 w-6 text-primary" />
                    Recent Feedback
                  </CardTitle>
                  <CardDescription>Latest client feedback from tracking pages.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingContent ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                    </div>
                  ) : recentFeedback.length > 0 ? (
                    <ScrollArea className="h-[400px] pr-3">
                      <div className="space-y-4">
                        {recentFeedback.map(feedback => {
                          const crmUser = userMap.get(feedback.crmUserId || '');
                          return (
                              <div key={feedback.id} className="p-4 border rounded-lg bg-secondary/30" onDoubleClick={canDeleteFeedback ? () => setFeedbackToDelete(feedback) : undefined}>
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                                      <AvatarImage src={crmUser?.avatarUrl || undefined} alt={crmUser?.name} />
                                      <AvatarFallback>{getInitials(crmUser?.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-foreground">{feedback.companyName}</p>
                                        <p className="text-xs text-muted-foreground">Order ID: {feedback.orderId}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-amber-500">
                                      {[...Array(5)].map((_, i) => (
                                          <Star
                                          key={i}
                                          className={cn("h-4 w-4", i < feedback.rating ? "fill-amber-400 text-amber-400" : "fill-muted stroke-muted-foreground")}
                                          />
                                      ))}
                                  </div>
                                </div>
                                <p className="text-sm text-foreground/90 mt-3 italic border-l-2 border-primary pl-3">
                                    {renderFeedbackText(feedback.text)}
                                </p>
                                <p className="text-xs text-right text-muted-foreground mt-2">
                                    - Submitted {format(parseISO(feedback.submittedAt), "d MMM, yyyy")}
                                </p>
                              </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
                        <MessageSquare className="h-16 w-16 opacity-30 mb-4" />
                        <p className="font-medium">No feedback has been submitted yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
           )}
           {canSeeSystemAdminCharts && (
              <Card className="shadow-xl bg-card rounded-lg min-h-[480px]">
                  <CardHeader>
                      <CardTitle className="flex items-center text-xl text-foreground">
                          <LineChartIcon className="mr-2 h-6 w-6 text-primary" />
                          Sales KPI
                      </CardTitle>
                      <CardDescription>Key Performance Indicators for sales activity.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {/* Content for the new card will go here */}
                  </CardContent>
              </Card>
           )}
            {(isDesignerRepOrLrOrCo) && ( <div className="lg:col-span-1"></div>)}
        </div>
        
        {!isDesignerRepOrLrOrCo && (
          <div className={cn("grid grid-cols-1 gap-6 mt-6 print:hidden", currentUser?.role !== 'DESIGNER_REPRESENTATIVE' && currentUser?.role !== 'VENDOR' && currentUser?.role !== 'LR' ? 'xl:grid-cols-2' : 'xl:grid-cols-1')}>
            
            <Card className="shadow-xl bg-card rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-xl text-foreground">
                  <Briefcase className="mr-2 h-6 w-6 text-primary" />
                  Project Overview
                </CardTitle>
                <CardDescription>Project distribution by status for the selected period.</CardDescription>
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
            
            {currentUser?.role !== 'DESIGNER_REPRESENTATIVE' && currentUser?.role !== 'VENDOR' && currentUser?.role !== 'LR' && (
              <Card className="shadow-xl bg-card rounded-lg">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl text-foreground">
                    <Users className="mr-2 h-6 w-6 text-primary" />
                    Pipeline Overview
                  </CardTitle>
                  <CardDescription>Lead distribution by category for the selected period.</CardDescription>
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
            )}
          </div>
        )}

      </div>
      
      {feedbackToDelete && (
          <AlertDialog open={!!feedbackToDelete} onOpenChange={() => setFeedbackToDelete(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-6 w-6 text-destructive" />
                          Delete Feedback?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                          Are you sure you want to permanently delete the feedback for order <span className="font-semibold">{feedbackToDelete.orderId}</span>? This action cannot be undone.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setFeedbackToDelete(null)} disabled={isDeletingFeedback}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteFeedback} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeletingFeedback}>
                          {isDeletingFeedback ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Deleting...</> : "Delete"}
                      </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      )}

    </>
  );
}

const DoneTargetTooltipContent = ({ active, payload, label, userMap, currentUser }: any) => {
    if (active && payload && payload.length) {
        const donePayload = payload.find((p: any) => p.dataKey === 'totalDone');
        const targetPayload = payload.find((p: any) => p.dataKey === 'totalTarget');
        const likelihoodPayload = payload.find((p: any) => p.dataKey === 'totalLikelihood');
        const userData = donePayload?.payload?.userData || {};

        let userBreakdown: { user: UserType, done: number, likelihood: number }[] = [];

        if (currentUser) {
            if (currentUser.role === 'SYSTEM_ADMIN' || currentUser.role === 'ADMIN') {
                userBreakdown = Object.entries(userData)
                    .map(([userId, data]: [string, any]) => ({ user: userMap.get(userId), done: data.done, likelihood: data.likelihood }))
                    .filter(item => item.user && (item.done >= 0 || item.likelihood >= 0))
                    .sort((a,b) => b.done - a.done) as { user: UserType, done: number, likelihood: number }[];
            } else {
                 userBreakdown = Object.entries(userData)
                    .filter(([userId, data]: [string, any]) => data.role === currentUser.role && (data.done >= 0 || data.likelihood >= 0))
                    .map(([userId, data]: [string, any]) => ({ user: userMap.get(userId), done: data.done, likelihood: data.likelihood }))
                    .filter(item => item.user)
                    .sort((a,b) => b.done - a.done) as { user: UserType, done: number, likelihood: number }[];
            }
        }

        return (
            <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[220px]">
                <div className="grid grid-cols-1 gap-1.5">
                    <p className="font-semibold text-foreground">{label}</p>
                     {donePayload && <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: donePayload.color}}></div>
                        <span className="text-sm text-muted-foreground">Tasks Done:</span>
                        <span className="text-sm font-medium ml-auto">{donePayload.value}</span>
                    </div>}
                     {targetPayload && <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: targetPayload.color}}></div>
                        <span className="text-sm text-muted-foreground">Target:</span>
                        <span className="text-sm font-medium ml-auto">{targetPayload.value}</span>
                    </div>}
                    {likelihoodPayload && likelihoodPayload.value > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: likelihoodPayload.color}}></div>
                            <span className="text-sm text-muted-foreground">Assets:</span>
                            <span className="text-sm font-medium ml-auto">{likelihoodPayload.value}</span>
                        </div>
                    )}
                </div>
                 {userBreakdown.length > 0 && (
                    <>
                        <div className="border-t border-dashed my-1.5"></div>
                        <p className="font-semibold text-xs text-muted-foreground mt-1">Contributors:</p>
                        <ScrollArea className="max-h-32 pr-2 -mr-2">
                            <div className="space-y-1.5 mt-1">
                                {userBreakdown.map(({ user, done, likelihood }) => (
                                    <div key={user.id} className="flex items-center gap-2 text-xs">
                                        <Avatar className="h-5 w-5 border">
                                            <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                                            <AvatarFallback className="text-[9px] bg-muted">{getInitials(user.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-muted-foreground truncate flex-1">{user.name}</span>
                                        <span className="font-medium text-foreground">{done} tasks</span>
                                        {likelihood > 0 && <span className="font-medium text-purple-600">({likelihood} assets)</span>}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </>
                )}
            </div>
        )
    }
    return null;
}


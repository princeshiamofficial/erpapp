

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format, isWithinInterval, parseISO, subDays, getHours, getYear, getMonth, startOfMonth, endOfMonth, differenceInDays, startOfYear, endOfYear, startOfDay, endOfDay, getDaysInMonth, isSameDay, addDays, subMonths, isValid } from "date-fns";
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
  LineChart as LineChartIcon,
  Gift,
  Clock,
  ChevronRight,
  Phone
} from 'lucide-react';
import Link from 'next/link';
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
  Label as RechartsLabel,
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
import { cn, formatDisplayName } from '@/lib/utils';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { divisions } from '@/lib/district-data'; // Import divisions data
import type { DateRange, PredefinedRange } from "@/components/dashboard/date-range-picker";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TeamPerformanceGraph } from '@/components/dashboard/TeamPerformanceGraph';
import { getTaskEntries, type TaskEntry, getMonthlyTargetHistory, setMonthlyTargetHistory } from '@/lib/team-performance-service'; // Import new service
import { getDr2oEntries } from '@/lib/dr2o-service';
import { CANCELLED_STATUS_ID } from '@/lib/status-constants'; // Import CANCELLED_STATUS_ID
import { LEAD_CATEGORY_LABELS } from '@/lib/pipeline-constants';
import { getAllTransactionsAction } from '@/app/(app)/finance-manager/actions';


// Lazy loading components
const DateRangePicker = dynamic(() => import('@/components/dashboard/date-range-picker').then(mod => mod.DateRangePicker), {
  ssr: false,
  loading: () => <Skeleton className="h-10 w-full sm:w-[260px]" />
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

const simplifyString = (str: string) => str.replace(/['’.,\s-]/g, '').toLowerCase();

const matchableDistricts = divisions.flatMap(div => 
  div.districts.map(dist => {
    const namesToMatch = [dist.name, ...(dist.aliases || [])];
    const simplifiedNames = namesToMatch
      .map(name => simplifyString(name))
      .filter(name => name.length > 0);
    return {
      name: dist.name,
      division: div.division,
      simplifiedNames
    };
  })
);

const chartConfig = {
  sales: {
    label: "Total Sales (BDT)",
    color: "hsl(var(--chart-1))",
  },
  orders: { // Added for CRM view
    label: "Sales",
    color: "hsl(var(--chart-1))",
  },
  deliveries: {
    label: "Deliveries",
    color: "hsl(var(--chart-2))",
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
  count: {
    label: "Orders",
    color: "hsl(var(--chart-2))",
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
  hideValue?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon: Icon, iconColorClass = "text-primary", circleBgClass = "bg-primary/10", isLoading, currentUser, hideValue }) => {
  if (isLoading) {
    return (
      <Card className="bg-card p-4 shadow-sm sm:shadow-md rounded-2xl sm:rounded-lg border-none sm:border min-h-[100px] flex flex-col justify-center">
        <div className="flex sm:flex-row flex-col items-center sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
          <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-full" />
          <div className="space-y-1.5 flex-1 w-full">
            <Skeleton className="h-3 w-16 sm:h-4 sm:w-24 mx-auto sm:mx-0" />
            <Skeleton className="h-5 w-24 sm:h-7 sm:w-32 mx-auto sm:mx-0" />
          </div>
        </div>
      </Card>
    );
  }
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg active:scale-95 sm:active:scale-100 bg-card p-2.5 sm:p-4 rounded-2xl sm:rounded-lg border-none sm:border shadow-sm sm:shadow-md">
      {/* Premium background highlight for mobile */}
      <div className={cn("absolute inset-0 opacity-[0.03] sm:hidden bg-gradient-to-br transition-opacity group-active:opacity-[0.06]", circleBgClass)} />

      <div className="flex sm:flex-row flex-col items-center sm:items-center space-y-2.5 sm:space-y-0 sm:space-x-4 text-center sm:text-left relative z-10">
        <div className={cn(
          "p-2.5 sm:p-3 rounded-xl sm:rounded-full transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm sm:shadow-none",
          circleBgClass
        )}>
          <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", iconColorClass)} />
        </div>
        <div className="flex-1 min-w-0 w-full">
          <p className="text-[10px] sm:text-sm font-bold sm:font-medium uppercase sm:capitalize tracking-widest sm:tracking-normal text-muted-foreground/80 sm:text-muted-foreground truncate px-1">
            {title}
          </p>
          <p className="text-[15px] sm:text-2xl font-bold text-foreground font-mono mt-0.5 sm:mt-0 px-1 leading-tight">
            <spoiler-span key={value}>{value}</spoiler-span>
          </p>
        </div>
      </div>

      {/* Decorative element for mobile - subtle large icon */}
      <div className="absolute -right-4 -bottom-4 opacity-[0.04] sm:hidden pointer-events-none transform rotate-12 scale-110">
        <Icon className={cn("h-20 w-20", iconColorClass)} />
      </div>

      {/* Subtle border glow for mobile dark mode */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent sm:hidden" />
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
  { title: 'Docs Pending', status: 'Docs Pending', icon: ClipboardList, color: '#4f46e5', gradient: 'linear-gradient(to right, #4f46e5, #818cf8)', shadow: '0 4px 15px 0 rgba(79, 70, 229, 0.4)' },
  { title: 'Project Pending', status: 'Project Pending', icon: ClipboardList, color: '#d97706', gradient: 'linear-gradient(to right, #d97706, #f59e0b)', shadow: '0 4px 15px 0 rgba(217, 119, 6, 0.4)' },
  { title: 'Business Closed', status: 'Business Closed', icon: ClipboardX, color: '#52525b', gradient: 'linear-gradient(to right, #52525b, #71717a)', shadow: '0 4px 15px 0 rgba(82, 82, 91, 0.4)' },
];

const ALL_LEAD_CATEGORIES_CONFIG: Array<{ title: string; category: LeadCategory; icon: React.ElementType; color: string; gradient: string; shadow: string; }> = [
  { title: LEAD_CATEGORY_LABELS['POP'], category: 'POP', icon: UserIcon, color: '#0ea5e9', gradient: 'linear-gradient(to right, #0ea5e9, #38bdf8)', shadow: '0 4px 15px 0 rgba(14, 165, 233, 0.4)' },
  { title: LEAD_CATEGORY_LABELS['APPOINTMENT'], category: 'APPOINTMENT', icon: CalendarDays, color: '#6366f1', gradient: 'linear-gradient(to right, #6366f1, #818cf8)', shadow: '0 4px 15px 0 rgba(99, 102, 241, 0.4)' },
  { title: LEAD_CATEGORY_LABELS['PROSPECT'], category: 'PROSPECT', icon: Users, color: '#ec4899', gradient: 'linear-gradient(to right, #ec4899, #f472b6)', shadow: '0 4px 15px 0 rgba(236, 72, 153, 0.4)' },
  { title: LEAD_CATEGORY_LABELS['POG'], category: 'POG', icon: Users, color: '#1d4ed8', gradient: 'linear-gradient(to right, #1d4ed8, #3b82f6)', shadow: '0 4px 15px 0 rgba(29, 78, 216, 0.4)' },
  { title: LEAD_CATEGORY_LABELS['OC'], category: 'OC', icon: BaggageClaim, color: '#9333ea', gradient: 'linear-gradient(to right, #9333ea, #a855f7)', shadow: '0 4px 15px 0 rgba(147, 51, 234, 0.4)' },
  { title: LEAD_CATEGORY_LABELS['OD'], category: 'OD', icon: Briefcase, color: '#16a34a', gradient: 'linear-gradient(to right, #16a34a, #22c55e)', shadow: '0 4px 15px 0 rgba(22, 163, 74, 0.4)' },
  { title: LEAD_CATEGORY_LABELS['ROD'], category: 'ROD', icon: ShoppingCart, color: '#ea580c', gradient: 'linear-gradient(to right, #ea580c, #f97316)', shadow: '0 4px 15px 0 rgba(234, 88, 12, 0.4)' },
];

const queryClient = new QueryClient();

const LeftAlignedTick = ({ y, payload }: any) => {
  return (
    <g>
      <text x={0} y={y} dy={4} fontSize={14} fontWeight={500} textAnchor="start" fill="currentColor" className="fill-muted-foreground">
        {payload.value}
      </text>
      <text x={135} y={y} dy={4} fontSize={14} fontWeight={500} textAnchor="start" fill="currentColor" className="fill-muted-foreground">
        :
      </text>
    </g>
  );
};

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
  const [chartGranularity, setChartGranularity] = useState<'daily' | 'hourly' | 'monthly'>('daily');
  const [selectedCrmId, setSelectedCrmId] = useState<string>('all');
  const [feedbackToDelete, setFeedbackToDelete] = useState<Feedback | null>(null);
  const [isDeletingFeedback, setIsDeletingFeedback] = useState(false);
  const [displayMode, setDisplayMode] = useState<'amount'|'quantity'>('quantity');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = sessionStorage.getItem('dashboardDisplayMode') as 'amount'|'quantity' || 'quantity';
      setDisplayMode(savedMode);

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'dashboardDisplayMode' && e.newValue) {
          setDisplayMode(e.newValue as 'amount'|'quantity');
        }
      };
      
      const handleCustomEvent = (e: any) => {
        setDisplayMode(e.detail.mode);
      };

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('dashboardDisplayModeChanged', handleCustomEvent);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('dashboardDisplayModeChanged', handleCustomEvent);
      };
    }
  }, []);


  const isDesignerRepOrLrOrCo = currentUser?.role === 'DESIGNER_REPRESENTATIVE' || currentUser?.role === 'LR' || currentUser?.role === 'CO';


  const fetchDashboardData = useCallback(async () => {
    if (!currentUser) {
      return null;
    }
    const startStr = selectedDateRange?.from ? format(startOfDay(selectedDateRange.from), 'yyyy-MM-dd HH:mm:ss') : undefined;
    const endStr = selectedDateRange?.to ? format(endOfDay(selectedDateRange.to), 'yyyy-MM-dd HH:mm:ss') : undefined;
    const role = currentUser?.role;
    const userId = (role === 'SYSTEM_ADMIN' || role === 'ADMIN') ? (selectedCrmId && selectedCrmId !== 'all' ? selectedCrmId : undefined) : currentUser?.id;
    try {
      const [fetchedOrders, fetchedYearOrders, fetchedModels, fetchedUsers, fetchedProjects, fetchedSettings, fetchedLeads, fetchedTodayScheduledLeads, fetchedTasks, fetchedFeedback, fetchedCrWorkflowEntries, fetchedTransactions] = await Promise.all([
        getOrders(startStr, endStr, role, userId), getOrders(undefined, undefined, role, userId), getModels(), getUsers(), getProjects(startStr, endStr, role, userId), getGlobalSettings(), getLeads(startStr, endStr, role, userId), getLeads(undefined, undefined, role, userId), getTaskEntries(), getFeedback(), getDr2oEntries('CR'), getAllTransactionsAction(startStr, endStr, role, userId),
      ]);

      // Merge CR workflow sale counts into allTasks for CRM users
      const crmWorkflowTasks: TaskEntry[] = fetchedCrWorkflowEntries.map(entry => ({
        id: entry.id,
        date: entry.date,
        userId: entry.crmId,
        userName: entry.crmName,
        role: 'CRM',
        taskCount: entry.saleCount || 0,
        createdAt: entry.date,
      }));

      return {
        allOrders: fetchedOrders, allYearOrders: fetchedYearOrders, allModels: fetchedModels, allUsers: fetchedUsers,
        allProjects: fetchedProjects, globalSettings: fetchedSettings, allLeads: fetchedLeads, allTodayScheduledLeads: fetchedTodayScheduledLeads,
        allTasks: [...fetchedTasks, ...crmWorkflowTasks], 
        allFeedback: fetchedFeedback,
        allTransactions: fetchedTransactions
      };
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast({ title: "Error", description: "Could not load dashboard data.", variant: "destructive" });
      throw new Error("Data fetch failed");
    }
  }, [currentUser, toast, selectedDateRange, selectedCrmId]);

  const { data: queryData, isLoading: isLoadingData, refetch } = useQuery({
    queryKey: ['dashboardData', currentUser?.id, selectedCrmId, selectedDateRange?.from?.toISOString(), selectedDateRange?.to?.toISOString()],
    queryFn: fetchDashboardData,
    enabled: !!currentUser,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
    retry: 1,
  });

  const { allOrders = [], allYearOrders = [], allModels = [], allUsers = [], allProjects = [], globalSettings = null, allLeads = [], allTodayScheduledLeads = [], allTasks = [], allFeedback = [], allTransactions = [] } = queryData || {};
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
    let ordersToFilter = [...allOrders];

    if (currentUser?.role === 'CRM') {
      ordersToFilter = ordersToFilter.filter(order => order.crmUserId === currentUser.id);
    } else if (currentUser?.role === 'DESIGNER_REPRESENTATIVE') {
      ordersToFilter = ordersToFilter.filter(order => order.designerRepresentativeId === currentUser.id);
    } else if ((currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN') && selectedCrmId !== 'all') {
      ordersToFilter = ordersToFilter.filter(order => order.crmUserId === selectedCrmId);
    }

    return ordersToFilter;
  }, [allOrders, currentUser, selectedCrmId]);

  const validFilteredOrders = useMemo(() => {
    return filteredOrders.filter(order => order.currentStatus !== CANCELLED_STATUS_ID);
  }, [filteredOrders]);

  const validAllOrdersForPayments = useMemo(() => {
    const ordersSource = allYearOrders && allYearOrders.length > 0 ? allYearOrders : allOrders;
    let ordersToFilter = [...ordersSource];

    if (currentUser?.role === 'CRM') {
      ordersToFilter = ordersToFilter.filter(order => order.crmUserId === currentUser.id);
    } else if (currentUser?.role === 'DESIGNER_REPRESENTATIVE') {
      ordersToFilter = ordersToFilter.filter(order => order.designerRepresentativeId === currentUser.id);
    } else if ((currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN') && selectedCrmId !== 'all') {
      ordersToFilter = ordersToFilter.filter(order => order.crmUserId === selectedCrmId);
    }

    return ordersToFilter.filter(order => order.currentStatus !== CANCELLED_STATUS_ID);
  }, [allYearOrders, allOrders, currentUser, selectedCrmId]);

  const filteredLeads = useMemo(() => {
    let leadsToFilter = [...allLeads];

    if (currentUser?.role === 'CRM') {
      leadsToFilter = leadsToFilter.filter(l => l.crmId === currentUser.id);
    } else if ((currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN') && selectedCrmId !== 'all') {
      leadsToFilter = leadsToFilter.filter(l => l.crmId === selectedCrmId);
    }
    return leadsToFilter;
  }, [allLeads, currentUser, selectedCrmId]);

  const todayScheduledLeads = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let leadsToFilter = [...allTodayScheduledLeads];

    if (currentUser?.role === 'CRM') {
      leadsToFilter = leadsToFilter.filter(l => l.crmId === currentUser.id);
    } else if ((currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN') && selectedCrmId !== 'all') {
      leadsToFilter = leadsToFilter.filter(l => l.crmId === selectedCrmId);
    }

    return leadsToFilter.filter(lead => {
      if (!lead.schedule) return false;
      try {
        const dt = parseISO(lead.schedule);
        return isValid(dt) && format(dt, 'yyyy-MM-dd') === todayStr;
      } catch {
        return false;
      }
    }).sort((a, b) => {
      try {
        return new Date(a.schedule!).getTime() - new Date(b.schedule!).getTime();
      } catch {
        return 0;
      }
    });
  }, [allTodayScheduledLeads, currentUser, selectedCrmId]);

  const filteredProjects = useMemo(() => {
    let projectsToFilter = [...allProjects];

    if (currentUser?.role === 'CRM') {
      projectsToFilter = projectsToFilter.filter(p => p.assigneeId === currentUser.id);
    } else if (currentUser?.role === 'DESIGNER_REPRESENTATIVE') {
      projectsToFilter = projectsToFilter.filter(p => p.designerRepresentativeId === currentUser.id);
    } else if (currentUser?.role === 'LR') {
      projectsToFilter = projectsToFilter.filter(p => p.assigneeId === currentUser.id || p.status === 'Logistics' || p.status === 'Courier' || p.status === 'Delivered');
    } else if ((currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN') && selectedCrmId !== 'all') {
      projectsToFilter = projectsToFilter.filter(p => p.assigneeId === selectedCrmId);
    }

    return projectsToFilter;
  }, [allProjects, currentUser, selectedCrmId]);


  const topSalesAreaData = useMemo(() => {
    const salesByDivision: Record<string, number> = {};
    const simplifyString = (str: string) => str.replace(/['’.,\s-]/g, '').toLowerCase();
    let totalSalesAllDivisions = 0;

    validFilteredOrders.forEach(order => {
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
      const orderTotal = (order.orderItems || []).reduce((acc, item) => acc + (item.isGift ? 0 : (Number(item.lineItemTotalPrice) || 0)), 0) - (Number(order.specialClientDiscount) || 0);
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

  }, [validFilteredOrders]);

  const areaLeaderboardData = useMemo(() => {
    const ALL_BANGLADESH_DIVISIONS = [
      "Dhaka",
      "Chattogram",
      "Rajshahi",
      "Khulna",
      "Barishal",
      "Sylhet",
      "Rangpur",
      "Mymensingh",
      "Others"
    ];

    const divisionStats: Record<string, { name: string; orderCount: number; totalSales: number; districts: Set<string> }> = {};

    ALL_BANGLADESH_DIVISIONS.forEach(divName => {
      divisionStats[divName] = {
        name: divName,
        orderCount: 0,
        totalSales: 0,
        districts: new Set<string>(),
      };
    });

    let totalOrdersCount = 0;

    validFilteredOrders.forEach(order => {
      let longestMatch: { name: string; division: string } | null = null;
      let longestMatchLength = 0;
      const textToMatch = `${order.address || ''} ${order.shippingArea || ''}`;
      const simplifiedText = simplifyString(textToMatch);

      for (const dist of matchableDistricts) {
        for (const simplifiedName of dist.simplifiedNames) {
          if (simplifiedText.includes(simplifiedName)) {
            if (simplifiedName.length > longestMatchLength) {
              longestMatchLength = simplifiedName.length;
              longestMatch = { name: dist.name, division: dist.division };
            }
          }
        }
      }

      const rawDivisionName = longestMatch ? longestMatch.division : "Others";
      const cleanDivisionName = rawDivisionName.replace(/\s*Division\s*/i, '').trim();
      const districtName = longestMatch ? longestMatch.name : (order.shippingArea?.trim() || "");
      const orderTotal = (order.orderItems || []).reduce((acc, item) => acc + (item.isGift ? 0 : (Number(item.lineItemTotalPrice) || 0)), 0) - (Number(order.specialClientDiscount) || 0);

      const targetDivKey = divisionStats[cleanDivisionName] ? cleanDivisionName : "Others";

      divisionStats[targetDivKey].orderCount += 1;
      divisionStats[targetDivKey].totalSales += orderTotal;
      if (districtName) {
        divisionStats[targetDivKey].districts.add(districtName);
      }
      totalOrdersCount += 1;
    });

    return Object.values(divisionStats)
      .map(item => ({
        name: item.name,
        division: item.name,
        orderCount: item.orderCount,
        totalSales: item.totalSales,
        districtCount: item.districts.size,
        percentage: totalOrdersCount > 0 ? (item.orderCount / totalOrdersCount) * 100 : 0,
      }))
      .sort((a, b) => b.orderCount - a.orderCount || b.totalSales - a.totalSales || a.name.localeCompare(b.name));
  }, [validFilteredOrders]);

  const paymentMethodData = useMemo(() => {
    const interval = getDateRangeInterval();
    if (!interval) return [];

    const stats: Record<string, { count: number; amount: number }> = {};

    validAllOrdersForPayments.forEach(order => {
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
              stats[methodName].amount += (Number(payment.amount) || 0);
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
  }, [validAllOrdersForPayments, selectedDateRange]);




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
      .sort((a, b) => b.value - a.value);
  }, [filteredLeads]);

  const projectCounts = useMemo(() => {
    const counts: Record<ProjectStatusType, number> = {
      'Project Pending': 0, 'CR Clearance': 0, 'CO Clearance': 0, 'Cancel': 0, 'On Design': 0, 'On Hold': 0, 'Logistics': 0, 'Courier': 0, 'Delivered': 0,
      'Docs Pending': 0, 'Business Closed': 0,
    };

    let projectsToCount = filteredProjects;

    projectsToCount.forEach(p => {
      if (counts[p.status] !== undefined) {
        counts[p.status]++;
      }
    });
    return counts;
  }, [filteredProjects]);

  const leadCategoryCounts = useMemo(() => {
    const counts: Record<LeadCategory, number> = {
      'POP': 0, 'APPOINTMENT': 0, 'PROSPECT': 0, 'POG': 0, 'OC': 0, 'OD': 0, 'ROD': 0
    };
    let leadsToCount = filteredLeads;
    leadsToCount.forEach(l => {
      if (counts[l.category] !== undefined) {
        counts[l.category]++;
      }
    });
    return counts;
  }, [filteredLeads]);

  const { totalSales, invoiceDue, totalPurchase, totalPurchaseCount, netValue, salesChartData, deliveredCount, ordersWithDueCount, invoicePaid, invoicePaidCount, invoiceCodPaid, invoiceCodPaidCount, salesCount, repeatSalesCount, repeatSalesAmount, invoicePayment, invoicePaymentCount, totalExpenses, totalExpensesCount, giftValue, giftCount } = useMemo(() => {
    const interval = getDateRangeInterval();
    if (!interval) {
      return { totalSales: 0, invoiceDue: 0, totalPurchase: 0, totalPurchaseCount: 0, netValue: 0, salesChartData: [], deliveredCount: '0', ordersWithDueCount: 0, invoicePaid: 0, invoicePaidCount: 0, invoiceCodPaid: 0, invoiceCodPaidCount: 0, salesCount: 0, repeatSalesCount: 0, repeatSalesAmount: 0, invoicePayment: 0, invoicePaymentCount: 0, totalExpenses: 0, totalExpensesCount: 0, giftValue: 0, giftCount: 0 };
    }

    let currentTotalSales = 0;
    let currentGiftValue = 0;
    let currentGiftCount = 0;
    let currentTotalPurchaseValue = 0;
    let currentTotalPurchaseItemQuantity = 0;
    let currentOrdersWithDueCount = 0;
    let currentInvoiceDue = 0;
    let currentInvoicePaid = 0;
    let currentInvoiceCodPaid = 0;
    let currentInvoiceCodPaidCount = 0;
    let currentInvoicePaidCount = 0;
    let currentRepeatSalesCount = 0;
    let currentRepeatSalesAmount = 0;
    let currentInvoicePayment = 0;
    let currentInvoicePaymentCount = 0;
    let currentTotalExpenses = 0;
    let currentTotalExpensesCount = 0;

    const customerOrderHistory = new Set<string>();
    const repeatOrderIds = new Set<string>();
    const advancePaidOrderIds = new Set<string>();
    const codPaidOrderIds = new Set<string>();
    
    // Sort history of non-cancelled orders by date to identify repeat orders accurately
    const historyOrders = allYearOrders.length > 0 ? allYearOrders : allOrders;
    const sortedValidOrders = [...historyOrders]
      .filter(o => o.currentStatus !== CANCELLED_STATUS_ID)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    sortedValidOrders.forEach(o => {
      const jobId = (o.companyName || '').split('•')[0].trim();
      if (jobId) {
        if (customerOrderHistory.has(jobId)) {
          repeatOrderIds.add(o.id);
        } else {
          customerOrderHistory.add(jobId);
        }
      }
    });

    const ordersForCalcs = validFilteredOrders;

    ordersForCalcs.forEach(order => {
      const orderCreatedAt = parseISO(order.createdAt);
      // Sales, Purchase, Due calculations based on orders *created* in the date range
      if (isWithinInterval(orderCreatedAt, interval)) {
        const orderTotal = (order.orderItems || []).reduce((sum, item) => sum + (item.isGift ? 0 : (Number(item.lineItemTotalPrice) || 0)), 0);
        const effectiveDiscount = Number(order.specialClientDiscount) || 0;
        const shipping = Number(order.shippingCharge) || 0;
        const netPayable = orderTotal - effectiveDiscount;
        const grandTotal = netPayable + shipping;
        currentTotalSales += netPayable;

        if (Array.isArray(order.orderItems)) {
          order.orderItems.forEach((item: OrderItem) => {
            if (item.isGift) {
              currentGiftValue += (Number(item.lineItemTotalPrice) || 0);
              currentGiftCount += (Number(item.quantity) || 0);
            }
            const modelDetails = allModels.find(m => m.name === item.model);
            if (modelDetails && typeof modelDetails.buyingPrice === 'number' && typeof item.quantity === 'number' && item.quantity > 0) {
              currentTotalPurchaseValue += (modelDetails.buyingPrice * item.quantity);
              currentTotalPurchaseItemQuantity += item.quantity;
            }
          });
        }

        const totalOrderAdvance = (order.advancePayments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const orderDue = Math.max(0, grandTotal - totalOrderAdvance);
        currentInvoiceDue += orderDue;

        if (orderDue > 0.01) {
          currentOrdersWithDueCount++;
        }

        if (repeatOrderIds.has(order.id)) {
          currentRepeatSalesCount++;
          currentRepeatSalesAmount += netPayable;
        }
      }
    });

    // Payments made in the date range (scanned across all valid historical orders)
    validAllOrdersForPayments.forEach(order => {
      if (Array.isArray(order.advancePayments)) {
        order.advancePayments.forEach(payment => {
          if (payment.date && isWithinInterval(parseISO(payment.date), interval)) {
            const paymentAmt = Number(payment.amount) || 0;
            currentInvoicePayment += paymentAmt;
            currentInvoicePaymentCount++;

            const methodName = payment.paymentMethod?.toLowerCase() || '';
            const isCod = methodName === 'cod' || methodName === 'system auto-settled' || methodName === 'courier';
            if (isCod) {
              currentInvoiceCodPaid += paymentAmt;
              codPaidOrderIds.add(order.id);
            } else {
              currentInvoicePaid += paymentAmt;
              advancePaidOrderIds.add(order.id);
            }
          }
        });
      }
    });

    currentInvoicePaidCount = advancePaidOrderIds.size;
    currentInvoiceCodPaidCount = codPaidOrderIds.size;

    let currentDeliveredCount = 0;
    let ordersForDeliveryCount = allOrders; // Start with all orders
    if (currentUser?.role === 'CRM') {
      ordersForDeliveryCount = allOrders.filter(order => order.crmUserId === currentUser.id);
    } else if (currentUser?.role === 'DESIGNER_REPRESENTATIVE') {
      ordersForDeliveryCount = allOrders.filter(order => order.designerRepresentativeId === currentUser.id);
    } else if ((currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN') && selectedCrmId !== 'all') {
      ordersForDeliveryCount = allOrders.filter(order => order.crmUserId === selectedCrmId);
    }

    ordersForDeliveryCount = ordersForDeliveryCount.filter(order => order.currentStatus !== CANCELLED_STATUS_ID);

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

    let chartData: Array<{ date: string; sales: number; orders: number; deliveries: number; }> = [];
    if (selectedPredefinedValue === 'today' || selectedPredefinedValue === 'yesterday') {
      const hourlyData = new Map<number, { sales: number; orders: number; deliveries: number }>();
      for (let i = 0; i < 24; i++) hourlyData.set(i, { sales: 0, orders: 0, deliveries: 0 });

      validFilteredOrders.forEach(order => {
        if (order.createdAt) {
          try {
            const hour = getHours(parseISO(order.createdAt));
            const orderTotalForChart = (order.orderItems || []).reduce((sum, item) => sum + (item.isGift ? 0 : (Number(item.lineItemTotalPrice) || 0)), 0) - (Number(order.specialClientDiscount) || 0);
            const existing = hourlyData.get(hour) || { sales: 0, orders: 0, deliveries: 0 };
            hourlyData.set(hour, { ...existing, sales: existing.sales + orderTotalForChart, orders: existing.orders + 1 });
          } catch (e) { /* ignore */ }
        }
      });

      ordersForDeliveryCount.forEach(order => {
        (order.statusHistory || []).forEach(log => {
          if (log.status === deliveredStatusId && log.timestamp) {
            try {
              const deliveryDate = parseISO(log.timestamp);
              if (isWithinInterval(deliveryDate, interval)) {
                const hour = getHours(deliveryDate);
                const existing = hourlyData.get(hour);
                if (existing) {
                  existing.deliveries += 1;
                }
              }
            } catch (e) { /* ignore */ }
          }
        });
      });

      chartData = Array.from(hourlyData.entries())
        .map(([hour, data]) => ({ date: hour.toString(), sales: data.sales, orders: data.orders, deliveries: data.deliveries }))
        .sort((a, b) => parseInt(a.date) - parseInt(b.date));
    } else if (selectedDateRange?.from && selectedDateRange?.to) {
      if (chartGranularity === 'monthly') {
        const monthlyData = new Map<string, { sales: number; orders: number; deliveries: number }>();
        let tempDate = startOfMonth(new Date(selectedDateRange.from));
        const endRangeDate = endOfMonth(new Date(selectedDateRange.to));
        
        while (tempDate <= endRangeDate) {
          monthlyData.set(format(tempDate, 'yyyy-MM'), { sales: 0, orders: 0, deliveries: 0 });
          tempDate = addDays(endOfMonth(tempDate), 1);
        }

        validFilteredOrders.forEach(order => {
          if (order.createdAt) {
            try {
              const orderDateStr = format(parseISO(order.createdAt), 'yyyy-MM');
              if (monthlyData.has(orderDateStr)) {
                const orderTotalForChart = (order.orderItems || []).reduce((sum, item) => sum + (item.isGift ? 0 : (Number(item.lineItemTotalPrice) || 0)), 0) - (Number(order.specialClientDiscount) || 0);
                const existing = monthlyData.get(orderDateStr) || { sales: 0, orders: 0, deliveries: 0 };
                monthlyData.set(orderDateStr, { ...existing, sales: existing.sales + orderTotalForChart, orders: existing.orders + 1 });
              }
            } catch (e) { /* ignore */ }
          }
        });

        ordersForDeliveryCount.forEach(order => {
          (order.statusHistory || []).forEach(log => {
            if (log.status === deliveredStatusId && log.timestamp) {
              try {
                const deliveryDate = parseISO(log.timestamp);
                if (isWithinInterval(deliveryDate, interval)) {
                  const deliveryDateStr = format(deliveryDate, 'yyyy-MM');
                  const existing = monthlyData.get(deliveryDateStr);
                  if (existing) {
                    existing.deliveries += 1;
                  }
                }
              } catch (e) { /* ignore */ }
            }
          });
        });

        chartData = Array.from(monthlyData.entries())
          .map(([date, data]) => ({ date, sales: data.sales, orders: data.orders, deliveries: data.deliveries }))
          .sort((a, b) => a.date.localeCompare(b.date));
      } else {
        const dailyData = new Map<string, { sales: number; orders: number; deliveries: number }>();
        let tempDate = new Date(selectedDateRange.from);
        while (tempDate <= selectedDateRange.to) {
          dailyData.set(format(tempDate, 'yyyy-MM-dd'), { sales: 0, orders: 0, deliveries: 0 });
          tempDate = addDays(tempDate, 1);
        }

        validFilteredOrders.forEach(order => {
          if (order.createdAt) {
            try {
              const orderDateStr = format(parseISO(order.createdAt), 'yyyy-MM-dd');
              if (dailyData.has(orderDateStr)) {
                const orderTotalForChart = (order.orderItems || []).reduce((sum, item) => sum + (item.isGift ? 0 : (Number(item.lineItemTotalPrice) || 0)), 0) - (Number(order.specialClientDiscount) || 0);
                const existing = dailyData.get(orderDateStr) || { sales: 0, orders: 0, deliveries: 0 };
                dailyData.set(orderDateStr, { ...existing, sales: existing.sales + orderTotalForChart, orders: existing.orders + 1 });
              }
            } catch (e) { /* ignore */ }
          }
        });

        ordersForDeliveryCount.forEach(order => {
          (order.statusHistory || []).forEach(log => {
            if (log.status === deliveredStatusId && log.timestamp) {
              try {
                const deliveryDate = parseISO(log.timestamp);
                if (isWithinInterval(deliveryDate, interval)) {
                  const deliveryDateStr = format(deliveryDate, 'yyyy-MM-dd');
                  const existing = dailyData.get(deliveryDateStr);
                  if (existing) {
                    existing.deliveries += 1;
                  }
                }
              } catch (e) { /* ignore */ }
            }
          });
        });

        chartData = Array.from(dailyData.entries())
          .map(([date, data]) => ({ date, sales: data.sales, orders: data.orders, deliveries: data.deliveries }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }
    }

    allTransactions.forEach(t => {
      if (t.type === 'expense') {
        try {
          const transactionDate = parseISO(t.date);
          if (isWithinInterval(transactionDate, interval)) {
            if (currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN') {
              if (selectedCrmId !== 'all') {
                if (t.userId !== selectedCrmId) return;
              }
            } else {
              if (t.userId !== currentUser?.id) return;
            }
            currentTotalExpenses += (Number(t.amount) || 0);
            currentTotalExpensesCount++;
          }
        } catch (e) {
          console.error("Error parsing transaction date for dashboard:", t.date, e);
        }
      }
    });

    return {
      totalSales: currentTotalSales,
      invoiceDue: currentInvoiceDue,
      totalPurchase: currentTotalPurchaseValue,
      totalPurchaseCount: currentTotalPurchaseItemQuantity,
      netValue: currentTotalSales - currentTotalExpenses,
      salesChartData: chartData,
      deliveredCount: currentDeliveredCount.toString(),
      ordersWithDueCount: currentOrdersWithDueCount,
      invoicePaid: currentInvoicePaid,
      invoicePaidCount: currentInvoicePaidCount,
      invoiceCodPaid: currentInvoiceCodPaid,
      invoiceCodPaidCount: currentInvoiceCodPaidCount,
      salesCount: validFilteredOrders.length,
      repeatSalesCount: currentRepeatSalesCount,
      repeatSalesAmount: currentRepeatSalesAmount,
      invoicePayment: currentInvoicePayment,
      invoicePaymentCount: currentInvoicePaymentCount,
      totalExpenses: currentTotalExpenses,
      totalExpensesCount: currentTotalExpensesCount,
      giftValue: currentGiftValue,
      giftCount: currentGiftCount,
    };
  }, [validFilteredOrders, validAllOrdersForPayments, allOrders, allYearOrders, allModels, selectedDateRange, selectedPredefinedValue, globalSettings, currentUser, selectedCrmId, chartGranularity, allTransactions]);

  const [teamPerformanceDateRange, setTeamPerformanceDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: startOfMonth(now),
      to: endOfMonth(now),
    };
  });
  const [selectedTeam, setSelectedTeam] = useState<UserRole | 'all'>('CRM');
  const [specificUserId, setSpecificUserId] = useState<string | 'all'>('all'); // New state for specific user filter

  const isAdminView = useMemo(() => {
    if (!currentUser) return false;
    return ['SYSTEM_ADMIN', 'ADMIN'].includes(currentUser.role);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && !isAdminView && (currentUser.role === 'DESIGNER_REPRESENTATIVE' || currentUser.role === 'LR' || currentUser.role === 'CO')) {
      setSelectedTeam(currentUser.role);
    }
  }, [currentUser, isAdminView]);

  const specificUserOptions = useMemo(() => {
    let filtered = allUsers.filter(u => !u.isBanned);
    if (selectedTeam !== 'all') {
      filtered = filtered.filter(u => u.role === selectedTeam);
    } else {
      filtered = filtered.filter(u => u.role === 'CRM' || u.role === 'DESIGNER_REPRESENTATIVE' || u.role === 'LR' || u.role === 'CO');
    }
    return filtered;
  }, [allUsers, selectedTeam]);

  const { teamPerformanceData, totalPerformanceTarget } = useMemo(() => {
    if (!teamPerformanceDateRange?.from || !globalSettings?.roleBasedTargets) {
      return { teamPerformanceData: [], totalPerformanceTarget: 0 };
    }

    const startDate = startOfDay(teamPerformanceDateRange.from);
    const endDate = endOfDay(teamPerformanceDateRange.to || teamPerformanceDateRange.from);
    const roleBasedTargets = globalSettings.roleBasedTargets;

    let usersToInclude = allUsers.filter(u => !u.isBanned);
    if (isAdminView) {
      if (specificUserId !== 'all') {
        usersToInclude = allUsers.filter(u => u.id === specificUserId);
      } else if (selectedTeam !== 'all') {
        usersToInclude = allUsers.filter(u => u.role === selectedTeam);
      }
    } else if (currentUser) {
      usersToInclude = allUsers.filter(u => u.role === currentUser.role && !u.isBanned);
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
        totalTarget = (allUsers.filter(u => u.role === 'CRM' && !u.isBanned).length * roleBasedTargets.CRM) +
          (allUsers.filter(u => u.role === 'DESIGNER_REPRESENTATIVE' && !u.isBanned).length * roleBasedTargets.DESIGNER_REPRESENTATIVE) +
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

    const dateMap = new Map<string, { totalDone: number; userData: { [userId: string]: { done: number; role: UserRole } } }>();

    let currentDate = startDate;
    while (currentDate <= endDate) {
      dateMap.set(format(currentDate, 'd MMM'), { totalDone: 0, userData: {} });
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
            if (!dayData.userData[entry.userId]) {
              dayData.userData[entry.userId] = { done: 0, role: entry.role };
            }
            dayData.userData[entry.userId].done += entry.taskCount;
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
    } else if (selectedPredefinedValue === 'thisYear' || selectedPredefinedValue === 'lastYear') {
      setChartGranularity('monthly');
    } else if (selectedPredefinedValue === 'custom' && selectedDateRange?.from && selectedDateRange?.to) {
      const days = differenceInDays(selectedDateRange.to, selectedDateRange.from);
      if (days > 31) {
        setChartGranularity('monthly');
      } else {
        setChartGranularity('daily');
      }
    } else {
      // For thisMonth, lastMonth, last7Days, last30Days
      setChartGranularity('daily');
    }
  }, [selectedPredefinedValue, selectedDateRange]);

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
    if (userId !== 'all') {
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        setSelectedTeam(user.role);
      }
    } else {
      setSelectedTeam('all');
    }
  }

  const isSystemAdmin = useMemo(() => currentUser?.role === 'SYSTEM_ADMIN', [currentUser]);
  const isCrm = useMemo(() => currentUser?.role === 'CRM', [currentUser]);
  const isDr = useMemo(() => currentUser?.role === 'DESIGNER_REPRESENTATIVE', [currentUser]);

  const hideFinancials = useMemo(() => {
    if (!currentUser || !globalSettings) return false;
    const allowedRoles = globalSettings.rolesAllowedToViewFinancials || ['ADMIN', 'SYSTEM_ADMIN'];
    return !allowedRoles.includes(currentUser.role);
  }, [currentUser, globalSettings]);

  const summaryCardDefinitions = useMemo(() => {
    const showAmount = isSystemAdmin && displayMode === 'amount';

    return [
      { 
        title: isDr ? "Designed" : (isCrm ? "Sales" : "Total Sales"), 
        value: showAmount ? formatCurrency(totalSales) : salesCount.toString(), 
        icon: ShoppingCart, iconColorClass: "text-sky-600", circleBgClass: "bg-sky-100 dark:bg-sky-500/20", isLoading: isLoadingData, currentUser, hideValue: hideFinancials 
      },
      { 
        title: "Invoice due", 
        value: showAmount ? formatCurrency(invoiceDue) : ordersWithDueCount.toString(), 
        icon: FileText, iconColorClass: "text-amber-600", circleBgClass: "bg-amber-100 dark:bg-amber-500/20", isLoading: isLoadingData, currentUser, hideValue: hideFinancials 
      },
      { 
        title: "Advance Paid", 
        value: showAmount ? formatCurrency(invoicePaid) : invoicePaidCount.toString(), 
        icon: Receipt, iconColorClass: "text-teal-600", circleBgClass: "bg-teal-100 dark:bg-teal-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'], currentUser, hideValue: hideFinancials 
      },
      { 
        title: "Invoice COD Paid", 
        value: showAmount ? formatCurrency(invoiceCodPaid) : invoiceCodPaidCount.toString(), 
        icon: Truck, iconColorClass: "text-cyan-600", circleBgClass: "bg-cyan-100 dark:bg-cyan-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser, hideValue: hideFinancials 
      },
      { 
        title: "Cash Collection", 
        value: showAmount ? formatCurrency(invoicePayment) : invoicePaymentCount.toString(), 
        icon: Receipt, iconColorClass: "text-indigo-600", circleBgClass: "bg-indigo-100 dark:bg-indigo-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser, hideValue: hideFinancials 
      },
      { 
        title: "Delivered", 
        value: deliveredCount, 
        icon: PackageCheck, iconColorClass: "text-green-600", circleBgClass: "bg-green-100 dark:bg-green-500/20", isLoading: isLoadingData, roles: ['CRM', 'DESIGNER_REPRESENTATIVE'], currentUser 
      },
      { 
        title: "Net", 
        value: showAmount ? formatCurrency(netValue) : salesCount.toString(), 
        icon: BadgeDollarSign, iconColorClass: "text-emerald-600", circleBgClass: "bg-emerald-100 dark:bg-emerald-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser, hideValue: hideFinancials 
      },
      { 
        title: "Repeat Sales", 
        value: showAmount ? formatCurrency(repeatSalesAmount) : repeatSalesCount.toString(), 
        icon: Undo2, iconColorClass: "text-rose-600", circleBgClass: "bg-rose-100 dark:bg-rose-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser, hideValue: hideFinancials 
      },
      { 
        title: "Total purchase", 
        value: showAmount ? formatCurrency(totalPurchase) : totalPurchaseCount.toString(), 
        icon: Download, iconColorClass: "text-sky-600", circleBgClass: "bg-sky-100 dark:bg-sky-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser, hideValue: hideFinancials 
      },
      { 
        title: "Purchase due", 
        value: showAmount ? formatCurrency(0) : "0", 
        icon: AlertTriangle, iconColorClass: "text-amber-600", circleBgClass: "bg-amber-100 dark:bg-amber-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser, hideValue: hideFinancials 
      },
      { 
        title: "Total Purchase Return", 
        value: showAmount ? formatCurrency(0) : "0", 
        icon: Redo2, iconColorClass: "text-rose-600", circleBgClass: "bg-rose-100 dark:bg-rose-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser, hideValue: hideFinancials },
      { 
        title: "Expense", 
        value: showAmount ? formatCurrency(totalExpenses) : totalExpensesCount.toString(), 
        icon: Receipt, iconColorClass: "text-rose-600", circleBgClass: "bg-rose-100 dark:bg-rose-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser, hideValue: hideFinancials 
      },
      { 
        title: "Gift's Value", 
        value: showAmount ? formatCurrency(giftValue) : giftCount.toString(), 
        icon: Gift, iconColorClass: "text-rose-600", circleBgClass: "bg-rose-100 dark:bg-rose-500/20", isLoading: isLoadingData, roles: ['SYSTEM_ADMIN', 'ADMIN'], currentUser, hideValue: hideFinancials 
      },
    ];
  }, [isCrm, isSystemAdmin, displayMode, salesCount, totalSales, ordersWithDueCount, invoiceDue, invoicePaid, invoicePaidCount, invoiceCodPaid, invoiceCodPaidCount, deliveredCount, netValue, totalPurchase, totalPurchaseCount, isLoadingData, currentUser, hideFinancials, invoicePayment, invoicePaymentCount, totalExpenses, totalExpensesCount, giftValue, giftCount]);

  const summaryCardData = useMemo(() => {
    return summaryCardDefinitions.filter(card => {
      if (!card.roles) return true;
      return card.roles.includes(currentUser?.role || '');
    });
  }, [currentUser, summaryCardDefinitions]);

  const selectedCrmName = useMemo(() => {
    if (selectedCrmId === 'all') return "All CRs";
    return allCrmUsers.find(u => u.id === selectedCrmId)?.name || "Select CR";
  }, [selectedCrmId, allCrmUsers]);

  const showAmount = isSystemAdmin && displayMode === 'amount';
  const chartDataKey = showAmount ? 'sales' : 'orders';

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
                      if (isNaN(hour)) return label;
                      if (hour === 0) return '12 AM';
                      if (hour === 12) return '12 PM';
                      if (hour < 12) return `${hour} AM`;
                      return `${hour - 12} PM`;
                    })()
                    : (() => {
                        try {
                          // Handle yyyy-MM or yyyy-MM-dd
                          const dateStr = (chartGranularity === 'monthly' && label.length === 7) ? `${label}-01` : label;
                          const date = parseISO(dateStr);
                          if (!isValid(date)) return label;
                          return format(date, chartGranularity === 'monthly' ? 'MMMM yyyy' : 'd MMM, yyyy');
                        } catch (e) {
                          return label;
                        }
                      })()
                ) : 'N/A'}
              </span>
            </div>
            {payload.map((p: any) => {
              let labelText = p.name || p.dataKey;
              if (p.dataKey === 'sales') {
                labelText = showAmount ? `Sales (${p.payload.orders} orders)` : 'Sales';
              } else if (p.dataKey === 'orders') {
                labelText = 'Sales Count';
              } else if (p.dataKey === 'deliveries') {
                labelText = 'Deliveries';
              }
              const formattedValue = p.dataKey === 'sales' ? formatCurrency(p.value as number) : p.value;
              return (
                <div key={p.dataKey} className="flex flex-col">
                  <span className="text-[0.70rem] uppercase text-muted-foreground" style={{ color: p.color }}>
                    {labelText}
                  </span>
                  <span className="font-bold" style={{ color: p.color }}>
                    {formattedValue}
                  </span>
                </div>
              );
            })}
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
    if (!feedbackToDelete || !feedbackToDelete.id) {
      toast({ title: "Error", description: "Invalid feedback ID.", variant: "destructive" });
      setFeedbackToDelete(null);
      return;
    }
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

  const NOTE_STYLES = [
    { bg: "bg-[#94b9e9] text-[#0f3460] border-[#7aa5e2] dark:bg-[#1e293b] dark:text-[#93c5fd] dark:border-blue-800", torn: "text-[#94b9e9] dark:text-[#1e293b]" },
    { bg: "bg-[#a8e6cf] text-[#054a29] border-[#8edbbd] dark:bg-[#064e3b] dark:text-[#6ee7b7] dark:border-emerald-800", torn: "text-[#a8e6cf] dark:text-[#064e3b]" },
    { bg: "bg-[#fce1d6] text-[#632c1c] border-[#f9cabb] dark:bg-[#7c2d12] dark:text-[#fdba74] dark:border-amber-800", torn: "text-[#fce1d6] dark:text-[#7c2d12]" },
    { bg: "bg-[#fca370] text-[#4a1c03] border-[#f88f54] dark:bg-[#7c2d12] dark:text-[#fed7aa] dark:border-amber-900", torn: "text-[#fca370] dark:text-[#7c2d12]" },
    { bg: "bg-[#ff8b94] text-[#4a0a10] border-[#ff7580] dark:bg-[#881337] dark:text-[#fecdd3] dark:border-rose-900", torn: "text-[#ff8b94] dark:text-[#881337]" },
    { bg: "bg-[#b8a7ea] text-[#2c1854] border-[#a592e3] dark:bg-[#4c1d95] dark:text-[#ddd6fe] dark:border-purple-900", torn: "text-[#b8a7ea] dark:text-[#4c1d95]" },
  ];

  const renderTodayScheduleCard = () => {
    return (
      <Card className="bg-card border shadow-xl rounded-2xl overflow-hidden group relative flex flex-col h-full min-h-[380px] sm:min-h-[420px] w-full">
        {/* SVG Graph Paper Background */}
        <div className="absolute inset-0 opacity-25 pointer-events-none z-0">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="mindmap-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.6" className="text-muted-foreground/60" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mindmap-grid)" />
          </svg>
        </div>

        <CardContent className="p-3 sm:p-4 pt-5 pb-3 sm:pb-4 relative z-10 flex-1 flex flex-col justify-start">
          {/* Permanent Top Header: Mind Map Center Yellow Node */}
          <div className="flex justify-center mb-1 relative z-10">
            <div className="relative">
              {/* Top Tape */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-white/85 dark:bg-white/40 border border-black/10 shadow-xs transform rotate-2 z-30 pointer-events-none rounded-xs" />
              
              {/* Main Yellow Center Node */}
              <div className="bg-[#fef08a] dark:bg-[#713f12] text-[#854d0e] dark:text-[#fef08a] border-t border-x border-[#fde047] dark:border-[#a16207] px-6 py-2.5 rounded-t-lg shadow-md text-center transform -rotate-1 relative z-20">
                <h3 className="font-extrabold text-sm sm:text-base tracking-widest uppercase font-serif">
                  TODAY SCHEDULE
                </h3>
                <p className="text-[11px] font-bold opacity-80 mt-0.5">
                  {todayScheduledLeads.length} Scheduled Appointment{todayScheduledLeads.length === 1 ? '' : 's'}
                </p>
              </div>

              {/* SVG Torn Edge Bottom */}
              <svg className="w-full h-3 shrink-0 -mt-0.5 relative z-20 block transform -rotate-1" viewBox="0 0 100 12" preserveAspectRatio="none">
                <path d="M0,0 L0,4 Q4,9 8,3 Q12,0 16,5 Q20,10 24,4 Q28,0 32,5 Q36,10 40,3 Q44,0 48,5 Q52,10 56,4 Q60,0 64,5 Q68,10 72,3 Q76,0 80,5 Q84,10 88,4 Q92,0 96,5 Q100,10 100,0 Z" fill="currentColor" className="text-[#fef08a] dark:text-[#713f12]" />
              </svg>
            </div>
          </div>

          {/* Hand-drawn Connecting SVG Arrows */}
          <div className="flex justify-center -mt-1 mb-2 relative z-10 pointer-events-none">
            <svg className="w-full max-w-[500px] h-9 text-foreground/80" viewBox="0 0 300 35" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <marker id="mindmap-arrowhead" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" className="text-foreground/80" />
                </marker>
              </defs>
              <path d="M 150 2 Q 100 15 45 28" markerEnd="url(#mindmap-arrowhead)" />
              <path d="M 150 2 L 150 28" markerEnd="url(#mindmap-arrowhead)" />
              <path d="M 150 2 Q 200 15 255 28" markerEnd="url(#mindmap-arrowhead)" />
            </svg>
          </div>

          {isLoadingData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          ) : todayScheduledLeads.length > 0 ? (
            <ScrollArea className="h-[280px] sm:h-[320px] w-full pr-2 -mr-2 sm:mr-0 sm:pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 pt-1 pb-1">
                {todayScheduledLeads.map((lead, index) => {
                  let formattedDate = '';
                  try {
                    const dt = parseISO(lead.schedule!);
                    if (isValid(dt)) {
                      formattedDate = format(dt, 'd MMM, yyyy');
                    }
                  } catch {}

                  const style = NOTE_STYLES[index % NOTE_STYLES.length];

                  return (
                    <motion.div
                      key={lead.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="relative group/note flex flex-col transition-all duration-200 hover:-translate-y-1 drop-shadow-sm hover:drop-shadow-md"
                    >
                      {/* Top Tape Strip */}
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 sm:w-16 h-4 bg-white/75 dark:bg-white/35 border border-black/10 shadow-xs transform -rotate-1 z-30 pointer-events-none rounded-xs backdrop-blur-2xs opacity-90" />

                      {/* Sticky Note Body */}
                      <div className={cn("p-3.5 sm:p-4 rounded-t-xl border-t border-x flex-1 flex flex-col justify-between relative z-10", style.bg)}>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wide truncate">
                              {lead.contactName}
                            </h4>
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-black/10 shrink-0">
                              #{String(index + 1).padStart(2, '0')}
                            </span>
                          </div>

                          {lead.businessName && (
                            <p className="text-[11px] font-bold opacity-85 truncate">
                              ({lead.businessName})
                            </p>
                          )}

                          <div className="flex flex-col gap-1 text-[11px] opacity-90 pt-1 font-semibold">
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 opacity-70 shrink-0" />
                                {lead.phone}
                              </span>
                            )}
                            {formattedDate && (
                              <span className="flex items-center gap-1 font-bold">
                                <CalendarDays className="h-3 w-3 opacity-70 shrink-0" />
                                {formattedDate}
                              </span>
                            )}
                          </div>

                          {lead.notes && (
                            <p className="text-[11px] italic opacity-85 line-clamp-2 pt-1.5 border-t border-black/10 mt-1.5">
                              "{lead.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* SVG Torn Edge Bottom (Snug Overlap -mt-1) */}
                      <svg className="w-full h-3 shrink-0 -mt-1 relative z-10 block" viewBox="0 0 100 12" preserveAspectRatio="none">
                        <path d="M0,0 L0,4 Q4,9 8,3 Q12,0 16,5 Q20,10 24,4 Q28,0 32,5 Q36,10 40,3 Q44,0 48,5 Q52,10 56,4 Q60,0 64,5 Q68,10 72,3 Q76,0 80,5 Q84,10 88,4 Q92,0 96,5 Q100,10 100,0 Z" fill="currentColor" className={style.torn} />
                      </svg>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/60 text-center my-auto relative z-10">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded-2xl mb-2.5 border border-amber-300 dark:border-amber-700 shadow-xs">
                <CalendarDays className="h-8 w-8 opacity-80" />
              </div>
              <p className="font-bold text-sm text-foreground">No appointments scheduled for today</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                Add schedules to leads in your Pipeline to pin them here.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3 text-xs rounded-lg shadow-xs border-border/60 hover:bg-primary hover:text-primary-foreground">
                <Link href="/pipeline">
                  Go to Pipeline
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderTrafficSourcesCard = () => {
    return (
      <Card className={cn("shadow-xl bg-card rounded-2xl sm:rounded-lg border-none sm:border overflow-hidden flex flex-col w-full", isCrm && "h-full min-h-[380px] sm:min-h-[420px]")}>
        <CardHeader className="bg-muted/5 sm:bg-transparent px-4 py-3 sm:px-6 sm:py-4 shrink-0">
          <CardTitle className="flex items-center text-lg sm:text-xl font-bold tracking-tight text-foreground">
            <div className="p-2 bg-primary/10 rounded-lg mr-3 sm:hidden">
              <PieChartIcon className="h-5 w-5 text-primary" />
            </div>
            <span className="hidden sm:inline-flex items-center">
              <PieChartIcon className="mr-2 h-6 w-6 text-primary" />
            </span>
            Traffic Sources
          </CardTitle>
        </CardHeader>
        <CardContent className={cn("p-2 sm:p-4 flex flex-col justify-center min-h-0", isCrm ? "flex-1 h-[300px] sm:h-[340px]" : "h-[220px] sm:h-[250px]")}>
          {isLoadingContent ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className={cn(isCrm ? "h-64 w-64" : "h-36 w-36", "rounded-full")} />
            </div>
          ) : trafficSourcesData.length > 0 ? (
            <ChartContainer config={trafficSourcesChartConfig} className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                  <Pie 
                    data={trafficSourcesData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={isCrm ? 70 : 50} 
                    outerRadius={isCrm ? 90 : 65} 
                    paddingAngle={4}
                    cornerRadius={6}
                    strokeWidth={0}
                  >
                    <RechartsLabel
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          const totalLeads = trafficSourcesData.reduce((acc, curr) => acc + curr.value, 0);
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) - (isCrm ? 8 : 4)}
                                className={cn("fill-foreground font-bold font-mono tracking-tight", isCrm ? "text-2xl" : "text-xl")}
                              >
                                {totalLeads}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + (isCrm ? 14 : 12)}
                                className={cn("fill-muted-foreground uppercase tracking-widest font-semibold", isCrm ? "text-[10px]" : "text-[9px]")}
                              >
                                Total Leads
                              </tspan>
                            </text>
                          );
                        }
                        return null;
                      }}
                      position="center"
                    />
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
    );
  };

  const renderRecentFeedbackCard = () => {
    return (
      <Card className="bg-card/95 border-none sm:border border-border/30 shadow-xl sm:shadow-lg rounded-2xl sm:rounded-lg overflow-hidden group relative">
        {/* Premium background highlight for mobile */}
        <div className="absolute inset-0 opacity-[0.02] sm:hidden bg-gradient-to-br from-primary via-transparent to-primary pointer-events-none" />

        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-6 relative z-10">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2.5 bg-primary/10 rounded-xl sm:hidden">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
                <span className="hidden sm:inline"><MessageSquare className="mr-2 h-6 w-6 text-primary" /></span>
                Recent Feedback
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm line-clamp-1 sm:line-clamp-none">Latest client feedback from tracking pages.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-6 relative z-10">
          {isLoadingContent ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : recentFeedback.length > 0 ? (
            <ScrollArea className="h-[400px] pr-3 -mr-3 sm:mr-0 sm:pr-3">
              <div className="space-y-0 sm:space-y-4">
                {recentFeedback.map((feedback, index) => {
                  const crmUser = userMap.get(feedback.crmUserId || '');
                  return (
                    <div
                      key={feedback.id}
                      className={cn(
                        "py-5 sm:p-4 transition-colors",
                        "sm:border sm:rounded-lg sm:bg-secondary/30",
                        "border-none bg-transparent rounded-none",
                        index !== recentFeedback.length - 1 && "border-b border-border/40 sm:border-none"
                      )}
                      onDoubleClick={canDeleteFeedback ? () => setFeedbackToDelete(feedback) : undefined}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 sm:h-10 sm:w-10 border-2 border-primary/10">
                            <AvatarImage src={crmUser?.avatarUrl || undefined} alt={crmUser?.name} />
                            <AvatarFallback className="bg-primary/5 text-primary text-xs">{getInitials(crmUser?.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold sm:font-semibold text-foreground text-sm sm:text-base leading-tight">
                              {feedback.companyName}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Order ID: {feedback.orderId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500 scale-90 sm:scale-100 origin-right">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn("h-3.5 w-3.5", i < feedback.rating ? "fill-amber-400 text-amber-400" : "fill-muted stroke-muted-foreground/30")}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 relative">
                        <p className="text-sm text-foreground/80 sm:text-foreground/90 italic border-l-2 border-primary/40 pl-4 py-0.5 leading-relaxed">
                          {renderFeedbackText(feedback.text)}
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-3">
                        <p className="text-[10px] text-muted-foreground/70 uppercase tracking-tighter">
                          {format(parseISO(feedback.submittedAt), "d MMM, yyyy")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground/50">
              <div className="p-4 bg-muted/20 rounded-full mb-4">
                <MessageSquare className="h-10 w-10 opacity-20" />
              </div>
              <p className="font-medium text-sm">No feedback yet.</p>
            </div>
          )}
        </CardContent>

        {/* Decorative background icon for mobile */}
        <div className="absolute -right-8 -bottom-8 opacity-[0.03] sm:hidden pointer-events-none transform rotate-12 scale-150">
          <MessageSquare className="h-32 w-32 text-primary" />
        </div>
      </Card>
    );
  };

  const renderAreaLeaderboardCard = () => {
    return (
      <Card className="bg-card/95 border-none sm:border border-border/30 shadow-xl sm:shadow-lg rounded-2xl sm:rounded-lg overflow-hidden group relative">
        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-6 relative z-10 flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2 bg-primary/10 rounded-lg sm:hidden">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
                <span className="hidden sm:inline"><MapPin className="mr-2 h-5 w-5 text-primary" /></span>
                Division Leaderboard
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Order distribution across divisions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[400px] p-2 sm:p-4">
          {isLoadingContent ? (
            <Skeleton className="h-[360px] w-full" />
          ) : areaLeaderboardData.length > 0 ? (
            <ChartContainer config={topSalesAreaChartConfig} className="w-full h-full">
              <RechartsBarChart data={areaLeaderboardData} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                <YAxis dataKey="name" type="category" tick={<LeftAlignedTick />} width={145} stroke="hsl(var(--border))" axisLine={false} tickLine={false} />
                <XAxis type="number" hide />
                <ChartTooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-2.5 shadow-sm">
                          <div className="grid grid-cols-1 gap-1">
                            <span className="text-sm font-bold text-foreground">{data.name} Division</span>
                            <span className="text-xs text-muted-foreground">
                              Orders: {data.orderCount} ({data.percentage.toFixed(1)}%)
                            </span>
                            {showAmount && data.totalSales > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Sales: {formatCurrency(data.totalSales)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="percentage" fill="var(--color-count)" radius={[0, 8, 8, 0]} barSize={16}>
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
              <div className="flex flex-col items-center">
                <div className="p-3.5 bg-muted/20 rounded-full mb-3">
                  <MapPin className="h-8 w-8 opacity-25" />
                </div>
                <p className="text-sm font-medium">No division order data available.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <div className="space-y-6 px-1.5 py-4 sm:p-6 lg:p-8 custom-scrollbar-hidden print:p-0">
        <div className="bg-gradient-to-r from-[hsl(var(--sidebar-background))] to-[hsl(var(--primary))] text-primary-foreground p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-xl print:hidden">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold flex items-center tracking-tight">
            Welcome {formatDisplayName(currentUser?.name)}
            <Hand className="ml-1.5 sm:ml-2 h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 transform rotate-[20deg] text-yellow-300 shrink-0" />
          </h1>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-primary-foreground/90 mt-0.5 sm:mt-1">
            Here&apos;s an overview of your business activity.
          </p>
        </div>

        {!isDesignerRepOrLrOrCo && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 print:hidden">
              <Card className="shadow-sm bg-card rounded-xl sm:rounded-lg">
                <CardContent className="p-2.5 sm:p-4 flex flex-col sm:flex-row items-center sm:justify-between space-y-2 sm:space-y-0 text-center sm:text-left">
                  <div className="flex items-center text-[10px] sm:text-sm text-muted-foreground font-semibold sm:font-normal uppercase sm:capitalize tracking-wider sm:tracking-normal">
                    <Users className="h-3.5 w-3.5 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-primary/80" />
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
                    <Button variant="outline" size="sm" className="text-[10px] sm:text-xs h-8 sm:h-10 w-full sm:w-auto" disabled>
                      Your Data
                    </Button>
                  )}
                </CardContent>
              </Card>
              <Card className="shadow-sm bg-card rounded-xl sm:rounded-lg">
                <CardContent className="p-2.5 sm:p-4 flex flex-col sm:flex-row items-center sm:justify-between space-y-2 sm:space-y-0 text-center sm:text-left">
                  <div className="flex items-center text-[10px] sm:text-sm text-muted-foreground font-semibold sm:font-normal uppercase sm:capitalize tracking-wider sm:tracking-normal">
                    <CalendarDays className="h-3.5 w-3.5 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-primary/80" />
                    <span>Filter</span>
                  </div>
                  {selectedDateRange ? (
                    <DateRangePicker initialRange={selectedDateRange} onDateRangeChange={handleDateRangeChange} />
                  ) : (
                    <Skeleton className="h-10 w-full sm:w-[260px]" />
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 print:hidden">
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
                  hideValue={card.hideValue}
                />
              ))}
            </div>

            {currentUser?.role === 'CRM' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start print:hidden">
                {renderTrafficSourcesCard()}
                {renderTodayScheduleCard()}
              </div>
            )}


            <div className="flex flex-col gap-6 print:hidden">
              {currentUser?.role !== 'CRM' && (
                <Card className="shadow-xl bg-card rounded-2xl sm:rounded-lg border-none sm:border overflow-hidden w-full">
                  <CardHeader className="border-b bg-muted/5 sm:bg-transparent px-4 py-3 sm:px-6 sm:py-4">
                    <CardTitle className="flex items-center text-lg sm:text-xl font-bold tracking-tight text-foreground">
                      <div className="p-2 bg-primary/10 rounded-lg mr-3 sm:hidden">
                        <BarChartBig className="h-5 w-5 text-primary" />
                      </div>
                      <span className="hidden sm:inline-flex items-center">
                        <BarChartBig className="mr-2 h-6 w-6 text-primary" />
                      </span>
                      Sales ({currentDateRangeLabel})
                      {currentUser?.role === 'CRM' && <span className="ml-2 text-xs sm:text-sm font-normal text-muted-foreground">(Your Sales)</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[280px] sm:h-[350px] p-1.5 sm:p-4 mt-2">
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
                              if (chartGranularity === 'monthly') {
                                try {
                                  const dateStr = value.length === 7 ? `${value}-01` : value;
                                  const date = parseISO(dateStr);
                                  if (!isValid(date)) return value;
                                  return format(date, 'MMM');
                                } catch (e) { return value; }
                              }
                              try {
                                const date = parseISO(value);
                                if (!isValid(date)) return value;
                                return format(date, 'd MMM');
                              } catch (e) { return value; }
                            }}
                            className="text-xs"
                            interval={chartGranularity === 'hourly' && salesChartData.length > 12 ? 'preserveStartEnd' : undefined}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => showAmount ? `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : value}
                            className="text-xs"
                          />
                          <ChartTooltip
                            cursor={false}
                            content={<CustomTooltipContent />}
                          />
                          <RechartsLegend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ padding: '10px' }} />
                          <Line
                            dataKey={chartDataKey}
                            name={chartDataKey === 'sales' ? 'Sales (BDT)' : 'orders'}
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
                          {!showAmount && (
                            <Line
                              dataKey="deliveries"
                              name="deliveries"
                              type="monotone"
                              stroke="var(--color-deliveries)"
                              strokeWidth={2}
                              dot={{
                                r: 4,
                                fill: "var(--color-deliveries)",
                                strokeWidth: 2,
                                stroke: "hsl(var(--background))",
                              }}
                              activeDot={{
                                r: 6,
                                fill: "var(--color-deliveries)",
                                strokeWidth: 2,
                                stroke: "hsl(var(--background))",
                              }}
                            />
                          )}
                        </RechartsLineChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {currentUser?.role !== 'CRM' && renderTrafficSourcesCard()}

                {canSeeSystemAdminCharts && (
                  <Card className="shadow-xl bg-card rounded-2xl sm:rounded-lg border-none sm:border overflow-hidden">
                    <CardHeader className="bg-muted/5 sm:bg-transparent px-4 py-3 sm:px-6 sm:py-4">
                      <CardTitle className="flex items-center text-lg sm:text-xl font-bold tracking-tight text-foreground">
                        <div className="p-2 bg-primary/10 rounded-lg mr-3 sm:hidden">
                          <Landmark className="h-5 w-5 text-primary" />
                        </div>
                        <span className="hidden sm:inline-flex items-center">
                          <Landmark className="mr-2 h-6 w-6 text-primary" />
                        </span>
                        Payments
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[220px] sm:h-[250px] p-2 sm:p-4">
                      {isLoadingContent ? (
                        <Skeleton className="h-[200px] w-full" />
                      ) : paymentMethodData.length > 0 ? (
                        <ChartContainer config={paymentMethodsChartConfig} className="w-full h-full">
                          <RechartsBarChart data={paymentMethodData} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                            <YAxis dataKey="name" type="category" tick={<LeftAlignedTick />} width={145} stroke="hsl(var(--border))" axisLine={false} tickLine={false} />
                            <XAxis type="number" hide />
                            <ChartTooltip
                              cursor={{ fill: 'hsl(var(--muted))' }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                      <div className="grid grid-cols-1 gap-1.5">
                                        <span className="text-sm font-bold text-foreground">{payload[0].payload.name}</span>
                                        {showAmount ? (
                                          <span className="text-xs text-muted-foreground">Amount: {formatCurrency(payload[0].payload.amount)}</span>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">Count: {payload[0].payload.count}</span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="percentage" fill="var(--color-count)" radius={[0, 8, 8, 0]} barSize={22}>
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

                {currentUser?.role !== 'CRM' && renderRecentFeedbackCard()}
                {currentUser?.role !== 'CRM' && renderAreaLeaderboardCard()}
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
              allUsers={allUsers.filter(u => !u.isBanned)}
              specificUserOptions={specificUserOptions}
            />
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 print:hidden">
          {canSeeSystemAdminCharts && (
            <SalesPerformanceClient
              allOrders={allYearOrders.length > 0 ? allYearOrders : allOrders}
              allCrmUsers={allUsers}
              displayMode={displayMode}
            />
          )}
          {canSeeAdminCharts && (
            <OrderAnalysisClient allOrders={allYearOrders.length > 0 ? allYearOrders : allOrders} />
          )}
        </div>



        {!isDesignerRepOrLrOrCo && (
          <div className={cn("grid grid-cols-1 gap-6 mt-6 print:hidden", currentUser?.role !== 'DESIGNER_REPRESENTATIVE' && currentUser?.role !== 'VENDOR' && currentUser?.role !== 'LR' ? 'xl:grid-cols-2' : 'xl:grid-cols-1')}>

            <Card className="bg-card/95 border-none sm:border border-border/30 shadow-xl sm:shadow-lg rounded-2xl sm:rounded-lg overflow-hidden group relative">
              {/* Premium background highlight for mobile */}
              <div className="absolute inset-0 opacity-[0.02] sm:hidden bg-gradient-to-br from-primary via-transparent to-primary pointer-events-none" />

              <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-6 relative z-10">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="p-2.5 bg-primary/10 rounded-xl sm:hidden">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
                      <span className="hidden sm:inline"><Briefcase className="mr-2 h-6 w-6 text-primary" /></span>
                      Project Overview
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm line-clamp-1 sm:line-clamp-none">Project distribution by status for the selected period.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-2 sm:pt-6 relative z-10">
                <StatusTimeline
                  counts={projectCounts}
                  config={visibleProjectStatusDisplayConfig}
                  isLoading={isLoadingContent}
                  title="Project Status"
                />
              </CardContent>
              {/* Decorative background icon for mobile */}
              <div className="absolute -right-8 -bottom-8 opacity-[0.03] sm:hidden pointer-events-none transform rotate-12 scale-150">
                <Briefcase className="h-32 w-32 text-primary" />
              </div>
            </Card>

            {currentUser?.role !== 'DESIGNER_REPRESENTATIVE' && currentUser?.role !== 'VENDOR' && currentUser?.role !== 'LR' && (
              <Card className="bg-card/95 border-none sm:border border-border/30 shadow-xl sm:shadow-lg rounded-2xl sm:rounded-lg overflow-hidden group relative">
                {/* Premium background highlight for mobile */}
                <div className="absolute inset-0 opacity-[0.02] sm:hidden bg-gradient-to-br from-primary via-transparent to-primary pointer-events-none" />

                <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-6 relative z-10">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="p-2.5 bg-primary/10 rounded-xl sm:hidden">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
                        <span className="hidden sm:inline"><Users className="mr-2 h-6 w-6 text-primary" /></span>
                        Pipeline Overview
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm line-clamp-1 sm:line-clamp-none">Lead distribution by category for the selected period.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-2 sm:pt-6 relative z-10">
                  <StatusTimeline
                    counts={leadCategoryCounts}
                    config={ALL_LEAD_CATEGORIES_CONFIG}
                    isLoading={isLoadingContent}
                    title="Lead Category"
                  />
                </CardContent>
                {/* Decorative background icon for mobile */}
                <div className="absolute -right-8 -bottom-8 opacity-[0.03] sm:hidden pointer-events-none transform rotate-12 scale-150">
                  <Users className="h-32 w-32 text-primary" />
                </div>
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
                {isDeletingFeedback ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
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
    const userData = donePayload?.payload?.userData || {};

    let userBreakdown: { user: User, done: number }[] = [];

    if (currentUser) {
      if (currentUser.role === 'SYSTEM_ADMIN' || currentUser.role === 'ADMIN') {
        userBreakdown = Object.entries(userData)
          .map(([userId, data]: [string, any]) => ({ user: userMap.get(userId), done: data.done }))
          .filter(item => item.user && item.done >= 0)
          .sort((a, b) => b.done - a.done) as { user: User, done: number }[];
      } else {
        userBreakdown = Object.entries(userData)
          .filter(([userId, data]: [string, any]) => data.role === currentUser.role && data.done >= 0)
          .map(([userId, data]: [string, any]) => ({ user: userMap.get(userId), done: data.done }))
          .filter(item => item.user)
          .sort((a, b) => b.done - a.done) as { user: User, done: number }[];
      }
    }

    return (
      <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[220px]">
        <div className="grid grid-cols-1 gap-1.5">
          <p className="font-semibold text-foreground">{label}</p>
          {donePayload && <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: donePayload.color }}></div>
            <span className="text-sm text-muted-foreground">Tasks Done:</span>
            <span className="text-sm font-medium ml-auto">{donePayload.value}</span>
          </div>}
          {targetPayload && <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: targetPayload.color }}></div>
            <span className="text-sm text-muted-foreground">Target:</span>
            <span className="text-sm font-medium ml-auto">{targetPayload.value}</span>
          </div>}
        </div>
        {userBreakdown.length > 0 && (
          <>
            <div className="border-t border-dashed my-1.5"></div>
            <p className="font-semibold text-xs text-muted-foreground mt-1">Contributors:</p>
            <ScrollArea className="max-h-32 pr-2 -mr-2">
              <div className="space-y-1.5 mt-1">
                {userBreakdown.map(({ user, done }) => (
                  <div key={user.id} className="flex items-center gap-2 text-xs">
                    <Avatar className="h-5 w-5 border">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                      <AvatarFallback className="text-[9px] bg-muted">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground truncate flex-1">{user.name}</span>
                    <span className="font-medium text-foreground">{done} tasks</span>
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


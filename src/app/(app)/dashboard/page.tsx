
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
  Loader2
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import type { TrackingLink, OrderItem, ServiceModelItem, User } from '@/types'; 
import { getOrders } from '@/lib/order-service';
import { getModels } from '@/lib/service-options-service'; 
import { useToast } from '@/hooks/use-toast';
import { getUsers } from '@/lib/user-service';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const chartConfig = {
  sales: {
    label: "Total Sales (BDT)",
    color: "hsl(var(--chart-1))",
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

export default function DashboardPage() {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [allOrders, setAllOrders] = useState<TrackingLink[]>([]);
  const [allModels, setAllModels] = useState<ServiceModelItem[]>([]); 
  const [allCrmUsers, setAllCrmUsers] = useState<User[]>([]);
  
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const [currentDateRangeLabel, setCurrentDateRangeLabel] = useState("Last 30 Days");
  const [selectedPredefinedValue, setSelectedPredefinedValue] = useState<PredefinedRange | "custom" | null>("last30Days");
  const [chartGranularity, setChartGranularity] = useState<'daily' | 'hourly'>('daily');
  const [selectedCrmId, setSelectedCrmId] = useState<string>('all');


  const [totalSales, setTotalSales] = useState(formatCurrency(0));
  const [invoiceDue, setInvoiceDue] = useState(formatCurrency(0));
  const [salesChartData, setSalesChartData] = useState<Array<{ date: string; sales: number }>>([]);
  const [totalPurchase, setTotalPurchase] = useState(formatCurrency(0)); 

  const [netValue, setNetValue] = useState(formatCurrency(0));
  const [totalSellReturn, setTotalSellReturn] = useState(formatCurrency(0));
  const [purchaseDue, setPurchaseDue] = useState(formatCurrency(0));
  const [totalPurchaseReturn, setTotalPurchaseReturn] = useState(formatCurrency(0));
  const [expense, setExpense] = useState(formatCurrency(0));

  useEffect(() => {
    if (currentUser?.role === 'LR') {
      router.replace('/projects');
    }
  }, [currentUser, router]);

  useEffect(() => {
    setSelectedDateRange({
      from: subDays(new Date(), 29), 
      to: new Date(),
    });
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!currentUser || currentUser.role === 'LR') {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const [fetchedOrders, fetchedModels, fetchedUsers] = await Promise.all([ 
        getOrders(),
        getModels(),
        getUsers(),
      ]);
      setAllOrders(fetchedOrders);
      setAllModels(fetchedModels); 
      setAllCrmUsers(fetchedUsers.filter(u => u.role === 'CRM'));
    } catch (error) {
      console.error("Failed to fetch orders or models for dashboard:", error);
      toast({ title: "Error", description: "Could not load dashboard data.", variant: "destructive" });
      setAllOrders([]);
      setAllModels([]);
      setAllCrmUsers([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'LR') {
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
      const hourlySales = new Map<number, number>(); 
      for (let i = 0; i < 24; i++) {
        hourlySales.set(i, 0); 
      }
      filteredOrders.forEach(order => {
        if (order.createdAt) {
          try {
            const orderDate = parseISO(order.createdAt);
            const hour = getHours(orderDate);
            const orderTotalForChart = order.orderItems.reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0);
            hourlySales.set(hour, (hourlySales.get(hour) || 0) + orderTotalForChart);
          } catch (e) {
            console.error("Error processing order for hourly chart:", order.id, e);
          }
        }
      });
      const chartData = Array.from(hourlySales.entries())
        .map(([hour, sales]) => ({ date: hour.toString(), sales })) 
        .sort((a, b) => parseInt(a.date) - parseInt(b.date));
      setSalesChartData(chartData);
    } else if (selectedDateRange?.from && selectedDateRange?.to) {
      setChartGranularity('daily');
      const dailySales = new Map<string, number>();
      let tempDatePointerForInit = new Date(selectedDateRange.from);
      tempDatePointerForInit.setHours(0,0,0,0);
      const endDateForInit = new Date(selectedDateRange.to); 
      endDateForInit.setHours(23,59,59,999);
      
      while (tempDatePointerForInit <= endDateForInit) { 
          dailySales.set(format(tempDatePointerForInit, 'yyyy-MM-dd'), 0);
          tempDatePointerForInit = addDays(tempDatePointerForInit, 1);
      }
      filteredOrders.forEach(order => {
        if (order.createdAt) {
          try {
            const orderDate = parseISO(order.createdAt);
            orderDate.setHours(0,0,0,0); 
            const orderDateStr = format(orderDate, 'yyyy-MM-dd');
            if (dailySales.has(orderDateStr)) {
              const orderTotalForChart = order.orderItems.reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0);
              dailySales.set(orderDateStr, (dailySales.get(orderDateStr) || 0) + orderTotalForChart);
            }
          } catch (e) {
            console.error("Error processing order for daily chart:", order.id, e);
          }
        }
      });
      const chartData = Array.from(dailySales.entries())
        .map(([date, sales]) => ({ date, sales }))
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
    setSelectedPredefined(predefined);
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


  if (isAuthLoading || currentUser?.role === 'LR') {
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
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex flex-col">
                 <span className="text-[0.70rem] uppercase text-muted-foreground" style={{ color: entry.color }}>
                  {entry.name === 'sales' ? 'Sales' : entry.name}
                </span>
                <span
                  className="font-bold"
                  style={{ color: entry.color }}
                >
                  {formatCurrency(entry.value as number)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const isLoadingContent = isLoadingData || !selectedDateRange;

  const canSelectCR = currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="bg-gradient-to-r from-[hsl(var(--sidebar-background))] to-[hsl(var(--primary))] text-primary-foreground p-6 sm:p-8 rounded-xl shadow-xl">
        <h1 className="text-3xl sm:text-4xl font-bold flex items-center">
          Welcome {currentUser?.name.split(' ')[0] || 'User'}
          <Hand className="ml-2 h-8 w-8 transform rotate-[20deg] text-yellow-300" />
        </h1>
        <p className="text-md sm:text-lg text-primary-foreground/90 mt-1">
          Here's an overview of your business activity.
        </p>
      </div>

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

      <Card className="shadow-xl bg-card">
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
                  right: 10,
                  left: -25, 
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
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: '10px'}} />
                <Line
                  dataKey="sales"
                  name="Sales" 
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
    </div>
  );
}

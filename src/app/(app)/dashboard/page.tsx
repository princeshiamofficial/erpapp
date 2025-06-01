
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import type { DateRange } from "react-day-picker";
import { format, isWithinInterval, parseISO, subDays, addDays } from "date-fns"; // Added addDays
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
  MapPin,
  CalendarDays, 
  ChevronDown
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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { TrackingLink, OrderItem } from '@/types'; 
import { getOrders } from '@/lib/order-service';
import { useToast } from '@/hooks/use-toast';

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
  isLoading?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon: Icon, iconColorClass = "text-primary", isLoading }) => {
  if (isLoading) {
    return (
      <Card className="shadow-md hover:shadow-lg transition-shadow bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground"><Skeleton className="h-4 w-24" /></CardTitle>
          <Skeleton className="h-8 w-8 rounded-full" />
        </CardHeader>
        <CardContent className="pb-4 px-4">
          <div className="text-2xl font-bold"><Skeleton className="h-8 w-32" /></div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-1.5 bg-primary/10 rounded-md ${iconColorClass} opacity-80`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="pb-4 px-4">
        <div className="text-2xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
};

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [allOrders, setAllOrders] = useState<TrackingLink[]>([]);
  
  const defaultDateRange: DateRange = {
    from: subDays(new Date(), 29), 
    to: new Date(),
  };
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(defaultDateRange);
  const [currentDateRangeLabel, setCurrentDateRangeLabel] = useState("Last 30 Days");

  const [totalSales, setTotalSales] = useState(formatCurrency(0));
  const [invoiceDue, setInvoiceDue] = useState(formatCurrency(0));
  const [salesChartData, setSalesChartData] = useState<Array<{ date: string; sales: number }>>([]);

  // Mock data states for other cards (unchanged)
  const [netValue, setNetValue] = useState(formatCurrency(0));
  const [totalSellReturn, setTotalSellReturn] = useState(formatCurrency(0));
  const [totalPurchase, setTotalPurchase] = useState(formatCurrency(0));
  const [purchaseDue, setPurchaseDue] = useState(formatCurrency(0));
  const [totalPurchaseReturn, setTotalPurchaseReturn] = useState(formatCurrency(0));
  const [expense, setExpense] = useState(formatCurrency(0));

  const fetchDashboardData = useCallback(async () => {
    if (!currentUser) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const fetchedOrders = await getOrders();
      setAllOrders(fetchedOrders);
    } catch (error) {
      console.error("Failed to fetch orders for dashboard:", error);
      toast({ title: "Error", description: "Could not load order data.", variant: "destructive" });
      setAllOrders([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const filteredOrders = useMemo(() => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) return [];
    return allOrders.filter(order => 
      order.createdAt && isWithinInterval(parseISO(order.createdAt), {
        start: selectedDateRange.from as Date, 
        end: selectedDateRange.to as Date
      })
    );
  }, [allOrders, selectedDateRange]);

  useEffect(() => {
    if (isLoadingData) return;

    // Calculate Total Sales and Invoice Due from filteredOrders
    let currentTotalSales = 0;
    let currentTotalAdvance = 0;

    filteredOrders.forEach(order => {
      if (Array.isArray(order.orderItems)) {
        order.orderItems.forEach((item: OrderItem) => {
          currentTotalSales += item.lineItemTotalPrice || 0;
        });
      }
      currentTotalAdvance += order.advancePayment || 0;
    });
    
    setTotalSales(formatCurrency(currentTotalSales));
    setInvoiceDue(formatCurrency(currentTotalSales - currentTotalAdvance));

    // Generate Sales Chart Data
    if (selectedDateRange?.from && selectedDateRange?.to) {
      const dailySales = new Map<string, number>();
      let currentDatePointer = new Date(selectedDateRange.from);
      const toDate = new Date(selectedDateRange.to);

      while (currentDatePointer <= toDate) {
        dailySales.set(format(currentDatePointer, 'yyyy-MM-dd'), 0);
        currentDatePointer = addDays(currentDatePointer, 1);
      }

      filteredOrders.forEach(order => {
        if (order.createdAt) {
          try {
            const orderDateStr = format(parseISO(order.createdAt), 'yyyy-MM-dd');
            if (dailySales.has(orderDateStr)) {
              const orderTotalForChart = order.orderItems.reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0);
              dailySales.set(orderDateStr, (dailySales.get(orderDateStr) || 0) + orderTotalForChart);
            }
          } catch (e) {
            console.error("Error processing order for chart:", order.id, e);
          }
        }
      });
      
      const chartData = Array.from(dailySales.entries())
        .map(([date, sales]) => ({ date, sales }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setSalesChartData(chartData);
    } else {
      setSalesChartData([]);
    }

  }, [isLoadingData, filteredOrders, selectedDateRange]);


  const handleDateRangeChange = (range: DateRange | undefined, label: string) => {
    setSelectedDateRange(range);
    setCurrentDateRangeLabel(label);
  };

  const summaryCardData = useMemo(() => [
    { title: "Total Sales", value: totalSales, icon: ShoppingCart, isLoading: isLoadingData },
    { title: "Net", value: netValue, icon: BadgeDollarSign, isLoading: isLoadingData },
    { title: "Invoice due", value: invoiceDue, icon: FileText, isLoading: isLoadingData },
    { title: "Total Sell Return", value: totalSellReturn, icon: Undo2, isLoading: isLoadingData },
    { title: "Total purchase", value: totalPurchase, icon: Download, isLoading: isLoadingData },
    { title: "Purchase due", value: purchaseDue, icon: AlertTriangle, isLoading: isLoadingData },
    { title: "Total Purchase Return", value: totalPurchaseReturn, icon: Redo2, isLoading: isLoadingData },
    { title: "Expense", value: expense, icon: Receipt, isLoading: isLoadingData },
  ], [isLoadingData, totalSales, netValue, invoiceDue, totalSellReturn, totalPurchase, purchaseDue, totalPurchaseReturn, expense]);


  if (!currentUser && !isLoadingData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    );
  }
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Date
              </span>
              <span className="font-bold text-muted-foreground">
                {label ? format(parseISO(label), 'd MMM, yyyy') : 'N/A'}
              </span>
            </div>
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex flex-col">
                 <span className="text-[0.70rem] uppercase text-muted-foreground">
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

  return (
    <div className="space-y-6 p-1 sm:p-0">
      <div className="bg-gradient-to-r from-[hsl(var(--sidebar-background))] to-[hsl(var(--primary))] text-primary-foreground p-6 sm:p-8 rounded-xl shadow-xl">
        <h1 className="text-3xl sm:text-4xl font-bold flex items-center">
          Welcome {currentUser?.name.split(' ')[0] || 'User'}
          <Hand className="ml-2 h-8 w-8 transform rotate-[20deg] text-yellow-300" />
        </h1>
        <p className="text-md sm:text-lg text-primary-foreground/90 mt-1">
          Here's an overview of your business activity.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="shadow-sm bg-card">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-5 w-5 mr-2 text-primary/80" />
              <span>Select Location</span>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-9 sm:h-10" disabled>
              All Locations <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-70" />
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <div className="flex items-center text-sm text-muted-foreground">
              <CalendarDays className="h-5 w-5 mr-2 text-primary/80" />
              <span>Filter by Date</span>
            </div>
            <DateRangePicker initialRange={defaultDateRange} onDateRangeChange={handleDateRangeChange} />
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {summaryCardData.map((card) => (
          <SummaryCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            isLoading={card.isLoading}
          />
        ))}
      </div>

      <Card className="shadow-xl bg-card">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-foreground">
            <BarChartBig className="mr-2 h-6 w-6 text-primary" />
            Sales ({currentDateRangeLabel})
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] sm:h-[350px] p-2 sm:p-4">
          {isLoadingData ? (
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
                  tickFormatter={(value) => format(parseISO(value), 'd MMM')} 
                  className="text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `৳${Number(value).toLocaleString('en-US', {minimumFractionDigits:0, maximumFractionDigits:0})}`}
                  className="text-xs"
                />
                <ChartTooltip
                  cursor={false}
                  content={<CustomTooltip />}
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


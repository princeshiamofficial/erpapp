
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import type { DateRange } from "react-day-picker";
import { format, isWithinInterval, parseISO, subDays } from "date-fns";
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
import type { TrackingLink, OrderItem } from '@/types'; // Ensure OrderItem is imported
import { getOrders } from '@/lib/order-service';
import { useToast } from '@/hooks/use-toast';

const mockSalesData = [
  { date: '2 May 2025', sales: 0 }, { date: '3 May 2025', sales: 0 },
  { date: '4 May 2025', sales: 0 }, { date: '5 May 2025', sales: 0 },
  { date: '6 May 2025', sales: 0 }, { date: '7 May 2025', sales: 0 },
  { date: '8 May 2025', sales: 0 }, { date: '9 May 2025', sales: 0 },
  { date: '10 May 2025', sales: 0 }, { date: '11 May 2025', sales: 0 },
  { date: '12 May 2025', sales: 0 }, { date: '13 May 2025', sales: 0 },
  { date: '14 May 2025', sales: 0 }, { date: '15 May 2025', sales: 0 },
  { date: '16 May 2025', sales: 0 }, { date: '17 May 2025', sales: 0 },
  { date: '18 May 2025', sales: 0 }, { date: '19 May 2025', sales: 0 },
  { date: '20 May 2025', sales: 0 }, { date: '21 May 2025', sales: 0 },
  { date: '22 May 2025', sales: 0 }, { date: '23 May 2025', sales: 0 },
  { date: '24 May 2025', sales: 0 }, { date: '25 May 2025', sales: 0 },
  { date: '26 May 2025', sales: 0 }, { date: '27 May 2025', sales: 0 },
  { date: '28 May 2025', sales: 0 }, { date: '29 May 2025', sales: 0 },
  { date: '30 May 2025', sales: 0 }, { date: '31 May 2025', sales: 0 },
];

const chartConfig = {
  sales: {
    label: "Total Sales (BDT)",
    color: "hsl(var(--chart-1))",
  },
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
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
    from: subDays(new Date(), 29), // Last 30 days
    to: new Date(),
  };
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(defaultDateRange);

  // States for calculated values
  const [totalSales, setTotalSales] = useState("৳ 0.00");
  const [invoiceDue, setInvoiceDue] = useState("৳ 0.00");

  // Mock data states for other cards (unchanged)
  const [netValue, setNetValue] = useState("৳ 0.00");
  const [totalSellReturn, setTotalSellReturn] = useState("৳ 0.00");
  const [totalPurchase, setTotalPurchase] = useState("৳ 0.00");
  const [purchaseDue, setPurchaseDue] = useState("৳ 0.00");
  const [totalPurchaseReturn, setTotalPurchaseReturn] = useState("৳ 0.00");
  const [expense, setExpense] = useState("৳ 0.00");

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

  useEffect(() => {
    if (allOrders.length === 0 && !isLoadingData) {
      // Handle no orders case, perhaps set sales/due to 0
      setTotalSales(formatCurrency(0));
      setInvoiceDue(formatCurrency(0));
      return;
    }

    if (!selectedDateRange?.from || !selectedDateRange?.to) {
      // If no date range is selected, perhaps show all-time or default to 0
      setTotalSales(formatCurrency(0)); // Or calculate all-time if desired
      setInvoiceDue(formatCurrency(0)); // Or calculate all-time if desired
      return;
    }
    
    const filteredOrders = allOrders.filter(order => 
      isWithinInterval(parseISO(order.createdAt), {
        start: selectedDateRange.from as Date, 
        end: selectedDateRange.to as Date
      })
    );

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

    // TODO: Logic for other cards and chart if they become dynamic
  }, [allOrders, selectedDateRange, isLoadingData]);


  const handleDateRangeChange = (range: DateRange | undefined) => {
    setSelectedDateRange(range);
  };

  const summaryCardData = useMemo(() => [
    { title: "Total Sales", value: totalSales, icon: ShoppingCart, isLoading: isLoadingData },
    { title: "Net", value: netValue, icon: BadgeDollarSign, isLoading: isLoadingData }, // Remains mock
    { title: "Invoice due", value: invoiceDue, icon: FileText, isLoading: isLoadingData },
    { title: "Total Sell Return", value: totalSellReturn, icon: Undo2, isLoading: isLoadingData }, // Remains mock
    { title: "Total purchase", value: totalPurchase, icon: Download, isLoading: isLoadingData }, // Remains mock
    { title: "Purchase due", value: purchaseDue, icon: AlertTriangle, isLoading: isLoadingData }, // Remains mock
    { title: "Total Purchase Return", value: totalPurchaseReturn, icon: Redo2, isLoading: isLoadingData }, // Remains mock
    { title: "Expense", value: expense, icon: Receipt, isLoading: isLoadingData }, // Remains mock
  ], [isLoadingData, totalSales, netValue, invoiceDue, totalSellReturn, totalPurchase, purchaseDue, totalPurchaseReturn, expense]);


  if (!currentUser && !isLoadingData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    );
  }
  
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
            Sales Last 30 Days (Mock Data)
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
                data={mockSalesData}
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
                  tickFormatter={(value) => value.slice(0, 6)} 
                  className="text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `৳${value}`}
                  className="text-xs"
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: '10px'}} />
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
    </div>
  );
}

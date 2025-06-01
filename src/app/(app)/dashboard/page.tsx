
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/dashboard/date-range-picker'; // New import
import type { DateRange } from "react-day-picker"; // For DateRange type
import { format } from "date-fns"; // For formatting dates
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
  LineChart,
  MapPin,
  CalendarDays, 
  BarChartBig
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);

  // Mock data states
  const [totalSales, setTotalSales] = useState("৳ 0.00");
  const [netValue, setNetValue] = useState("৳ 0.00");
  const [invoiceDue, setInvoiceDue] = useState("৳ 0.00");
  const [totalSellReturn, setTotalSellReturn] = useState("৳ 0.00");
  const [totalPurchase, setTotalPurchase] = useState("৳ 0.00");
  const [purchaseDue, setPurchaseDue] = useState("৳ 0.00");
  const [totalPurchaseReturn, setTotalPurchaseReturn] = useState("৳ 0.00");
  const [expense, setExpense] = useState("৳ 0.00");

  useEffect(() => {
    if (currentUser) {
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    } else {
      setIsLoading(false); 
    }
  }, [currentUser]);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setSelectedDateRange(range);
    // Here you would typically re-fetch data based on the new range
    console.log("Selected date range:", range);
    // For now, we'll just log it.
  };

  const summaryCardData = useMemo(() => [
    { title: "Total Sales", value: totalSales, icon: ShoppingCart, isLoading },
    { title: "Net", value: netValue, icon: BadgeDollarSign, isLoading },
    { title: "Invoice due", value: invoiceDue, icon: FileText, isLoading },
    { title: "Total Sell Return", value: totalSellReturn, icon: Undo2, isLoading },
    { title: "Total purchase", value: totalPurchase, icon: Download, isLoading },
    { title: "Purchase due", value: purchaseDue, icon: AlertTriangle, isLoading },
    { title: "Total Purchase Return", value: totalPurchaseReturn, icon: Redo2, isLoading },
    { title: "Expense", value: expense, icon: Receipt, isLoading },
  ], [isLoading, totalSales, netValue, invoiceDue, totalSellReturn, totalPurchase, purchaseDue, totalPurchaseReturn, expense]);


  if (!currentUser && !isLoading) {
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
            <DateRangePicker onDateRangeChange={handleDateRangeChange} />
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
            Sales Last 30 Days
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] sm:h-[350px] p-2 sm:p-4">
          {isLoading ? (
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

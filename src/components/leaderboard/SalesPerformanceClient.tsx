

"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, AreaChart, Layers, Download, Repeat, TrendingUp, Target } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, Line, Area, AreaChart as RechartsAreaChart, LineChart as RechartsLineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { parseISO, format, getYear, getMonth } from 'date-fns';
import type { TrackingLink, User, UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SalesPerformanceClientProps {
  allOrders: TrackingLink[];
  allCrmUsers: User[];
}

interface MonthlySalesData {
  name: string; // month name
  sales: number;
  crmSales: { [crmId: string]: number };
}

interface MonthlyTargetData {
    name: string; // month name
    totalDone: number;
    totalTarget: number;
    crmData: {
        [crmId: string]: {
            done: number;
            target: number;
        };
    };
}


const formatCurrencyBdt = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};


export function SalesPerformanceClient({ allOrders, allCrmUsers }: SalesPerformanceClientProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const [selectedYear, setSelectedYear] = useState<number>(getYear(new Date()));
  const [selectedTeam, setSelectedTeam] = useState<UserRole | 'all'>('all');

  const userMap = useMemo(() => new Map(allCrmUsers.map(u => [u.id, u])), [allCrmUsers]);

  const availableYears = useMemo(() => {
    if (!allOrders || allOrders.length === 0) {
      return [getYear(new Date())];
    }
    const years = new Set(
      allOrders
        .map(order => {
          try {
            return getYear(parseISO(order.createdAt));
          } catch {
            return null;
          }
        })
        .filter((year): year is number => year !== null)
    );
    const currentYear = getYear(new Date());
    if (!years.has(currentYear)) {
      years.add(currentYear);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [allOrders]);

  const monthlySalesData: MonthlySalesData[] = useMemo(() => {
    const months: MonthlySalesData[] = Array.from({ length: 12 }, (_, i) => ({
      name: format(new Date(selectedYear, i), 'MMM'),
      sales: 0,
      crmSales: {},
    }));

    allOrders.forEach(order => {
      try {
        const orderDate = parseISO(order.createdAt);
        if (getYear(orderDate) === selectedYear && order.crmUserId) {
          const monthIndex = getMonth(orderDate);
          const orderTotal = order.orderItems.reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0);
          months[monthIndex].sales += orderTotal;
          months[monthIndex].crmSales[order.crmUserId] = (months[monthIndex].crmSales[order.crmUserId] || 0) + orderTotal;
        }
      } catch(e) {
          // Ignore invalid date formats
      }
    });

    return months;
  }, [allOrders, selectedYear]);

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <RechartsLineChart data={monthlySalesData}>
            <Tooltip
              cursor={{ strokeDasharray: '3 3', fill: 'hsl(var(--muted))' }}
              content={({ active, payload, label }) => <ChartTooltipContentCustom active={active} payload={payload} label={label} userMap={userMap} />}
            />
            <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} dot={{r:4}} activeDot={{r:6}} />
            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`}/>
          </RechartsLineChart>
        );
      case 'area':
        return (
          <RechartsAreaChart data={monthlySalesData}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={({ active, payload, label }) => <ChartTooltipContentCustom active={active} payload={payload} label={label} userMap={userMap} />}
            />
            <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorSales)" />
             <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`}/>
          </RechartsAreaChart>
        );
      case 'bar':
      default:
        return (
          <RechartsBarChart data={monthlySalesData}>
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={({ active, payload, label }) => <ChartTooltipContentCustom active={active} payload={payload} label={label} userMap={userMap} />}
            />
            <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`}/>
          </RechartsBarChart>
        );
    }
  };

  return (
    <>
      <Card className="bg-white/95 dark:bg-card/80 backdrop-blur-sm border-border/30 shadow-xl rounded-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                  <CardTitle>Sales Performance Analysis</CardTitle>
                  <CardDescription>Monthly revenue trends and forecasting for {selectedYear}</CardDescription>
              </div>
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <div className="flex items-center bg-muted p-1 rounded-lg">
                      <Button variant="ghost" size="sm" className={cn(chartType === 'bar' && "bg-background shadow-sm")} onClick={() => setChartType('bar')}><BarChart className="h-4 w-4"/></Button>
                      <Button variant="ghost" size="sm" className={cn(chartType === 'line' && "bg-background shadow-sm")} onClick={() => setChartType('line')}><LineChart className="h-4 w-4"/></Button>
                      <Button variant="ghost" size="sm" className={cn(chartType === 'area' && "bg-background shadow-sm")} onClick={() => setChartType('area')}><AreaChart className="h-4 w-4"/></Button>
                  </div>
                   <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value, 10))}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

    </>
  );
}

const ChartTooltipContentCustom = ({ active, payload, label, userMap }: any) => {
    if (active && payload && payload.length) {
        const salesPayload = payload.find(p => p.dataKey === 'sales');
        const crmSalesData = salesPayload?.payload?.crmSales;
        const crmBreakdown = crmSalesData ? Object.entries(crmSalesData)
            .map(([crmId, sales]) => ({ crmId, sales: sales as number, user: userMap.get(crmId) }))
            .filter(item => item.user)
            .sort((a, b) => b.sales - a.sales) : [];

        return (
            <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[200px]">
                <div className="grid grid-cols-1 gap-1.5">
                    <p className="font-semibold text-foreground">{label}</p>
                    <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-primary"></div>
                        <span className="text-sm text-muted-foreground">Total Sales:</span>
                        <span className="text-sm font-medium ml-auto">{formatCurrencyBdt(salesPayload?.value as number)}</span>
                    </div>
                    
                    {crmBreakdown.length > 0 && (
                        <>
                            <div className="border-t border-dashed my-1"></div>
                            <p className="font-semibold text-xs text-muted-foreground mt-1">Top Contributors:</p>
                            <ScrollArea className="max-h-28 pr-2">
                              <div className="space-y-1.5">
                                {crmBreakdown.map(({ crmId, sales, user }) => (
                                    <div key={crmId} className="flex items-center gap-2 text-xs">
                                        <Avatar className="h-5 w-5 border">
                                            <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name} />
                                            <AvatarFallback className="text-[9px]">{getInitials(user?.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-muted-foreground truncate flex-1">{user?.name}</span>
                                        <span className="font-medium">{formatCurrencyBdt(sales)}</span>
                                    </div>
                                ))}
                              </div>
                            </ScrollArea>
                        </>
                    )}
                </div>
            </div>
        )
    }
    return null;
}

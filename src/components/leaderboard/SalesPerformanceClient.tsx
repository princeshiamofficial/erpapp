
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, AreaChart, Layers, Download, TrendingUp } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, Line, Area, AreaChart as RechartsAreaChart, LineChart as RechartsLineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { parseISO, format, getYear, getMonth } from 'date-fns';
import type { TrackingLink, User } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SalesPerformanceClientProps {
  allOrders: TrackingLink[];
  allCrmUsers: User[];
}

interface MonthlyData {
  name: string;
  sales: number;
  target: number;
  crmSales: { [crmId: string]: number };
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
  const currentYear = getYear(new Date());

  const userMap = useMemo(() => new Map(allCrmUsers.map(u => [u.id, u])), [allCrmUsers]);

  const monthlySalesData: MonthlyData[] = useMemo(() => {
    const months: MonthlyData[] = Array.from({ length: 12 }, (_, i) => ({
      name: format(new Date(currentYear, i), 'MMM'),
      sales: 0,
      target: 220000, 
      crmSales: {},
    }));

    allOrders.forEach(order => {
      try {
        const orderDate = parseISO(order.createdAt);
        if (getYear(orderDate) === currentYear && order.crmUserId) {
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
  }, [allOrders, currentYear]);

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
            <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={2} dot={false} />
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
            <Area type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted))" fillOpacity={0.2} />
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
            <Bar dataKey="target" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`}/>
          </RechartsBarChart>
        );
    }
  };

  return (
    <Card className="bg-white/95 dark:bg-card/80 backdrop-blur-sm border-border/30 shadow-xl">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
                <CardTitle>Sales Performance Analysis</CardTitle>
                <CardDescription>Monthly revenue trends and forecasting for {currentYear}</CardDescription>
            </div>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <div className="flex items-center bg-muted p-1 rounded-lg">
                    <Button variant="ghost" size="sm" className={cn(chartType === 'bar' && "bg-background shadow-sm")} onClick={() => setChartType('bar')}><BarChart className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="sm" className={cn(chartType === 'line' && "bg-background shadow-sm")} onClick={() => setChartType('line')}><LineChart className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="sm" className={cn(chartType === 'area' && "bg-background shadow-sm")} onClick={() => setChartType('area')}><AreaChart className="h-4 w-4"/></Button>
                </div>
                 <Button variant="default" size="sm"><TrendingUp className="h-4 w-4 mr-2"/>Trend</Button>
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
                    <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                        <span className="text-sm text-muted-foreground">Target:</span>
                        <span className="text-sm font-medium ml-auto">{formatCurrencyBdt(payload.find(p => p.dataKey === 'target')?.value as number)}</span>
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

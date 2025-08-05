
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, AreaChart, Layers, Download, TrendingUp } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, Line, Area, AreaChart as RechartsAreaChart, LineChart as RechartsLineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { parseISO, format, getYear, getMonth } from 'date-fns';
import type { TrackingLink } from '@/types';
import { cn } from '@/lib/utils';

interface SalesPerformanceClientProps {
  allOrders: TrackingLink[];
}

const formatCurrencyBdt = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

export function SalesPerformanceClient({ allOrders }: SalesPerformanceClientProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const currentYear = getYear(new Date());

  const monthlySalesData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      name: format(new Date(currentYear, i), 'MMM'),
      sales: 0,
      target: 220000, 
    }));

    allOrders.forEach(order => {
      try {
        const orderDate = parseISO(order.createdAt);
        if (getYear(orderDate) === currentYear) {
          const monthIndex = getMonth(orderDate);
          const orderTotal = order.orderItems.reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0);
          months[monthIndex].sales += orderTotal;
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
              content={({ active, payload, label }) => <ChartTooltipContentCustom active={active} payload={payload} label={label} />}
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
              content={({ active, payload, label }) => <ChartTooltipContentCustom active={active} payload={payload} label={label} />}
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
              content={({ active, payload, label }) => <ChartTooltipContentCustom active={active} payload={payload} label={label} />}
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


const ChartTooltipContentCustom = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm">
                <div className="grid grid-cols-1 gap-1.5">
                    <p className="font-semibold text-foreground">{label}</p>
                    <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-primary"></div>
                        <span className="text-sm text-muted-foreground">Sales:</span>
                        <span className="text-sm font-medium">{formatCurrencyBdt(payload.find(p => p.dataKey === 'sales')?.value as number)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                        <span className="text-sm text-muted-foreground">Target:</span>
                        <span className="text-sm font-medium">{formatCurrencyBdt(payload.find(p => p.dataKey === 'target')?.value as number)}</span>
                    </div>
                </div>
            </div>
        )
    }
    return null;
}

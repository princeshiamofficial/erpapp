
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, AreaChart, Layers, Download, Repeat, TrendingUp } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, Line, Area, AreaChart as RechartsAreaChart, LineChart as RechartsLineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { parseISO, format, getYear, getMonth, startOfMonth, endOfMonth } from 'date-fns';
import type { TrackingLink } from '@/types';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OrderAnalysisClientProps {
  allOrders: TrackingLink[];
}

interface MonthlyData {
  name: string;
  totalOrders: number;
  reorders: number;
}

const orderAnalysisChartConfig = {
  totalOrders: {
    label: "Total Orders",
    color: "hsl(var(--chart-1))",
  },
  reorders: {
    label: "Reorders",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function OrderAnalysisClient({ allOrders }: OrderAnalysisClientProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const [selectedYear, setSelectedYear] = useState<number>(getYear(new Date()));

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

  const monthlyOrderData: MonthlyData[] = useMemo(() => {
    const customerOrderHistory: { [jobId: string]: boolean } = {}; // Use Job ID as the key
    const months: MonthlyData[] = Array.from({ length: 12 }, (_, i) => ({
      name: format(new Date(selectedYear, i), 'MMM'),
      totalOrders: 0,
      reorders: 0,
    }));

    const sortedOrders = [...allOrders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    sortedOrders.forEach(order => {
      try {
        const orderDate = parseISO(order.createdAt);
        if (getYear(orderDate) !== selectedYear) return;
        
        const monthIndex = getMonth(orderDate);
        months[monthIndex].totalOrders += 1;
        
        const companyNameParts = (order.companyName || '').split('•');
        const jobId = companyNameParts.length > 1 ? companyNameParts[0].trim() : null;

        if (jobId) {
          if (customerOrderHistory[jobId]) {
            // It's a reorder if we've seen this Job ID before
            months[monthIndex].reorders += 1;
          } else {
            // First time seeing this Job ID
            customerOrderHistory[jobId] = true;
          }
        }
      } catch(e) {
          // Ignore invalid date formats
      }
    });

    return months;
  }, [allOrders, selectedYear]);

  const renderChart = () => {
    switch(chartType) {
        case 'line':
            return (
                <RechartsLineChart data={monthlyOrderData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Legend />
                    <Line type="monotone" dataKey="totalOrders" name="Total Orders" stroke="var(--color-totalOrders)" strokeWidth={2} dot={{r:4}} activeDot={{r:6}} />
                    <Line type="monotone" dataKey="reorders" name="Reorders" stroke="var(--color-reorders)" strokeWidth={2} dot={{r:4}} activeDot={{r:6}} />
                </RechartsLineChart>
            );
        case 'area':
             return (
                <RechartsAreaChart data={monthlyOrderData}>
                     <defs>
                        <linearGradient id="colorTotalOrders" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-totalOrders)" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="var(--color-totalOrders)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorReorders" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-reorders)" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="var(--color-reorders)" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Legend />
                    <Area type="monotone" dataKey="totalOrders" name="Total Orders" stroke="var(--color-totalOrders)" fill="url(#colorTotalOrders)" />
                    <Area type="monotone" dataKey="reorders" name="Reorders" stroke="var(--color-reorders)" fill="url(#colorReorders)" />
                </RechartsAreaChart>
            );
        case 'bar':
        default:
            return (
                <RechartsBarChart data={monthlyOrderData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Legend />
                    <Bar dataKey="totalOrders" name="Total Orders" fill="var(--color-totalOrders)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="reorders" name="Reorders" fill="var(--color-reorders)" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
            );
    }
  };

  return (
    <Card className="bg-white/95 dark:bg-card/80 backdrop-blur-sm border-border/30 shadow-xl">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
                <CardTitle>Order Analysis</CardTitle>
                <CardDescription>Total Orders vs. Reorders for {selectedYear}</CardDescription>
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
          <ChartContainer config={orderAnalysisChartConfig} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

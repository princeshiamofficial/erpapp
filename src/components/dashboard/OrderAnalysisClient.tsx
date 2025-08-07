
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, AreaChart, Layers, Download, Repeat, TrendingUp } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
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

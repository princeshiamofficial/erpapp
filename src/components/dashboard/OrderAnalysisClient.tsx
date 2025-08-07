
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, AreaChart, Layers, Download, Repeat, TrendingUp } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
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
    const customerOrderHistory: { [phone: string]: Date[] } = {};
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
        
        if (order.phoneNumber) {
          if (customerOrderHistory[order.phoneNumber]) {
            // It's a reorder if there's a previous order recorded for this phone number
            months[monthIndex].reorders += 1;
            customerOrderHistory[order.phoneNumber].push(orderDate);
          } else {
            // First time seeing this customer
            customerOrderHistory[order.phoneNumber] = [orderDate];
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
        <Bar dataKey="totalOrders" name="Total Orders" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="reorders" name="Reorders" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
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
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

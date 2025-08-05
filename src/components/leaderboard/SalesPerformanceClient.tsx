
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, AreaChart, Layers, Download, TrendingUp } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { parseISO, format, getYear, getMonth } from 'date-fns';
import type { TrackingLink } from '@/types';

interface SalesPerformanceClientProps {
  allOrders: TrackingLink[];
}

const formatCurrencyBdt = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

export function SalesPerformanceClient({ allOrders }: SalesPerformanceClientProps) {
  const currentYear = getYear(new Date());

  const monthlySalesData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      name: format(new Date(currentYear, i), 'MMM'),
      sales: 0,
      target: 220000, // Static target for now
    }));

    allOrders.forEach(order => {
      const orderDate = parseISO(order.createdAt);
      if (getYear(orderDate) === currentYear) {
        const monthIndex = getMonth(orderDate);
        const orderTotal = order.orderItems.reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0);
        months[monthIndex].sales += orderTotal;
      }
    });

    return months;
  }, [allOrders, currentYear]);

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
                    <Button variant="ghost" size="sm" className="bg-background shadow-sm"><BarChart className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="sm"><LineChart className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="sm"><AreaChart className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="sm"><Layers className="h-4 w-4"/></Button>
                </div>
                 <Button variant="default" size="sm"><TrendingUp className="h-4 w-4 mr-2"/>Trend</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={monthlySalesData}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${Number(value) / 1000}k`}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                        return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid grid-cols-1 gap-1.5">
                                    <p className="font-semibold text-foreground">{label}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2.5 w-2.5 rounded-full bg-primary"></div>
                                        <span className="text-sm text-muted-foreground">sales:</span>
                                        <span className="text-sm font-medium">{formatCurrencyBdt(payload[0].value as number)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                                        <span className="text-sm text-muted-foreground">target:</span>
                                        <span className="text-sm font-medium">{formatCurrencyBdt(payload[1].value as number)}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    return null;
                }}
              />
              <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="target" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}


"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { TrackingLink } from '@/types';
import { getOrders } from '@/lib/order-service';
import { Settings, TrendingUp, PackageSearch } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BusinessLoyalty {
  id: string;
  name: string;
  loyaltyScore: number;
  trendData: { value: number }[];
  color: {
    gradientFrom: string;
    gradientTo: string;
    progress: string;
  };
}

const generateBusinessLoyaltyData = (orders: TrackingLink[]): BusinessLoyalty[] => {
  const businesses: Record<string, number> = {};
  orders.forEach(order => {
    const businessName = order.companyName.split(' • ').pop()?.trim() || order.companyName;
    if (businessName) {
      businesses[businessName] = (businesses[businessName] || 0) + 1;
    }
  });

  const getColorThemeForScore = (score: number) => {
    if (score <= 25) {
      return { gradientFrom: '#F87171', gradientTo: 'rgba(248, 113, 113, 0.1)', progress: 'bg-red-500' };   // Red
    } else if (score <= 50) {
      return { gradientFrom: '#FBBF24', gradientTo: 'rgba(251, 191, 36, 0.1)', progress: 'bg-amber-500' }; // Amber
    } else if (score <= 75) {
      return { gradientFrom: '#60A5FA', gradientTo: 'rgba(96, 165, 250, 0.1)', progress: 'bg-blue-500' };  // Blue
    } else {
      return { gradientFrom: '#6EE7B7', gradientTo: 'rgba(52, 211, 153, 0.1)', progress: 'bg-green-500' }; // Teal/Green
    }
  };


  return Object.entries(businesses).slice(0, 20).map(([name, orderCount]) => { // Increased to show more data in table
    const loyaltyScore = Math.min(99, 10 + orderCount * 12 + Math.floor(Math.random() * 15));
    return {
      id: name,
      name,
      loyaltyScore,
      trendData: Array.from({ length: 10 }, (_, i) => ({
        value: Math.floor(loyaltyScore * (0.8 + (Math.random() * 0.4)) * ((i + 1) / 10)),
      })),
      color: getColorThemeForScore(loyaltyScore),
    };
  });
};

const LoyaltyTrendChart = ({ data, fromColor, toColor, id }: { data: any[], fromColor: string, toColor: string, id: string }) => {
  const uniqueGradientId = `gradient-chart-${id.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <div className="h-10 w-28">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
           <defs>
                <linearGradient id={uniqueGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={fromColor} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={toColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
          <Area type="monotone" dataKey="value" stroke={fromColor} strokeWidth={2} fillOpacity={1} fill={`url(#${uniqueGradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};


export default function SOWPage() {
  const [loyaltyData, setLoyaltyData] = useState<BusinessLoyalty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const fetchedOrders = await getOrders();
        // Generate data only on the client side to prevent hydration errors
        const data = generateBusinessLoyaltyData(fetchedOrders);
        setLoyaltyData(data);
      } catch (error) {
        toast({
          title: "Error fetching data",
          description: "Could not load the necessary data for the SOW page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Statement of Work</h1>
          <p className="text-muted-foreground">
            An overview of business loyalty and progress.
          </p>
        </div>
        <Button variant="outline" size="icon" className="bg-card">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader>
            <CardTitle>Business Loyalty Report</CardTitle>
            <CardDescription>Loyalty scores and trends based on recent order history.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-1/3">Business Name</TableHead>
                        <TableHead className="w-1/3">Loyalty Trend</TableHead>
                        <TableHead className="text-right">Loyalty Score</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                         Array.from({ length: 5 }).map((_, index) => (
                           <TableRow key={index}>
                                <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                                <TableCell><Skeleton className="h-10 w-28" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-2/3 ml-auto" /></TableCell>
                           </TableRow>
                        ))
                    ) : loyaltyData.length > 0 ? (
                        loyaltyData.map((business) => (
                            <TableRow key={business.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium text-foreground">{business.name}</TableCell>
                                <TableCell>
                                    <LoyaltyTrendChart data={business.trendData} fromColor={business.color.gradientFrom} toColor={business.color.gradientTo} id={business.id}/>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        <span className="font-semibold text-lg w-12 text-foreground">{business.loyaltyScore}%</span>
                                        <Progress value={business.loyaltyScore} className="w-24 h-2" indicatorClassName={business.color.progress} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="h-48 text-center text-muted-foreground">
                                <PackageSearch className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                No loyalty data to display.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}

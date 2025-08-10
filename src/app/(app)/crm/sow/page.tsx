
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { MoreVertical, Settings, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { TrackingLink } from '@/types';
import { getOrders } from '@/lib/order-service';
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


  return Object.entries(businesses).slice(0, 10).map(([name, orderCount]) => {
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

const LoyaltyCard = ({ business }: { business: BusinessLoyalty }) => {
  const uniqueGradientId = `gradient-${business.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Card className="shadow-md hover:shadow-xl transition-shadow bg-card overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-semibold text-card-foreground">{business.name}</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-20 -mx-6 -mb-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={business.trendData}>
              <defs>
                <linearGradient id={uniqueGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={business.color.gradientFrom} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={business.color.gradientTo} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  fontSize: '12px',
                  padding: '4px 8px',
                }}
                labelStyle={{ display: 'none' }}
                formatter={(value) => [`${value}%`, 'Loyalty']}
              />
              <Area type="monotone" dataKey="value" stroke={business.color.gradientFrom} strokeWidth={2} fill={`url(#${uniqueGradientId})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            <span>Loyalty</span>
          </div>
          <span className="text-lg font-bold text-card-foreground">{business.loyaltyScore}%</span>
        </div>
        <Progress value={business.loyaltyScore} className="mt-2 h-2" indicatorClassName={business.color.progress} />
      </CardContent>
    </Card>
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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900/50 min-h-screen">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading
          ? Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-3/5" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                  <div className="flex justify-between items-center mt-4">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-6 w-1/5" />
                  </div>
                  <Skeleton className="h-2 w-full mt-2" />
                </CardContent>
              </Card>
            ))
          : loyaltyData.map((business) => (
              <LoyaltyCard key={business.id} business={business} />
            ))}
      </div>
    </div>
  );
}

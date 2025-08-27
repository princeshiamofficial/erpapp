
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { TrackingLink, OrderItem, GlobalSettings } from '@/types';
import { getOrders } from '@/lib/order-service';
import { getGlobalSettings } from '@/lib/settings-service';
import { PackageSearch } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';


interface SowData {
  id: string;
  orderDate: string;
  businessName: string;
  products: string;
  amount: number;
  loyaltyScore: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-BD', {
        style: 'currency',
        currency: 'BDT',
    }).format(value);
};

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        return format(parseISO(dateString), 'd MMM, yyyy');
    } catch (e) {
        return 'Invalid Date';
    }
};

const generateSowData = (orders: TrackingLink[], globalSettings: GlobalSettings | null): SowData[] => {
    const filters = globalSettings?.reportProductFilters || [];
    
    const categoryPercentage = filters.length > 0 ? 100 / filters.length : 0;
    const productPercentageMap = new Map<string, number>();
    filters.forEach(filter => {
        productPercentageMap.set(filter, categoryPercentage);
    });

    return orders.map(order => {
        const businessName = order.companyName.split(' • ').pop()?.trim() || order.companyName;
        let productsDisplay = 'N/A';
        let productKeysForScore: string[] = [];
        
        if (order.orderItems && order.orderItems.length > 0) {
            const matchedFilters = new Set<string>();
            for (const filter of filters) {
                if (order.orderItems.some(item => item.model.toLowerCase().includes(filter.toLowerCase()))) {
                    matchedFilters.add(filter);
                }
            }

            if (matchedFilters.size > 0) {
                productsDisplay = Array.from(matchedFilters).join(', ');
                productKeysForScore = Array.from(matchedFilters);
            } else {
                productsDisplay = order.orderItems.map(item => `${item.model} (x${item.quantity})`).join(', ');
                productKeysForScore = []; // No score if no category match
            }
        }

        const amount = (order.orderItems || []).reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0);
        
        let loyaltyScore = 0;
        if (productKeysForScore.length > 0) {
            const scores = productKeysForScore.map(key => productPercentageMap.get(key) || 0);
            loyaltyScore = scores.reduce((sum, score) => sum + score, 0); // Sum the scores
        }

        return {
            id: order.id,
            orderDate: formatDate(order.createdAt),
            businessName,
            products: productsDisplay,
            amount,
            loyaltyScore: Math.min(99, Math.round(loyaltyScore)), // Round and cap at 99
        };
    }).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
};

const getLoyaltyColorClass = (score: number) => {
    if (score <= 25) return 'bg-red-500';
    if (score <= 50) return 'bg-amber-500';
    if (score <= 75) return 'bg-blue-500';
    return 'bg-green-500';
};


export default function SOWPage() {
  const [sowData, setSowData] = useState<SowData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [fetchedOrders, fetchedSettings] = await Promise.all([
          getOrders(),
          getGlobalSettings()
        ]);
        const data = generateSowData(fetchedOrders, fetchedSettings);
        setSowData(data);
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
      </div>
      
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader>
            <CardTitle>Business Report</CardTitle>
            <CardDescription>Statement of work based on recent order history.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Business Name</TableHead>
                        <TableHead>Products</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center w-[200px]">Loyalty Score</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                         Array.from({ length: 5 }).map((_, index) => (
                           <TableRow key={index}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-40 mx-auto" /></TableCell>
                           </TableRow>
                        ))
                    ) : sowData.length > 0 ? (
                        sowData.map((row) => (
                            <TableRow key={row.id} className="hover:bg-muted/50">
                                <TableCell className="text-muted-foreground">{row.orderDate}</TableCell>
                                <TableCell className="font-medium text-foreground">{row.businessName}</TableCell>
                                <TableCell className="text-muted-foreground max-w-xs truncate" title={row.products}>{row.products}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(row.amount)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center gap-3">
                                        <Progress value={row.loyaltyScore} className="w-24 h-2" indicatorClassName={getLoyaltyColorClass(row.loyaltyScore)} />
                                        <span className="font-semibold text-foreground">{row.loyaltyScore}%</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                <PackageSearch className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                No order data to display.
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

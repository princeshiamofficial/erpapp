
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
import { PackageSearch, ListChecks } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SowData {
  id: string; // Using Job ID as the unique key
  orderDate: string; // Will use the date of the latest order for that job
  businessName: string;
  purchasedCategories: string[];
  unmatchedPurchasedItems: string[];
  allCategories: string[];
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

    const ordersByJobId = new Map<string, { orders: TrackingLink[], businessName: string, latestDate: string }>();

    orders.forEach(order => {
        const companyNameParts = order.companyName.split(' • ').map(part => part.trim());
        const jobId = companyNameParts.length > 1 ? companyNameParts[0] : order.id;
        const businessName = companyNameParts.length > 1 ? companyNameParts.slice(1).join(' • ').trim() : order.companyName;

        const existing = ordersByJobId.get(jobId) || { orders: [], businessName, latestDate: order.createdAt };
        existing.orders.push(order);
        if (new Date(order.createdAt) > new Date(existing.latestDate)) {
          existing.latestDate = order.createdAt;
          existing.businessName = businessName;
        }
        ordersByJobId.set(jobId, existing);
    });

    return Array.from(ordersByJobId.entries()).map(([jobId, group]) => {
        const allItemsFromGroup = group.orders.flatMap(o => o.orderItems || []);
        
        const matchedFilters = new Set<string>();
        const unmatchedItems = new Set<string>();

        if (allItemsFromGroup.length > 0) {
            allItemsFromGroup.forEach(item => {
                let isItemMatched = false;
                for (const filter of filters) {
                    if (item.model.toLowerCase().includes(filter.toLowerCase())) {
                        matchedFilters.add(filter);
                        isItemMatched = true;
                    }
                }
                if (!isItemMatched) {
                    unmatchedItems.add(item.model);
                }
            });
        }
        
        const totalAmount = group.orders.reduce((sum, order) => {
            const orderTotal = (order.orderItems || []).reduce((itemSum, item) => itemSum + (item.lineItemTotalPrice || 0), 0);
            return sum + orderTotal;
        }, 0);
        
        const totalPurchasedCount = matchedFilters.size + unmatchedItems.size;
        const loyaltyScore = totalPurchasedCount * categoryPercentage;

        return {
            id: jobId,
            orderDate: formatDate(group.latestDate),
            businessName: group.businessName,
            purchasedCategories: Array.from(matchedFilters),
            unmatchedPurchasedItems: Array.from(unmatchedItems),
            allCategories: filters,
            amount: totalAmount,
            loyaltyScore: Math.min(100, Math.round(loyaltyScore)),
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
                        <TableHead className="w-[40%]">Products</TableHead>
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
                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-40 mx-auto" /></TableCell>
                           </TableRow>
                        ))
                    ) : sowData.length > 0 ? (
                        sowData.map((row) => {
                           const purchasedCount = row.purchasedCategories.length + row.unmatchedPurchasedItems.length;
                           const totalCategories = row.allCategories.length;
                           return (
                            <TableRow key={row.id} className="hover:bg-muted/50">
                                <TableCell className="text-muted-foreground">{row.orderDate}</TableCell>
                                <TableCell className="font-medium text-foreground">{row.businessName}</TableCell>
                                <TableCell>
                                  <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-px w-full h-3 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-inner">
                                          {row.allCategories.map((category, index) => {
                                            const isPurchased = index < purchasedCount;
                                            const hue = (index / Math.max(1, totalCategories - 1)) * 120; // Red (0) to green (120)
                                            return (
                                                <div
                                                  key={index}
                                                  className="h-full flex-1"
                                                  style={{
                                                    backgroundColor: isPurchased ? `hsl(${hue}, 70%, 50%)` : 'rgba(209, 213, 219, 0.3)',
                                                  }}
                                                />
                                            );
                                          })}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="p-1 max-w-xs">
                                          <p className="font-semibold text-sm mb-2 flex items-center gap-1"><ListChecks className="h-4 w-4 text-primary"/> Defined Categories ({row.allCategories.length}):</p>
                                            <ul className="list-disc list-inside text-xs space-y-0.5">
                                                {row.allCategories.map(p => {
                                                  const isBought = row.purchasedCategories.includes(p);
                                                  return <li key={p} className={cn(isBought ? "font-semibold text-primary" : "text-muted-foreground")}>{p} {isBought ? '(Purchased)' : ''}</li>
                                                })}
                                            </ul>
                                          
                                          {row.unmatchedPurchasedItems.length > 0 && (
                                            <>
                                              <p className="font-semibold text-sm mt-3 mb-2 flex items-center gap-1"><PackageSearch className="h-4 w-4 text-primary"/> Other Purchased Items:</p>
                                              <ul className="list-disc list-inside text-xs space-y-0.5">
                                                {row.unmatchedPurchasedItems.map(p => <li key={p}>{p}</li>)}
                                              </ul>
                                            </>
                                          )}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(row.amount)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center gap-3">
                                        <Progress value={row.loyaltyScore} className="w-24 h-2" indicatorClassName={getLoyaltyColorClass(row.loyaltyScore)} />
                                        <span className="font-semibold text-foreground">{row.loyaltyScore}%</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                           );
                        })
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

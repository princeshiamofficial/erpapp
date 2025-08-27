
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

    // First, group orders by Job ID
    orders.forEach(order => {
        const companyNameParts = order.companyName.split(' • ').map(part => part.trim());
        const jobId = companyNameParts.length > 1 ? companyNameParts[0] : order.id; // Fallback to order id if no job id
        const businessName = companyNameParts.length > 1 ? companyNameParts.slice(1).join(' • ').trim() : order.companyName;

        const existing = ordersByJobId.get(jobId) || { orders: [], businessName, latestDate: order.createdAt };
        existing.orders.push(order);
        if (new Date(order.createdAt) > new Date(existing.latestDate)) {
          existing.latestDate = order.createdAt;
          existing.businessName = businessName; // Use business name from latest order
        }
        ordersByJobId.set(jobId, existing);
    });


    // Now, process each group
    return Array.from(ordersByJobId.entries()).map(([jobId, group]) => {
        const allItemsFromGroup = group.orders.flatMap(o => o.orderItems || []);
        
        const matchedFilters = new Set<string>();

        if (allItemsFromGroup.length > 0) {
            for (const filter of filters) {
                if (allItemsFromGroup.some(item => item.model.toLowerCase().includes(filter.toLowerCase()))) {
                    matchedFilters.add(filter);
                }
            }
        }
        
        const totalAmount = group.orders.reduce((sum, order) => {
            const orderTotal = (order.orderItems || []).reduce((itemSum, item) => itemSum + (item.lineItemTotalPrice || 0), 0);
            return sum + orderTotal;
        }, 0);
        
        const loyaltyScore = matchedFilters.size * categoryPercentage;

        return {
            id: jobId,
            orderDate: formatDate(group.latestDate),
            businessName: group.businessName,
            purchasedCategories: Array.from(matchedFilters),
            allCategories: filters,
            amount: totalAmount,
            loyaltyScore: Math.min(100, Math.round(loyaltyScore)), // Cap at 100
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
                           const purchasedCount = row.purchasedCategories.length;
                           return (
                            <TableRow key={row.id} className="hover:bg-muted/50">
                                <TableCell className="text-muted-foreground">{row.orderDate}</TableCell>
                                <TableCell className="font-medium text-foreground">{row.businessName}</TableCell>
                                <TableCell>
                                  <TooltipProvider>
                                    <div className="flex items-center gap-px bg-gray-200 dark:bg-gray-900 rounded-md overflow-hidden shadow-inner w-full h-3">
                                      {row.allCategories.map((category, index) => {
                                        const isPurchased = index < purchasedCount;
                                        const purchasedCategoryName = isPurchased ? row.purchasedCategories[index] : null;

                                        let boxStyle = {};
                                        if (isPurchased) {
                                          const totalPurchased = purchasedCount;
                                          // Start red (hue 0) and end green (hue 120)
                                          const hue = totalPurchased > 1 ? (index / (totalPurchased - 1)) * 120 : 0;
                                          boxStyle = { backgroundColor: `hsl(${hue}, 70%, 50%)` };
                                        }

                                        const box = (
                                          <div
                                            key={`${row.id}-${category}-${index}`}
                                            style={boxStyle}
                                            className={cn(
                                              "h-full w-full flex-1 transition-all duration-300",
                                              !isPurchased && "bg-gray-300 dark:bg-gray-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                            )}
                                          ></div>
                                        );

                                        if (isPurchased && purchasedCategoryName) {
                                          return (
                                            <Tooltip key={`${row.id}-tooltip-${category}-${index}`}>
                                              <TooltipTrigger asChild>
                                                {box}
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>{purchasedCategoryName}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          );
                                        }
                                        return box;
                                      })}
                                    </div>
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

    

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft, Eye, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TrackingLink, CustomStatus } from '@/types';
import { getOrders } from '@/lib/order-service';
import { getStatuses, getContrastTextColor } from '@/lib/status-service';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, format as formatDateFns } from 'date-fns';

const formatDateForDisplay = (dateString: string | undefined) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return "Invalid Date";
  }
};

export default function MonthlyDeliveriesPage() {
  const { toast } = useToast();
  const [deliveredOrders, setDeliveredOrders] = useState<TrackingLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [deliveredStatusId, setDeliveredStatusId] = useState<string | undefined>(undefined);
  const [currentMonthName, setCurrentMonthName] = useState('');

  const fetchMonthlyDeliveries = useCallback(async () => {
    setIsLoading(true);
    const now = new Date();
    setCurrentMonthName(formatDateFns(now, 'MMMM yyyy'));
    try {
      const [fetchedOrders, fetchedStatuses] = await Promise.all([
        getOrders(),
        getStatuses(),
      ]);
      setAllStatuses(fetchedStatuses);

      const delivStatus = fetchedStatuses.find(s => s.name.toLowerCase() === 'delivered');
      if (!delivStatus) {
        toast({ title: "Configuration Error", description: "'Delivered' status not found. Please ensure it's configured.", variant: "destructive" });
        setIsLoading(false);
        setDeliveredOrders([]);
        return;
      }
      setDeliveredStatusId(delivStatus.id);

      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const monthlyDelivered = fetchedOrders.filter(order => {
        return order.statusHistory.some(log =>
          log.status === delivStatus.id && isWithinInterval(parseISO(log.timestamp), { start: monthStart, end: monthEnd })
        );
      });
      
      // Sort by delivery date, most recent first
      setDeliveredOrders(monthlyDelivered.sort((a, b) => {
          const aDeliveryLog = a.statusHistory.find(l => l.status === delivStatus.id);
          const bDeliveryLog = b.statusHistory.find(l => l.status === delivStatus.id);
          if (!aDeliveryLog || !bDeliveryLog) return 0; // Should not happen if filtered correctly
          return new Date(bDeliveryLog.timestamp).getTime() - new Date(aDeliveryLog.timestamp).getTime();
        })
      );

    } catch (error) {
      console.error("Failed to fetch monthly deliveries:", error);
      toast({ title: "Error", description: "Could not load monthly deliveries.", variant: "destructive" });
      setDeliveredOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMonthlyDeliveries();
  }, [fetchMonthlyDeliveries]);

  const getStatusDisplayInfo = useCallback((statusId: string): { name: string; color: string; textColor: string } => {
    const status = allStatuses.find(s => s.id === statusId);
    if (status) {
      return { name: status.name, color: status.color, textColor: getContrastTextColor(status.color) };
    }
    // Fallback if status ID is not found in allStatuses (e.g. during initial load or data inconsistency)
    return { name: statusId, color: '#A1A1AA', textColor: '#FFFFFF' };
  }, [allStatuses]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div className="flex items-center gap-3">
          <PackageCheck className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <h1 className="page-title">Monthly Deliveries</h1>
            <p className="page-description">
              Orders delivered in {currentMonthName || "the current month"}.
            </p>
          </div>
        </div>
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl">Delivered Orders ({currentMonthName})</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            List of all orders marked as 'Delivered' within {currentMonthName || "the current month"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Order ID</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Current Status</TableHead>
                  <TableHead>Delivered On</TableHead>
                  <TableHead>CRM Contact</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                      <TableCell className="pl-6"><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="pr-6 text-right"><Skeleton className="h-9 w-9 inline-block rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : deliveredOrders.length > 0 ? (
                  deliveredOrders.map((order) => {
                    const statusInfo = getStatusDisplayInfo(order.currentStatus);
                    const deliveryLog = order.statusHistory.find(log => log.status === deliveredStatusId);
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="pl-6">
                          <Link href={`/track/${order.id}`} className="font-medium text-primary hover:underline">
                            {order.id}
                          </Link>
                        </TableCell>
                        <TableCell className="text-card-foreground">{order.companyName} <br/><small className="text-muted-foreground">{order.customerName}</small></TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: statusInfo.color, color: statusInfo.textColor }} className="border-transparent">
                            {statusInfo.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{deliveryLog ? formatDateForDisplay(deliveryLog.timestamp) : 'N/A'}</TableCell>
                        <TableCell className="text-card-foreground">{order.crmUserName}</TableCell>
                        <TableCell className="pr-6 text-right">
                          <Link href={`/track/${order.id}`} passHref>
                            <Button variant="outline" size="sm" className="h-9 px-3">
                              <Eye className="mr-1.5 h-4 w-4" /> View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 h-[300px]">
                      <PackageCheck className="mx-auto h-12 w-12 opacity-50 mb-3 text-muted-foreground" />
                      <p className="text-lg text-muted-foreground font-medium">No orders delivered this month.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

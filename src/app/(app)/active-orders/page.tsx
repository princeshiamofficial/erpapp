
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft, Eye, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TrackingLink, CustomStatus } from '@/types';
import { getOrders } from '@/lib/order-service';
import { getStatuses, getContrastTextColor } from '@/lib/status-service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context'; // Added useAuth
import { format as formatDateFns, parseISO } from 'date-fns';

const formatDateForDisplay = (dateString: string | undefined) => {
  if (!dateString) return "N/A";
  try {
    // Using a consistent format string avoids locale-based hydration mismatches
    return formatDateFns(parseISO(dateString), 'd MMM yyyy');
  } catch (e) {
    console.error("Invalid date string for formatting:", dateString, e);
    return "Invalid Date";
  }
};

export default function ActiveOrdersPage() {
  const { toast } = useToast();
  const { currentUser } = useAuth(); // Get current user
  const [activeOrders, setActiveOrders] = useState<TrackingLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [pageDescription, setPageDescription] = useState("All orders that are not yet 'Delivered' or 'Cancelled'.");

  const fetchActiveOrders = useCallback(async () => {
    if (!currentUser) { // Don't fetch if currentUser is not yet available
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedStatuses] = await Promise.all([
        getOrders(),
        getStatuses(),
      ]);
      setAllStatuses(fetchedStatuses);

      const deliveredStatus = fetchedStatuses.find(s => s.name.toLowerCase() === 'delivered');
      const cancelledStatus = fetchedStatuses.find(s => s.name.toLowerCase() === 'cancelled');

      if (!deliveredStatus || !cancelledStatus) {
        toast({ title: "Configuration Error", description: "Could not determine 'Delivered' or 'Cancelled' statuses. Please ensure they are configured.", variant: "destructive" });
        setIsLoading(false);
        setActiveOrders([]);
        return;
      }
      
      let filteredOrders = fetchedOrders.filter(order => {
        return order.currentStatus !== deliveredStatus.id && order.currentStatus !== cancelledStatus.id;
      });

      // Apply role-based filtering
      if (currentUser.role === 'CRM') {
        filteredOrders = filteredOrders.filter(order => order.crmUserId === currentUser.id);
        setPageDescription("Your active orders that are not yet 'Delivered' or 'Cancelled'.");
      } else if (currentUser.role === 'DESIGNER_REPRESENTATIVE') {
        filteredOrders = filteredOrders.filter(order => order.designerRepresentativeId === currentUser.id);
        setPageDescription("Active orders assigned to you that are not yet 'Delivered' or 'Cancelled'.");
      } else {
        setPageDescription("All orders that are not yet 'Delivered' or 'Cancelled'.");
      }
      
      // Sort by creation date, most recent first
      setActiveOrders(filteredOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

    } catch (error) {
      console.error("Failed to fetch active orders:", error);
      toast({ title: "Error", description: "Could not load active orders.", variant: "destructive" });
      setActiveOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentUser]); // Added currentUser to dependencies

  useEffect(() => {
    if (currentUser) { // Fetch only if currentUser is available
      fetchActiveOrders();
    } else {
      // Handle case where currentUser might still be loading initially
      // You might want to show a different loading state or wait
      setIsLoading(false); // Or manage a separate loading state for auth
    }
  }, [fetchActiveOrders, currentUser]); // Added currentUser here too

  const getStatusDisplayInfo = useCallback((statusId: string): { name: string; color: string; textColor: string } => {
    const status = allStatuses.find(s => s.id === statusId);
    if (status) {
      return { name: status.name, color: status.color, textColor: getContrastTextColor(status.color) };
    }
    return { name: statusId, color: '#A1A1AA', textColor: '#FFFFFF' }; 
  }, [allStatuses]);


  if (isLoading && !currentUser) { // Show loader if auth is still loading
     return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
     );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <h1 className="page-title">Active Orders</h1>
            <p className="page-description">
              {pageDescription}
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
          <CardTitle className="text-card-foreground text-xl">Current Active Orders</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            {currentUser?.role === 'CRM' ? "List of your ongoing orders." : 
             currentUser?.role === 'DESIGNER_REPRESENTATIVE' ? "List of ongoing orders assigned to you." :
             "List of all ongoing orders."}
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
                  <TableHead>Created On</TableHead>
                  <TableHead>CRM Contact</TableHead>
                  <TableHead>Assigned DR</TableHead>
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
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="pr-6 text-right"><Skeleton className="h-9 w-9 inline-block rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : activeOrders.length > 0 ? (
                  activeOrders.map((order) => {
                    const statusInfo = getStatusDisplayInfo(order.currentStatus);
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="pl-6">
                          <Link href={`/track/${order.id}`} className="font-medium text-primary hover:underline">
                            {order.id}
                          </Link>
                        </TableCell>
                        <TableCell className="text-card-foreground">{order.companyName}</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: statusInfo.color, color: statusInfo.textColor }} className="border-transparent">
                            {statusInfo.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDateForDisplay(order.createdAt)}</TableCell>
                        <TableCell className="text-card-foreground">{order.crmUserName}</TableCell>
                        <TableCell className="text-card-foreground">{order.designerRepresentativeName || "N/A"}</TableCell>
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
                    <TableCell colSpan={7} className="text-center py-12 h-[300px]">
                      <Package className="mx-auto h-12 w-12 opacity-50 mb-3 text-muted-foreground" />
                      <p className="text-lg text-muted-foreground font-medium">
                        {currentUser?.role === 'CRM' ? "You have no active orders." :
                         currentUser?.role === 'DESIGNER_REPRESENTATIVE' ? "No active orders assigned to you." :
                         "No active orders found."}
                      </p>
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

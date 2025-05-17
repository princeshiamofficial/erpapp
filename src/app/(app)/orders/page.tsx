
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Eye, Users2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";
import Link from "next/link";
import { CreateOrderDialog } from '@/components/orders/create-order-dialog';
import type { TrackingLink, User, CustomStatus } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils";
import { getStatusById, getContrastTextColor, getStatuses } from '@/lib/status-service';
import { AssignDrDialog } from '@/components/orders/assign-dr-dialog';
import { getOrders } from '@/lib/order-service'; 
import { Skeleton } from '@/components/ui/skeleton';
import { createOrderAction, assignDrToOrderAction } from './actions';


const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return "Invalid Date";
  }
};


export default function OrdersPage() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<TrackingLink[]>([]);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // State for Assign DR Dialog
  const [selectedOrderForDrAssignment, setSelectedOrderForDrAssignment] = useState<TrackingLink | null>(null);
  const [isAssignDrDialogOpen, setIsAssignDrDialogOpen] = useState(false);
  
  const fetchOrderData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedOrders = await getOrders();
      const fetchedStatuses = await getStatuses();
      setOrders(fetchedOrders);
      setAllStatuses(fetchedStatuses);
    } catch (error) {
      console.error("Failed to fetch orders or statuses:", error);
      // Add toast notification here if desired
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    fetchOrderData();
  }, [fetchOrderData]);
  
  const getStatusDisplayInfo = useCallback(async (statusId: string): Promise<{ name: string; color: string; textColor: string }> => {
    const status = allStatuses.find(s => s.id === statusId) || await getStatusById(statusId); // Fallback to direct fetch if not in allStatuses
    if (status) {
      return { name: status.name, color: status.color, textColor: getContrastTextColor(status.color) };
    }
    return { name: statusId, color: '#ccc', textColor: '#000' }; // Fallback for unknown status
  }, [allStatuses]);


  const canCreateOrder = currentUser?.role === 'CRM' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';
  const canAssignDr = currentUser?.role === 'CRM' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';


  const filteredOrders = useMemo(() => {
    let result = orders;
    if (currentUser?.role === 'CRM') { 
      result = result.filter(order => order.crmUserId === currentUser.id);
    }
    if (!searchTerm) return result;
    return result.filter(order => 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.phoneNumber && order.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.service && order.service.toLowerCase().includes(searchTerm.toLowerCase())) ||
      order.crmUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.designerRepresentativeName && order.designerRepresentativeName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [orders, searchTerm, currentUser]);

  // Memoized status display info to avoid re-fetching in map
  const [orderStatusDisplay, setOrderStatusDisplay] = useState<Record<string, { name: string; color: string; textColor: string }>>({});

  useEffect(() => {
    const fetchAllDisplayInfo = async () => {
      const displayInfoMap: Record<string, { name: string; color: string; textColor: string }> = {};
      for (const order of filteredOrders) {
        if (!orderStatusDisplay[order.currentStatus]) { // Only fetch if not already cached
          displayInfoMap[order.currentStatus] = await getStatusDisplayInfo(order.currentStatus);
        }
      }
      if (Object.keys(displayInfoMap).length > 0) { // Only update state if there are new entries
        setOrderStatusDisplay(prev => ({ ...prev, ...displayInfoMap }));
      }
    };
    if (filteredOrders.length > 0 && allStatuses.length > 0) {
      fetchAllDisplayInfo();
    }
  }, [filteredOrders, getStatusDisplayInfo, allStatuses, orderStatusDisplay]); // Added orderStatusDisplay to deps
  
  const memoizedAvailableStatusesForDialog = useMemo(() => {
    return allStatuses.filter(s => !s.isSystemStatus || s.name === "Idea Submitted");
  }, [allStatuses]);

  if (!currentUser) return (
    <div className="flex h-screen w-full items-center justify-center">
      <p>Loading user data...</p>
    </div>
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Order Management</h1>
          <p className="page-description">
            View, track, and manage all customer orders.
          </p>
        </div>
        {canCreateOrder && (
          <CreateOrderDialog 
            currentUser={currentUser} 
            availableStatuses={memoizedAvailableStatusesForDialog} 
            onOrderCreated={() => {
              // Server action handles revalidation. We might just want to close dialog.
              // fetchOrderData(); // This might be redundant if revalidatePath works as expected.
            }}
          >
            <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-md hover:shadow-lg transition-shadow font-semibold">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create New Order
            </Button>
          </CreateOrderDialog>
        )}
      </div>

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-card-foreground text-xl">Order List</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">{currentUser.role === 'CRM' ? "Showing orders assigned to you." : "Showing all orders."}</CardDescription>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background h-10 rounded-md w-full"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CRM Contact</TableHead>
                  <TableHead>Assigned DR</TableHead>
                  <TableHead>Date Created</TableHead>
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
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="pr-6 text-right space-x-2">
                        <Skeleton className="h-8 w-8 inline-block rounded" />
                        <Skeleton className="h-8 w-8 inline-block rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    const statusInfo = orderStatusDisplay[order.currentStatus] || { name: order.currentStatus, color: '#ccc', textColor: '#000' };
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="pl-6">
                          <Link href={`/track/${order.id}`} className="font-medium text-primary hover:underline">
                            {order.id}
                          </Link>
                        </TableCell>
                        <TableCell className="text-card-foreground">{order.customerName} <br/><small className="text-muted-foreground">{order.companyName}</small></TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: statusInfo.color, color: statusInfo.textColor }} className="border-transparent">
                            {statusInfo.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-card-foreground">{order.crmUserName}</TableCell>
                        <TableCell className="text-card-foreground">{order.designerRepresentativeName || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground">{isClient ? formatDate(order.createdAt) : <Skeleton className="h-4 w-20" />}</TableCell>
                        <TableCell className="pr-6 text-right space-x-2 whitespace-nowrap">
                          {canAssignDr && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-9 px-3"
                              onClick={() => { setSelectedOrderForDrAssignment(order); setIsAssignDrDialogOpen(true); }}
                            >
                              <Users2 className="mr-1.5 h-4 w-4" /> {order.designerRepresentativeId ? "Re-assign DR" : "Assign DR"}
                            </Button>
                          )}
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
                            <Image src="https://placehold.co/240x180.png" alt="No orders" data-ai-hint="empty state document" width={180} height={135} className="mx-auto rounded-md opacity-60 mb-4" />
                            <p className="text-lg text-muted-foreground font-medium">
                              {searchTerm ? "No orders match your search." : "No orders found."}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {searchTerm ? "Try a different search term." : (canCreateOrder ? "Start by creating a new one!" : "Check back later for updates.")}
                            </p>
                             {canCreateOrder && !searchTerm && (
                                <CreateOrderDialog 
                                  currentUser={currentUser} 
                                  availableStatuses={memoizedAvailableStatusesForDialog}
                                  onOrderCreated={() => {
                                    // Server action handles revalidation.
                                  }}
                                >
                                    <Button size="sm" className="mt-4">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Create Order
                                    </Button>
                                </CreateOrderDialog>
                             )}
                        </TableCell>
                    </TableRow>
                 )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedOrderForDrAssignment && currentUser && allStatuses.length > 0 && (
        <AssignDrDialog
          isOpen={isAssignDrDialogOpen}
          onOpenChange={setIsAssignDrDialogOpen}
          order={selectedOrderForDrAssignment}
          currentUser={currentUser}
          allStatuses={allStatuses}
          onDrAssigned={() => {
            setIsAssignDrDialogOpen(false);
            // Server action handles revalidation
            // fetchOrderData(); // This might be redundant
          }}
        />
      )}
    </div>
  );
}

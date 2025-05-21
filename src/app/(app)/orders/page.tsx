
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Eye, Users2, Loader2, Trash2, AlertTriangle, MoreVertical, Settings2, Layers, Package, Edit3 } from "lucide-react"; 
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";
import type { TrackingLink, User, CustomStatus } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getContrastTextColor, getStatuses } from '@/lib/status-service'; 
import { getOrders } from '@/lib/order-service';
import { Skeleton } from '@/components/ui/skeleton';
import { createOrderAction, assignDrToOrderAction, deleteOrderAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CreateOrderDialog = dynamic(() => import('@/components/orders/create-order-dialog').then(mod => mod.CreateOrderDialog));
const AssignDrDialog = dynamic(() => import('@/components/orders/assign-dr-dialog').then(mod => mod.AssignDrDialog));
const EditOrderDialog = dynamic(() => import('@/components/orders/edit-order-dialog').then(mod => mod.EditOrderDialog));


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
  const { toast } = useToast();
  const [orders, setOrders] = useState<TrackingLink[]>([]);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  const [selectedOrderForDrAssignment, setSelectedOrderForDrAssignment] = useState<TrackingLink | null>(null);
  const [isAssignDrDialogOpen, setIsAssignDrDialogOpen] = useState(false);
  const [statusesForDialog, setStatusesForDialog] = useState<CustomStatus[] | null>(null);

  const [orderToDelete, setOrderToDelete] = useState<TrackingLink | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  const [orderToEdit, setOrderToEdit] = useState<TrackingLink | null>(null);
  const [isEditOrderDialogOpen, setIsEditOrderDialogOpen] = useState(false);


  const fetchOrderData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedStatuses] = await Promise.all([
        getOrders(),
        getStatuses()
      ]);
      setOrders(fetchedOrders);
      setAllStatuses(fetchedStatuses);
    } catch (error) {
      console.error("Failed to fetch orders or statuses:", error);
      toast({ title: "Error", description: "Could not load order data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setIsClient(true);
    if (currentUser) {
        fetchOrderData();
    }
  }, [currentUser, fetchOrderData]);

  const memoizedAvailableStatusesForDialog = useMemo(() => {
    return allStatuses.filter(s => s.isVisible !== false && (s.id === "order-submitted" || !s.isSystemStatus));
  }, [allStatuses]);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (currentUser?.role === 'CRM') {
      result = result.filter(order => order.crmUserId === currentUser.id);
    } else if (currentUser?.role === 'DESIGNER_REPRESENTATIVE') {
      result = result.filter(order => order.designerRepresentativeId === currentUser.id);
    }

    if (!searchTerm) return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return result.filter(order =>
      order.id.toLowerCase().includes(lowerSearchTerm) ||
      (order.companyName && order.companyName.toLowerCase().includes(lowerSearchTerm)) ||
      (order.phoneNumber && order.phoneNumber.toLowerCase().includes(lowerSearchTerm)) ||
      order.crmUserName.toLowerCase().includes(lowerSearchTerm) ||
      (order.designerRepresentativeName && order.designerRepresentativeName.toLowerCase().includes(lowerSearchTerm))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, searchTerm, currentUser]);

  const [orderStatusDisplay, setOrderStatusDisplay] = useState<Record<string, { name: string; color: string; textColor: string }>>({});
  
  const getStatusDisplayInfoCallback = useCallback((statusId: string): { name: string; color: string; textColor: string } => {
    const status = allStatuses.find(s => s.id === statusId);
    if (status) {
      return { name: status.name, color: status.color, textColor: getContrastTextColor(status.color) };
    }
    return { name: statusId, color: '#A1A1AA', textColor: '#FFFFFF' }; 
  }, [allStatuses]);

  useEffect(() => {
    if (allStatuses.length > 0) {
      const newDisplayInfoMap: Record<string, { name: string; color: string; textColor: string }> = {};
      const uniqueStatusIdsInScope = new Set<string>();
      filteredOrders.forEach(order => uniqueStatusIdsInScope.add(order.currentStatus));

      uniqueStatusIdsInScope.forEach(statusId => {
        newDisplayInfoMap[statusId] = getStatusDisplayInfoCallback(statusId);
      });
      
      // Only update if the map has actually changed to avoid potential loops
      setOrderStatusDisplay(prevMap => {
          if (JSON.stringify(newDisplayInfoMap) !== JSON.stringify(prevMap)) {
              return newDisplayInfoMap;
          }
          return prevMap;
      });
    } else if (Object.keys(orderStatusDisplay).length > 0) {
        setOrderStatusDisplay({}); // Clear if no statuses
    }
  }, [filteredOrders, allStatuses, getStatusDisplayInfoCallback]);


  const canCreateOrder = currentUser?.role === 'CRM' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';
  const canAssignDr = currentUser?.role === 'CRM' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';
  const canDeleteOrder = currentUser?.role === 'SYSTEM_ADMIN';
  // All authenticated users can edit basic order details for now
  const canEditOrder = !!currentUser;


  const handleOpenAssignDrDialog = useCallback(async (orderToAssign: TrackingLink) => {
    setIsLoading(true); 
    try {
        const freshStatuses = await getStatuses();
        if (!Array.isArray(freshStatuses)) {
            console.error("OrdersPage/handleOpenAssignDrDialog: getStatuses() did not return an array. Received:", freshStatuses);
            toast({ title: "Error", description: "Failed to load status configuration. Please try again.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        console.log("OrdersPage/handleOpenAssignDrDialog: Fresh statuses fetched for dialog. IDs:", freshStatuses.map(s=>({id: s.id, name: s.name})).join(', '));
        
        const rfdCheck = freshStatuses.find(s => s.id === 'ready-for-design');
        
        if (!rfdCheck) {
            console.error("OrdersPage/handleOpenAssignDrDialog: CRITICAL - 'ready-for-design' status (ID: 'ready-for-design') NOT FOUND in freshStatuses from getStatuses().");
            toast({
                title: "Configuration Error",
                description: "The required system status 'Ready for Design' (ID: ready-for-design) is missing. Please ensure it is configured in Admin > Status Management. DR assignment is not possible.",
                variant: "destructive",
                duration: 10000,
            });
            setIsLoading(false);
            return; 
        }
        console.log("OrdersPage/handleOpenAssignDrDialog: Found 'ready-for-design' status:", JSON.stringify(rfdCheck));

        setAllStatuses(freshStatuses); 
        setStatusesForDialog(freshStatuses); 
        setSelectedOrderForDrAssignment(orderToAssign);
        setIsAssignDrDialogOpen(true);
    } catch (error) {
        console.error("OrdersPage/handleOpenAssignDrDialog: Error preparing assign DR dialog:", error);
        toast({ title: "Error", description: "Could not prepare DR assignment dialog. Check console.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);


  const handleDrAssignmentSuccess = useCallback(async (updatedOrderFromAction: TrackingLink) => {
      setOrders(prevOrders =>
        prevOrders.map(o => (o.id === updatedOrderFromAction.id ? updatedOrderFromAction : o))
      );
      toast({ title: "DR Assigned", description: `${updatedOrderFromAction.designerRepresentativeName} assigned to order ${updatedOrderFromAction.id}.` });
      // await fetchOrderData(); // Re-fetch for full reconciliation, can be optional
  }, [toast]);


  const handleDeleteOrder = async () => {
    if (!orderToDelete || !canDeleteOrder) return;
    setIsDeletingOrder(true);
    const result = await deleteOrderAction(orderToDelete.id);
    if (result.success) {
      toast({ title: "Order Deleted", description: `Order ${orderToDelete.id} has been deleted successfully.` });
      await fetchOrderData(); 
    } else {
      toast({ title: "Deletion Failed", description: result.error || "Could not delete the order.", variant: "destructive" });
    }
    setIsDeletingOrder(false);
    setIsDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const handleOrderUpdated = useCallback(async () => {
    toast({ title: "Order Updated", description: "Order details have been saved."});
    await fetchOrderData();
    setIsEditOrderDialogOpen(false);
    setOrderToEdit(null);
  }, [toast, fetchOrderData]);


  if (!currentUser) return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6 p-1 sm:p-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Order Management</h1>
          <p className="page-description">
            View, track, and manage all customer orders.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
            {(currentUser.role === 'SYSTEM_ADMIN') && (
              <Link href="/admin/service-management" passHref>
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-10 rounded-md shadow-md hover:shadow-lg transition-shadow">
                  <Settings2 className="mr-2 h-4 w-4" /> Configure Options
                </Button>
              </Link>
            )}
            {(currentUser.role === 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN') && (
              <Link href="/admin/model-management" passHref>
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-10 rounded-md shadow-md hover:shadow-lg transition-shadow">
                  <Layers className="mr-2 h-4 w-4" /> Configure Models
                </Button>
              </Link>
            )}
            {canCreateOrder && (
            <CreateOrderDialog
                currentUser={currentUser}
                availableStatuses={memoizedAvailableStatusesForDialog}
                onOrderCreated={async () => {
                  await fetchOrderData();
                }}
            >
                <Button
                size="lg"
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-md hover:shadow-lg transition-shadow font-semibold h-10"
                disabled={isLoading || (allStatuses.length === 0 && memoizedAvailableStatusesForDialog.length === 0)}
                >
                {(isLoading && allStatuses.length === 0 && memoizedAvailableStatusesForDialog.length === 0) ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                    <PlusCircle className="mr-2 h-5 w-5" />
                )}
                {(isLoading && allStatuses.length === 0 && memoizedAvailableStatusesForDialog.length === 0) ? "Loading Data..." : "Create New Order"}
                </Button>
            </CreateOrderDialog>
            )}
        </div>
      </div>

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-grow">
              <CardTitle className="text-card-foreground text-xl">Order List</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">
                {currentUser.role === 'CRM' ? "Showing orders assigned to you." : 
                 currentUser.role === 'DESIGNER_REPRESENTATIVE' ? "Showing orders assigned to you." : 
                 "Showing all orders."}
              </CardDescription>
            </div>
            <div className="relative flex-grow sm:flex-grow-0 sm:max-w-xs w-full sm:w-auto">
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
                  <TableHead>Company</TableHead>
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
                        <Skeleton className="h-9 w-9 inline-block rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    const statusInfo = orderStatusDisplay[order.currentStatus] || { name: order.currentStatus, color: '#A1A1AA', textColor: '#FFFFFF' };
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="pl-6">
                          <Link href={`/track/${order.id}`} className="font-medium text-primary hover:underline">
                            {order.id}
                          </Link>
                        </TableCell>
                        <TableCell className="text-card-foreground">
                          <div>{order.companyName}</div>
                        </TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: statusInfo.color, color: statusInfo.textColor }} className="border-transparent">
                            {statusInfo.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-card-foreground">{order.crmUserName}</TableCell>
                        <TableCell className="text-card-foreground">{order.designerRepresentativeName || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground">{isClient ? formatDate(order.createdAt) : <Skeleton className="h-4 w-20" />}</TableCell>
                        <TableCell className="pr-6 text-right space-x-2 whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9" title="Order Actions">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEditOrder && (
                                <DropdownMenuItem
                                  onSelect={() => { setOrderToEdit(order); setIsEditOrderDialogOpen(true); }}
                                  className="cursor-pointer"
                                >
                                  <Edit3 className="mr-2 h-4 w-4" /> Edit Order
                                </DropdownMenuItem>
                              )}
                              {canAssignDr && (
                                <DropdownMenuItem
                                  onSelect={() => handleOpenAssignDrDialog(order)}
                                  className="cursor-pointer"
                                >
                                  <Users2 className="mr-2 h-4 w-4" />
                                  {order.designerRepresentativeId ? "Re-assign DR" : "Assign DR"}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href={`/track/${order.id}`}>
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </Link>
                              </DropdownMenuItem>
                              {canDeleteOrder && (
                                <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setOrderToDelete(order);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete Order
                                </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 h-[300px]">
                            <Package className="mx-auto h-12 w-12 opacity-50 mb-3 text-muted-foreground" />
                            <p className="text-lg text-muted-foreground font-medium">
                              {searchTerm ? "No orders match your search." : 
                               (currentUser.role === 'CRM' ? "You have no orders." : 
                                currentUser.role === 'DESIGNER_REPRESENTATIVE' ? "No orders assigned to you." : 
                                "No orders found.")
                              }
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {searchTerm ? "Try a different search term." : 
                                (canCreateOrder ? "Start by creating a new one!" : 
                                 currentUser.role === 'DESIGNER_REPRESENTATIVE' ? "Check back later for assigned orders." :
                                 "Check back later for updates.")}
                            </p>
                             {canCreateOrder && !searchTerm && (
                                <CreateOrderDialog
                                  currentUser={currentUser}
                                  availableStatuses={memoizedAvailableStatusesForDialog}
                                  onOrderCreated={async () => {
                                    await fetchOrderData();
                                  }}
                                >
                                    <Button size="sm" className="mt-4" disabled={isLoading || (allStatuses.length === 0)}>
                                      {(isLoading && allStatuses.length === 0) ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      ) : (
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                      )}
                                      {(isLoading && allStatuses.length === 0) ? "Loading Data..." : "Create Order"}
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

      {statusesForDialog && selectedOrderForDrAssignment && currentUser && isAssignDrDialogOpen && (
        <AssignDrDialog
          isOpen={isAssignDrDialogOpen}
          onOpenChange={(open) => {
            setIsAssignDrDialogOpen(open);
            if (!open) {
              setSelectedOrderForDrAssignment(null);
              setStatusesForDialog(null);
            }
          }}
          order={selectedOrderForDrAssignment}
          currentUser={currentUser}
          allStatuses={statusesForDialog}
          onDrAssigned={handleDrAssignmentSuccess}
        />
      )}

      {orderToEdit && currentUser && isEditOrderDialogOpen && (
        <EditOrderDialog
          isOpen={isEditOrderDialogOpen}
          onOpenChange={(open) => {
            setIsEditOrderDialogOpen(open);
            if (!open) setOrderToEdit(null);
          }}
          order={orderToEdit}
          currentUser={currentUser}
          onOrderUpdated={handleOrderUpdated}
        />
      )}

      {orderToDelete && isDeleteDialogOpen && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" /> Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete order "<span className="font-semibold">{orderToDelete.id}</span>".
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setOrderToDelete(null); setIsDeleteDialogOpen(false); }} disabled={isDeletingOrder}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteOrder}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={isDeletingOrder}
              >
                {isDeletingOrder ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Deleting...</> : "Yes, delete order"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

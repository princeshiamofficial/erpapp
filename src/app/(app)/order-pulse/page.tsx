"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Eye, Users2, Loader2, Trash2, Edit3, MoreVertical, Package as PackageIcon, Settings2, Layers, Repeat, Activity } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useSocket } from "@/contexts/socket-context";
import Link from "next/link";
import type { TrackingLink, CustomStatus, GlobalSettings } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getStatuses } from '@/lib/status-service';
import { getContrastTextColor } from '@/lib/color-utils';
import { getOrderPulsesPaginated, OrderPulse } from '@/lib/order-service';
import { getGlobalSettings } from '@/lib/settings-service';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteOrderAction } from '../orders/actions';
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
import { cn } from "@/lib/utils";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, startOfMonth, endOfMonth, differenceInMonths, subMonths } from 'date-fns';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";
import { DateRangePicker4, type PredefinedRange4 } from '@/components/dashboard/date-range-picker4';
import { DateRangePicker3 } from '@/components/dashboard/date-range-picker3';
import type { DateRange } from "react-day-picker";

const CreateOrderDialog = dynamic(() => import('@/components/orders/create-order-dialog').then(mod => mod.CreateOrderDialog), { ssr: false });
const AssignDrDialog = dynamic(() => import('@/components/orders/assign-dr-dialog').then(mod => mod.AssignDrDialog), { ssr: false });
const EditOrderDialog = dynamic(() => import('@/components/orders/edit-order-dialog').then(mod => mod.EditOrderDialog), { ssr: false });

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), 'd MMM yyyy');
  } catch (e) {
    console.error("Invalid date string for formatting:", dateString, e);
    return "Invalid Date";
  }
};

const ITEMS_PER_PAGE = 25;

export default function OrderPulsePage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [pulses, setPulses] = useState<OrderPulse[]>([]);
  const [totalPulses, setTotalPulses] = useState(0);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [globalAppSettings, setGlobalAppSettings] = useState<GlobalSettings | null>(null);

  const [selectedOrderForDrAssignment, setSelectedOrderForDrAssignment] = useState<TrackingLink | null>(null);
  const [isAssignDrDialogOpen, setIsAssignDrDialogOpen] = useState(false);
  const [statusesForDialog, setStatusesForDialog] = useState<CustomStatus[] | null>(null);

  const [orderToDelete, setOrderToDelete] = useState<TrackingLink | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  const [orderToEdit, setOrderToEdit] = useState<TrackingLink | null>(null);
  const [isEditOrderDialogOpen, setIsEditOrderDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInactivityThreshold, setSelectedInactivityThreshold] = useState<PredefinedRange4>("6Months");
  const [pulseStatusFilter, setPulseStatusFilter] = useState<"Active" | "Inactive">("Inactive");
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);

  const [isCreateOrderDialogOpen, setIsCreateOrderDialogOpen] = useState(false);


  useEffect(() => {
    setCurrentPage(1);
  }, [selectedInactivityThreshold, debouncedSearchTerm, pulseStatusFilter, selectedDateRange]);

  const fetchOrderData = useCallback(async () => {
    if (!currentUser) {
      return;
    }
    if (pulses.length === 0) {
      setIsLoading(true);
    }
    try {
      const startStr = (!debouncedSearchTerm && selectedDateRange?.from) ? format(startOfDay(selectedDateRange.from), 'yyyy-MM-dd HH:mm:ss') : undefined;
      const endStr = (!debouncedSearchTerm && selectedDateRange?.to) ? format(endOfDay(selectedDateRange.to), 'yyyy-MM-dd HH:mm:ss') : undefined;
      const thresholdMonths = selectedInactivityThreshold === '3Months' ? 3 : selectedInactivityThreshold === '6Months' ? 6 : 12;

      const [fetchedResult, fetchedStatuses, fetchedSettings] = await Promise.all([
        getOrderPulsesPaginated(startStr, endStr, thresholdMonths, pulseStatusFilter, currentPage, ITEMS_PER_PAGE, debouncedSearchTerm),
        getStatuses(),
        getGlobalSettings()
      ]);
      setPulses(fetchedResult.pulses);
      setTotalPulses(fetchedResult.total);
      setAllStatuses(fetchedStatuses);
      setGlobalAppSettings(fetchedSettings);
    } catch (error) {
      console.error("Failed to fetch order pulses, statuses, or settings:", error);
      toast({ title: "Error", description: "Could not load order pulse data.", variant: "destructive" });
      setPulses([]);
      setTotalPulses(0);
      setAllStatuses([]);
      setGlobalAppSettings(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast, pulses.length, selectedDateRange, debouncedSearchTerm, selectedInactivityThreshold, pulseStatusFilter, currentPage]);

  useEffect(() => {
    setIsClient(true);
    fetchOrderData();
  }, [fetchOrderData]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on("order-updated", (data: any) => {
      console.log("Order updated remotely:", data);
      fetchOrderData();
    });

    return () => {
      socket.off("order-updated");
    };
  }, [socket, fetchOrderData]);

  const memoizedAvailableStatusesForDialog = useMemo(() => {
    return allStatuses.filter(s => s.isVisible !== false);
  }, [allStatuses]);



  const handleDateRangeChange = (range: DateRange | undefined, label: string, predefined: PredefinedRange4) => {
    setSelectedInactivityThreshold(predefined);
  };

  const totalPages = Math.ceil(totalPulses / ITEMS_PER_PAGE);

  const [orderStatusDisplay, setOrderStatusDisplay] = useState<Record<string, { name: string; color: string; textColor: string }>>({});

  const getStatusDisplayInfo = useCallback((statusId: string): { name: string; color: string; textColor: string } => {
    const status = allStatuses.find(s => s.id === statusId);
    if (status) {
      return { name: status.name, color: status.color, textColor: getContrastTextColor(status.color) };
    }
    return { name: statusId, color: '#A1A1AA', textColor: '#FFFFFF' };
  }, [allStatuses]);

  useEffect(() => {
    if (allStatuses.length > 0 && pulses.length > 0) {
      const newDisplayInfoMap: Record<string, { name: string; color: string; textColor: string }> = {};
      const uniqueStatusIdsInScope = new Set<string>();
      pulses.forEach(pulse => uniqueStatusIdsInScope.add(pulse.lastOrderStatus));

      uniqueStatusIdsInScope.forEach(statusId => {
        newDisplayInfoMap[statusId] = getStatusDisplayInfo(statusId);
      });

      setOrderStatusDisplay(prevMap => {
        if (JSON.stringify(newDisplayInfoMap) !== JSON.stringify(prevMap)) {
          return newDisplayInfoMap;
        }
        return prevMap;
      });
    } else if (Object.keys(orderStatusDisplay).length > 0 && (allStatuses.length === 0 || pulses.length === 0)) {
      setOrderStatusDisplay({});
    }
  }, [pulses, allStatuses, getStatusDisplayInfo]);


  const canCreateOrder = currentUser?.role === 'CRM' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';
  const canAssignDr = currentUser?.role === 'CRM' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';

  const canEditOrder = useMemo(() => {
    if (!currentUser || !globalAppSettings) return false;
    if (currentUser.role === 'SYSTEM_ADMIN') return true;
    return (globalAppSettings.rolesAllowedToEditOrders?.includes(currentUser.role) ?? false);
  }, [currentUser, globalAppSettings]);

  const canDeleteOrder = useMemo(() => {
    if (!currentUser || !globalAppSettings) return false;
    if (currentUser.role === 'SYSTEM_ADMIN') return true;
    return (globalAppSettings.rolesAllowedToDeleteOrders?.includes(currentUser.role) ?? false);
  }, [currentUser, globalAppSettings]);


  const handleOpenAssignDrDialog = useCallback(async (orderToAssign: TrackingLink) => {
    setIsLoading(true);
    try {
      const freshStatuses = await getStatuses();
      if (!Array.isArray(freshStatuses)) {
        toast({ title: "Error", description: "Failed to load status configuration for DR assignment. Please try again.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const rfdCheck = freshStatuses.find(s => s.id === 'ready-for-design');
      if (!rfdCheck) {
        toast({
          title: "Configuration Alert!",
          description: "The required system status 'Ready for Design' (ID: ready-for-design) is missing or not configured correctly. Please contact an administrator. DR assignment is not possible.",
          variant: "destructive",
          duration: 10000,
        });
        setIsLoading(false);
        return;
      }

      setAllStatuses(freshStatuses);
      setStatusesForDialog(freshStatuses);
      setSelectedOrderForDrAssignment(orderToAssign);
      setIsAssignDrDialogOpen(true);
    } catch (error) {
      toast({ title: "Error", description: "Could not prepare DR assignment dialog. Check console.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleDrAssignmentSuccess = useCallback(async (updatedOrderFromAction: TrackingLink) => {
    await fetchOrderData();
    toast({ title: "DR Assigned", description: `${updatedOrderFromAction.designerRepresentativeName} assigned to order ${updatedOrderFromAction.id}.` });
  }, [toast, fetchOrderData]);

  const handleDeleteOrder = async () => {
    if (!orderToDelete || !canDeleteOrder || !currentUser) return;
    setIsDeletingOrder(true);
    const result = await deleteOrderAction(orderToDelete.id, currentUser);
    if (result.success) {
      toast({ title: "Moved to Trash", description: `Order ${orderToDelete.id} has been moved to the trash bin.` });
      await fetchOrderData();
    } else {
      toast({ title: "Deletion Failed", description: result.error || "Could not delete the order.", variant: "destructive" });
    }
    setIsDeletingOrder(false);
    setIsDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const handleOpenEditOrderDialog = (order: TrackingLink) => {
    if (!currentUser || !currentUser.role) {
      toast({ title: "Authentication Error", description: "Cannot edit order. User not properly authenticated.", variant: "destructive" });
      return;
    }
    setOrderToEdit(order);
    setIsEditOrderDialogOpen(true);
  };

  const handleOrderUpdated = useCallback(async (updatedOrder: TrackingLink) => {
    await fetchOrderData();
    toast({ title: "Order Updated", description: "Order details have been successfully updated." });
    setIsEditOrderDialogOpen(false);
    setOrderToEdit(null);
  }, [toast, fetchOrderData]);

  const renderPagination = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);

      if (currentPage < 3) endPage = maxPagesToShow;
      else if (currentPage > totalPages - 2) startPage = totalPages - maxPagesToShow + 1;

      if (startPage > 1) {
        pageNumbers.push(1);
        if (startPage > 2) pageNumbers.push('...');
      }
      for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    return pageNumbers.map((page, index) => (
      <PaginationItem key={index}>
        {page === '...' ? <PaginationEllipsis />
          : <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(page as number); }} className={cn(currentPage === page && 'bg-primary text-primary-foreground hover:bg-primary/90')}>
            {page}
          </PaginationLink>
        }
      </PaginationItem>
    ));
  };


  if (!currentUser) return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6 p-1 sm:p-0">


      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Order Pulse</h2>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={pulseStatusFilter}
                onValueChange={(value: "Active" | "Inactive") => setPulseStatusFilter(value)}
              >
                <SelectTrigger className="w-[130px] h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {pulseStatusFilter === "Inactive" && (
                <DateRangePicker4
                  value={selectedInactivityThreshold}
                  onValueChange={setSelectedInactivityThreshold}
                  className="h-10"
                />
              )}
              <div className="relative flex-grow sm:flex-grow-0 sm:max-w-xs w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pulses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background h-10 rounded-md w-full"
                />
              </div>
              <DateRangePicker3 initialRange={selectedDateRange} onDateRangeChange={(range) => setSelectedDateRange(range)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Company / Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Total Orders</TableHead>
                  <TableHead>Last Order Status</TableHead>
                  <TableHead>Recent Pulse</TableHead>
                  <TableHead>CRM Contact</TableHead>
                  <TableHead>Last Order Date</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                      <TableCell className="pl-6"><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="pr-6 text-right space-x-2">
                        <Skeleton className="h-9 w-9 inline-block rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : pulses.length > 0 ? (
                  pulses.map((pulseData) => {
                    const statusInfo = orderStatusDisplay[pulseData.lastOrderStatus] || { name: pulseData.lastOrderStatus, color: '#A1A1AA', textColor: '#FFFFFF' };
                    return (
                      <TableRow key={pulseData.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="pl-6 font-medium text-card-foreground">
                          {pulseData.companyName}
                        </TableCell>
                        <TableCell className="text-card-foreground">
                          {pulseData.phoneNumber}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-semibold text-sm">
                            {pulseData.totalOrders}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: statusInfo.color, color: statusInfo.textColor }} className="font-medium text-xs border-none tracking-wide px-2 py-0.5 whitespace-nowrap">
                            {statusInfo.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("border-transparent font-medium", pulseData.statusColor)}>
                            {pulseData.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-card-foreground">{pulseData.crmUserName}</TableCell>
                        <TableCell className="text-muted-foreground">{isClient ? formatDate(pulseData.lastOrderDate) : <Skeleton className="h-4 w-20" />}</TableCell>
                        <TableCell className="pr-6 text-right space-x-2 whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9" title="Pulse Actions">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href={`/track/${pulseData.lastOrderId}`}>
                                  <Eye className="mr-2 h-4 w-4" /> View Last Order
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 h-[300px]">
                      <Activity className="mx-auto h-12 w-12 opacity-50 mb-3 text-muted-foreground" />
                      <p className="text-lg text-muted-foreground font-medium">
                        {searchTerm ? "No orders match your search." :
                          (currentUser?.role === 'CRM' ? "You have no orders." :
                            currentUser?.role === 'DESIGNER_REPRESENTATIVE' ? "No orders assigned to you." :
                              "No orders found.")
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ? "Try a different search term." :
                          (canCreateOrder ? "Start by creating a new one!" :
                            currentUser?.role === 'DESIGNER_REPRESENTATIVE' ? "Check back later for assigned orders." :
                              "Check back later for updates.")}
                      </p>
                      {canCreateOrder && !searchTerm && (
                        <CreateOrderDialog
                          currentUser={currentUser}
                          availableStatuses={memoizedAvailableStatusesForDialog}
                          onOrderCreated={async () => {
                            await fetchOrderData();
                          }}
                          allOrders={[]}
                          isOpen={isCreateOrderDialogOpen}
                          onOpenChange={setIsCreateOrderDialogOpen}
                        >
                          <Button size="sm" className="mt-4" disabled={isLoading || (allStatuses.length === 0)}>
                            {(isLoading && allStatuses.length === 0) ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <PlusCircle className="mr-2 h-4 w-4" />
                            )}
                            {(isLoading && allStatuses.length === 0) ? "Loading Data..." : "Create Pulse"}
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
        <CardFooter className="py-4 border-t">
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }}
                    aria-disabled={currentPage === 1}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                {renderPagination()}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                    aria-disabled={currentPage === totalPages}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardFooter>
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

      {isEditOrderDialogOpen && orderToEdit && currentUser && globalAppSettings && (
        <EditOrderDialog
          isOpen={isEditOrderDialogOpen}
          onOpenChange={(open) => {
            setIsEditOrderDialogOpen(open);
            if (!open) setOrderToEdit(null);
          }}
          order={orderToEdit}
          currentUser={currentUser}
          onOrderUpdated={handleOrderUpdated}
          allOrders={[]}
        />
      )}

      {orderToDelete && isDeleteDialogOpen && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                Move to Trash Bin?
              </AlertDialogTitle>
              <AlertDialogDescription>
                The order "<span className="font-semibold">{orderToDelete.id}</span>" will be moved to the trash bin. It can be restored or permanently deleted from there.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setOrderToDelete(null); setIsDeleteDialogOpen(false); }} disabled={isDeletingOrder}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteOrder}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={isDeletingOrder}
              >
                {isDeletingOrder ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Moving to Trash...</> : "Move to Trash"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

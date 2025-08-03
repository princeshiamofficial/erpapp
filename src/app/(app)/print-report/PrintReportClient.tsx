
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, PlusCircle, Eye, Edit, MoreVertical, UserPlus, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { TrackingLink, OrderItem, User, CustomStatus } from '@/types';
import { assignMeToAction, deleteOrderAction } from './actions';
import { getOrdersForReport } from '@/lib/report-service';
import { getUsers } from '@/lib/user-service'; 
import { getStatuses, getContrastTextColor } from '@/lib/status-service';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/auth-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const AddEditTaskDialog = dynamic(() => import('@/components/print-report/AddEditTaskDialog').then(mod => mod.AddEditTaskDialog));

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

interface PrintReportItem {
  orderId: string;
  projectIdDisplay: string;
  orderDate: string;
  creatorName: string;
  creatorAvatarUrl?: string | null;
  assignedLrName: string;
  assignedLrAvatarUrl?: string | null;
  originalOrder: TrackingLink;
}

interface PrintReportClientProps {
    initialOrders: TrackingLink[];
    initialUsers: User[];
    initialStatuses: CustomStatus[];
    serverCurrentUser: User | null;
}

export function PrintReportClient({ initialOrders, initialUsers, initialStatuses, serverCurrentUser }: PrintReportClientProps) {
  const [reportItems, setReportItems] = useState<PrintReportItem[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>(initialUsers);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>(initialStatuses);
  const [isLoading, setIsLoading] = useState(false); // Used for subsequent fetches/actions
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { currentUser: authContextUser } = useAuth();
  const currentUser = authContextUser || serverCurrentUser;

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TrackingLink | null>(null);
  
  const [taskToDelete, setTaskToDelete] = useState<TrackingLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const processFetchedData = useCallback((orders: TrackingLink[], users: User[]) => {
      const userMap = new Map(users.map(u => [u.id, u]));
      const flattenedItems: PrintReportItem[] = orders.map(order => {
        const creator = userMap.get(order.crmUserId);
        const assignedLr = order.designerRepresentativeId ? userMap.get(order.designerRepresentativeId) : null;
        
        return {
            orderId: order.id,
            projectIdDisplay: order.projectIdDisplay || order.id,
            orderDate: order.createdAt,
            creatorName: order.crmUserName,
            creatorAvatarUrl: creator?.avatarUrl,
            assignedLrName: order.designerRepresentativeName || 'N/A',
            assignedLrAvatarUrl: assignedLr?.avatarUrl,
            originalOrder: order,
        }
      });
      setReportItems(flattenedItems);
  }, []);

  // Initial data hydration
  useEffect(() => {
    processFetchedData(initialOrders, initialUsers);
  }, [initialOrders, initialUsers, processFetchedData]);


  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedUsers, fetchedStatuses] = await Promise.all([
        getOrdersForReport({ limit: 500, orderBy: 'createdAt', direction: 'desc' }),
        getUsers(),
        getStatuses()
      ]);
      
      setAllUsers(fetchedUsers);
      setAllStatuses(fetchedStatuses);
      processFetchedData(fetchedOrders, fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch report data:", error);
      toast({ title: "Error", description: "Could not load data for the report.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, processFetchedData]);
  
  const filteredItems = useMemo(() => {
    if (!searchTerm) return reportItems;
    const lowercasedFilter = searchTerm.toLowerCase();
    return reportItems.filter(item =>
      item.projectIdDisplay.toLowerCase().includes(lowercasedFilter) ||
      item.creatorName.toLowerCase().includes(lowercasedFilter) ||
      item.assignedLrName.toLowerCase().includes(lowercasedFilter)
    );
  }, [reportItems, searchTerm]);
  
  const getStatusDisplayInfo = useCallback((statusId: string): { name: string; color: string; textColor: string } => {
    const status = allStatuses.find(s => s.id === statusId);
    if (status) {
      return { name: status.name, color: status.color, textColor: getContrastTextColor(status.color) };
    }
    // Fallback for statuses not in DB, like potentially "Waiting" or "Printed" if not added
    if (statusId.toLowerCase() === 'waiting') return { name: 'Waiting', color: '#FBBF24', textColor: '#000000' };
    if (statusId.toLowerCase() === 'printed') return { name: 'Printed', color: '#34D399', textColor: '#000000' };

    return { name: statusId, color: '#A1A1AA', textColor: '#FFFFFF' };
  }, [allStatuses]);

  const handleOpenAddDialog = () => {
    setEditingTask(null);
    setIsAddEditOpen(true);
  };
  
  const handleOpenEditDialog = (order: TrackingLink) => {
    setEditingTask(order);
    setIsAddEditOpen(true);
  };
  
  const handleTaskSaved = () => {
    setIsAddEditOpen(false);
    setEditingTask(null);
    fetchReportData(); 
  };

  const handleAssignMe = async (order: TrackingLink) => {
    if (!currentUser) return;
    
    setReportItems(prevItems => prevItems.map(item => 
      item.orderId === order.id 
        ? { ...item, assignedLrName: currentUser.name, assignedLrAvatarUrl: currentUser.avatarUrl, originalOrder: { ...item.originalOrder, designerRepresentativeId: currentUser.id, designerRepresentativeName: currentUser.name } }
        : item
    ));

    const result = await assignMeToAction(order.id, currentUser);
    if (!result.success) {
      toast({
        title: "Assignment Failed",
        description: result.error || "Could not assign task.",
        variant: "destructive",
      });
      fetchReportData(); // Re-fetch to revert optimistic update
    } else {
      toast({
        title: "Task Assigned",
        description: `You have been assigned to task ${order.id}.`,
      });
    }
  };

  const handleDeleteRequest = (order: TrackingLink) => {
    setTaskToDelete(order);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;

    setIsDeleting(true);
    const result = await deleteOrderAction(taskToDelete.id);
    setIsDeleting(false);

    if (result.success) {
        toast({ title: "Task Deleted", description: "The task has been successfully removed." });
        setTaskToDelete(null);
        fetchReportData();
    } else {
        toast({ title: "Deletion Failed", description: result.error || "Could not delete the task.", variant: "destructive" });
    }
  };


  return (
    <>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 print:p-0">
        <div className="print:hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
            <div>
              <h1 className="page-title">Print Production Report</h1>
              <p className="page-description">
                A summary of all items required for printing across all orders.
              </p>
            </div>
            <Button size="lg" className="w-full sm:w-auto" onClick={handleOpenAddDialog} disabled={!currentUser}>
              <PlusCircle className="mr-2 h-5 w-5" />
              Add New Task
            </Button>
          </div>
        </div>

        <Card className="shadow-xl border bg-card rounded-lg overflow-hidden print:shadow-none print:border-none print:rounded-none">
          <CardHeader className="border-b p-5 print:border-b-2 print:border-black">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-grow">
                <CardTitle className="text-card-foreground text-xl print:text-2xl print:text-black">Production Task List</CardTitle>
                <CardDescription className="text-muted-foreground text-sm mt-0.5 print:hidden">
                  A detailed list of every item that needs to be printed. Use the search to filter.
                </CardDescription>
                 <p className="hidden print:block text-sm text-gray-600">Report generated on: {format(new Date(), "PPP p")}</p>
              </div>
              <div className="relative flex-grow sm:flex-grow-0 sm:max-w-xs w-full sm:w-auto print:hidden">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
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
                    <TableHead className="pl-6 w-[150px]">Task ID</TableHead>
                    <TableHead>Task Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Creator Name</TableHead>
                    <TableHead>Assigned LR</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && reportItems.length === 0 ? ( // Show skeleton only on initial load
                    [...Array(10)].map((_, i) => (
                      <TableRow key={`skel-report-${i}`}>
                        <TableCell className="pl-6"><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                        <TableCell><div className="flex items-center gap-2"><Skeleton className="h-6 w-6 rounded-full" /><Skeleton className="h-5 w-32" /></div></TableCell>
                        <TableCell><div className="flex items-center gap-2"><Skeleton className="h-6 w-6 rounded-full" /><Skeleton className="h-5 w-32" /></div></TableCell>
                        <TableCell className="pr-6 text-right"><Skeleton className="h-9 w-20 inline-block rounded-md" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredItems.length > 0 ? (
                    filteredItems.map((item, index) => {
                      const statusInfo = getStatusDisplayInfo(item.originalOrder.currentStatus);
                      return (
                        <TableRow key={`${item.orderId}-${index}`} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="pl-6 font-mono text-sm text-primary">{item.projectIdDisplay}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {item.orderDate ? format(parseISO(item.orderDate), 'd MMM, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge style={{ backgroundColor: statusInfo.color, color: statusInfo.textColor }} className="border-transparent">
                              {statusInfo.name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={item.creatorAvatarUrl || undefined} alt={item.creatorName} />
                                <AvatarFallback className="text-xs">{getInitials(item.creatorName)}</AvatarFallback>
                              </Avatar>
                              <span>{item.creatorName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                            {item.assignedLrName !== 'N/A' && (
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={item.assignedLrAvatarUrl || undefined} alt={item.assignedLrName} />
                                <AvatarFallback className="text-xs">{getInitials(item.assignedLrName)}</AvatarFallback>
                              </Avatar>
                            )}
                              <span>{item.assignedLrName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            {currentUser?.role === 'LR' && item.originalOrder.designerRepresentativeId !== currentUser.id ? (
                              <Button variant="outline" size="sm" onClick={() => handleAssignMe(item.originalOrder)}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Assign Me
                              </Button>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => handleOpenEditDialog(item.originalOrder)} className="cursor-pointer">
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="cursor-pointer">
                                      <Link href={`/track/${item.orderId}`}>
                                        <Eye className="mr-2 h-4 w-4" /> View
                                      </Link>
                                    </DropdownMenuItem>
                                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN') && (
                                      <DropdownMenuItem onSelect={() => handleDeleteRequest(item.originalOrder)} className="cursor-pointer text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                      </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        {searchTerm ? `No items match "${searchTerm}".` : "No items to report."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {currentUser && (
        <AddEditTaskDialog
          isOpen={isAddEditOpen}
          onOpenChange={setIsAddEditOpen}
          onTaskSaved={handleTaskSaved}
          task={editingTask}
          currentUser={currentUser}
          allStatuses={allStatuses}
        />
      )}

      {taskToDelete && (
        <Dialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
          <DialogContent>
            <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                    This will permanently delete task <span className="font-semibold">{taskToDelete.projectIdDisplay || taskToDelete.id}</span>. This action cannot be undone.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setTaskToDelete(null)} disabled={isDeleting}>Cancel</Button>
                <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

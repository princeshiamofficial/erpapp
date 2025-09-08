
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Eye, Users2, Loader2, Trash2, Edit3, MoreVertical, Package as PackageIcon, Settings2, Layers, RefreshCw, Repeat, FileText } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";
import type { TrackingLink, User, CustomStatus, GlobalSettings } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getContrastTextColor, getStatuses } from '@/lib/status-service';
import { getQuotations } from '@/lib/quotation-service';
import { getGlobalSettings } from '@/lib/settings-service';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteQuotationAction } from './actions';
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
import { format, parseISO } from 'date-fns';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";

const CreateQuotationDialog = dynamic(() => import('@/components/quotations/create-quotation-dialog').then(mod => mod.CreateQuotationDialog));
const AssignDrToQuotationDialog = dynamic(() => import('@/components/quotations/assign-dr-to-quotation-dialog').then(mod => mod.AssignDrToQuotationDialog));
const EditQuotationDialog = dynamic(() => import('@/components/quotations/edit-quotation-dialog').then(mod => mod.EditQuotationDialog));


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

export default function QuotationsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [quotations, setQuotations] = useState<TrackingLink[]>([]);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [globalAppSettings, setGlobalAppSettings] = useState<GlobalSettings | null>(null);

  const [selectedQuotationForDrAssignment, setSelectedQuotationForDrAssignment] = useState<TrackingLink | null>(null);
  const [isAssignDrDialogOpen, setIsAssignDrDialogOpen] = useState(false);
  const [statusesForDialog, setStatusesForDialog] = useState<CustomStatus[] | null>(null);

  const [quotationToDelete, setQuotationToDelete] = useState<TrackingLink | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingQuotation, setIsDeletingQuotation] = useState(false);

  const [quotationToEdit, setQuotationToEdit] = useState<TrackingLink | null>(null);
  const [isEditQuotationDialogOpen, setIsEditQuotationDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewType, setViewType] = useState<'quotations' | 're-quotations'>('quotations');


  const fetchQuotationData = useCallback(async () => {
    if (!currentUser) {
      return;
    }
    if (quotations.length === 0) {
      setIsLoading(true);
    }
    try {
      const [fetchedQuotations, fetchedStatuses, fetchedSettings] = await Promise.all([
        getQuotations(),
        getStatuses(),
        getGlobalSettings()
      ]);
      setQuotations(fetchedQuotations);
      setAllStatuses(fetchedStatuses);
      setGlobalAppSettings(fetchedSettings);
    } catch (error) {
      console.error("Failed to fetch quotations, statuses, or settings:", error);
      toast({ title: "Error", description: "Could not load quotation data or settings.", variant: "destructive" });
      setQuotations([]);
      setAllStatuses([]);
      setGlobalAppSettings(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast, quotations.length]);

  useEffect(() => {
    setIsClient(true);
    fetchQuotationData(); 

    const interval = setInterval(() => {
      console.log("Auto-refreshing quotation data...");
      fetchQuotationData();
    }, 10000); 

    return () => clearInterval(interval);
  }, [fetchQuotationData]);


  const memoizedAvailableStatusesForDialog = useMemo(() => {
    return allStatuses.filter(s => s.isVisible !== false);
  }, [allStatuses]);

  const filteredQuotations = useMemo(() => {
    let result = quotations;
    if (currentUser?.role === 'CRM') {
      result = result.filter(quotation => quotation.crmUserId === currentUser.id);
    } else if (currentUser?.role === 'DESIGNER_REPRESENTATIVE') {
      result = result.filter(quotation => quotation.designerRepresentativeId === currentUser.id);
    }
    
    if (viewType === 're-quotations') {
        const jobCounts = result.reduce((acc, quotation) => {
            const jobId = (quotation.companyName || '').split(' • ')[0].trim();
            if (jobId) {
                acc[jobId] = (acc[jobId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const reorderJobIds = new Set(Object.keys(jobCounts).filter(jobId => jobCounts[jobId] > 1));
        
        result = result.filter(quotation => {
            const jobId = (quotation.companyName || '').split(' • ')[0].trim();
            return jobId && reorderJobIds.has(jobId);
        });
    }

    if (!searchTerm) return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const lowerSearchTerm = searchTerm.toLowerCase();
    return result.filter(quotation =>
      quotation.id.toLowerCase().includes(lowerSearchTerm) ||
      (quotation.companyName && quotation.companyName.toLowerCase().includes(lowerSearchTerm)) ||
      (quotation.phoneNumber && quotation.phoneNumber.toLowerCase().includes(lowerSearchTerm)) ||
      quotation.crmUserName.toLowerCase().includes(lowerSearchTerm) ||
      (quotation.designerRepresentativeName && quotation.designerRepresentativeName.toLowerCase().includes(lowerSearchTerm))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [quotations, searchTerm, currentUser, viewType]);

  const totalPages = Math.ceil(filteredQuotations.length / ITEMS_PER_PAGE);

  const paginatedQuotations = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuotations.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredQuotations, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, viewType]);

  const [quotationStatusDisplay, setQuotationStatusDisplay] = useState<Record<string, { name: string; color: string; textColor: string }>>({});

  const getStatusDisplayInfo = useCallback((statusId: string): { name: string; color: string; textColor: string } => {
    const status = allStatuses.find(s => s.id === statusId);
    if (status) {
      return { name: status.name, color: status.color, textColor: getContrastTextColor(status.color) };
    }
    return { name: statusId, color: '#A1A1AA', textColor: '#FFFFFF' };
  }, [allStatuses]);

  useEffect(() => {
    if (allStatuses.length > 0 && filteredQuotations.length > 0) {
      const newDisplayInfoMap: Record<string, { name: string; color: string; textColor: string }> = {};
      const uniqueStatusIdsInScope = new Set<string>();
      filteredQuotations.forEach(quotation => uniqueStatusIdsInScope.add(quotation.currentStatus));

      uniqueStatusIdsInScope.forEach(statusId => {
        newDisplayInfoMap[statusId] = getStatusDisplayInfo(statusId);
      });

      setQuotationStatusDisplay(prevMap => {
        if (JSON.stringify(newDisplayInfoMap) !== JSON.stringify(prevMap)) {
          return newDisplayInfoMap;
        }
        return prevMap;
      });
    } else if (Object.keys(quotationStatusDisplay).length > 0 && (allStatuses.length === 0 || filteredQuotations.length === 0)) {
      setQuotationStatusDisplay({});
    }
  }, [filteredQuotations, allStatuses, getStatusDisplayInfo]);


  const canCreateQuotation = currentUser?.role === 'CRM' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';
  const canAssignDr = currentUser?.role === 'CRM' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';

  const canEditQuotation = useMemo(() => {
    if (!currentUser || !globalAppSettings) return false;
    if (currentUser.role === 'SYSTEM_ADMIN') return true;
    return (globalAppSettings.rolesAllowedToEditOrders?.includes(currentUser.role) ?? false);
  }, [currentUser, globalAppSettings]);

  const canDeleteQuotation = useMemo(() => {
    if (!currentUser || !globalAppSettings) return false;
    if (currentUser.role === 'SYSTEM_ADMIN') return true;
    return (globalAppSettings.rolesAllowedToDeleteOrders?.includes(currentUser.role) ?? false);
  }, [currentUser, globalAppSettings]);


  const handleOpenAssignDrDialog = useCallback(async (quotationToAssign: TrackingLink) => {
    setIsLoading(true); 
    try {
      console.log("QuotationsPage/handleOpenAssignDrDialog: Opening for quotation:", quotationToAssign.id);
      const freshStatuses = await getStatuses();
      if (!Array.isArray(freshStatuses)) {
        console.error("QuotationsPage/handleOpenAssignDrDialog: getStatuses() did not return an array. Received:", freshStatuses);
        toast({ title: "Error", description: "Failed to load status configuration for DR assignment. Please try again.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const rfdCheck = freshStatuses.find(s => s.id === 'ready-for-design');
      if (rfdCheck) {
      } else {
        console.error("QuotationsPage/handleOpenAssignDrDialog: CRITICAL - 'ready-for-design' status (ID: 'ready-for-design') NOT FOUND in freshStatuses from getStatuses().");
        toast({
          title: "Configuration Error",
          description: "The required system status 'Ready for Design' (ID: ready-for-design) is missing. Please ensure it is configured in Admin > Status Management. DR assignment is not possible.",
          variant: "destructive",
          duration: 10000,
        });
        setIsLoading(false);
        return;
      }

      setAllStatuses(freshStatuses); 
      setStatusesForDialog(freshStatuses);
      setSelectedQuotationForDrAssignment(quotationToAssign);
      setIsAssignDrDialogOpen(true);
    } catch (error) {
      console.error("QuotationsPage/handleOpenAssignDrDialog: Error preparing assign DR dialog:", error);
      toast({ title: "Error", description: "Could not prepare DR assignment dialog. Check console.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleDrAssignmentSuccess = useCallback(async (updatedQuotationFromAction: TrackingLink) => {
    setQuotations(prevQuotations =>
      prevQuotations.map(o => (o.id === updatedQuotationFromAction.id ? updatedQuotationFromAction : o))
    );
    toast({ title: "DR Assigned", description: `${updatedQuotationFromAction.designerRepresentativeName} assigned to quotation ${updatedQuotationFromAction.id}.` });
  }, [toast]);

  const handleDeleteQuotation = async () => {
    if (!quotationToDelete || !canDeleteQuotation || !currentUser) return;
    setIsDeletingQuotation(true);
    const result = await deleteQuotationAction(quotationToDelete.id, currentUser);
    if (result.success) {
      toast({ title: "Quotation Deleted", description: `Quotation ${quotationToDelete.id} has been deleted successfully.` });
      await fetchQuotationData();
    } else {
      toast({ title: "Deletion Failed", description: result.error || "Could not delete the quotation.", variant: "destructive" });
    }
    setIsDeletingQuotation(false);
    setIsDeleteDialogOpen(false);
    setQuotationToDelete(null);
  };

  const handleOpenEditQuotationDialog = (quotation: TrackingLink) => {
    if (!currentUser || !currentUser.role) {
      toast({ title: "Authentication Error", description: "Cannot edit quotation. User not properly authenticated.", variant: "destructive" });
      console.error("QuotationsPage/handleOpenEditQuotationDialog: currentUser is invalid.", currentUser);
      return;
    }
    console.log("QuotationsPage/handleOpenEditQuotationDialog: Opening for quotation:", quotation.id, "with currentUser:", JSON.stringify(currentUser));
    setQuotationToEdit(quotation);
    setIsEditQuotationDialogOpen(true);
  };

  const handleQuotationUpdated = useCallback(async (updatedQuotation: TrackingLink) => {
    setQuotations(prevQuotations => 
      prevQuotations.map(o => o.id === updatedQuotation.id ? updatedQuotation : o)
    );
    toast({ title: "Quotation Updated", description: "Quotation details have been successfully updated."});
    setIsEditQuotationDialogOpen(false);
    setQuotationToEdit(null);
  }, [toast]);

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
        : <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(page as number);}} className={cn(currentPage === page && 'bg-primary text-primary-foreground hover:bg-primary/90')}>
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Quotation Management</h1>
          <p className="page-description">
            View, track, and manage all customer quotations.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={fetchQuotationData} disabled={isLoading} className="h-10 w-10" title="Refresh Data">
            <RefreshCw className={cn("h-5 w-5", isLoading && quotations.length > 0 && "animate-spin")} />
          </Button>
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
          {canCreateQuotation && (
            <CreateQuotationDialog
              currentUser={currentUser}
              availableStatuses={memoizedAvailableStatusesForDialog}
              onQuotationCreated={async () => {
                await fetchQuotationData();
              }}
              allQuotations={quotations}
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
                {(isLoading && allStatuses.length === 0 && memoizedAvailableStatusesForDialog.length === 0) ? "Loading Data..." : "Create New Quotation"}
              </Button>
            </CreateQuotationDialog>
          )}
        </div>
      </div>

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-grow flex items-center gap-2">
              <Button
                variant={viewType === 'quotations' ? 'default' : 'outline'}
                onClick={() => setViewType('quotations')}
                className="h-10 rounded-md"
              >
                <FileText className="mr-2 h-4 w-4" />
                Quotations
              </Button>
              <Button
                variant={viewType === 're-quotations' ? 'default' : 'outline'}
                onClick={() => setViewType('re-quotations')}
                className="h-10 rounded-md"
              >
                <Repeat className="mr-2 h-4 w-4" />
                Re-Quotations
              </Button>
            </div>
            <div className="relative flex-grow sm:flex-grow-0 sm:max-w-xs w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quotations..."
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
                  <TableHead className="pl-6">Quotation ID</TableHead>
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
                  [...Array(10)].map((_, i) => (
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
                ) : paginatedQuotations.length > 0 ? (
                  paginatedQuotations.map((quotation) => {
                    const statusInfo = quotationStatusDisplay[quotation.currentStatus] || { name: quotation.currentStatus, color: '#A1A1AA', textColor: '#FFFFFF' };
                    return (
                      <TableRow key={quotation.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="pl-6">
                          <Link href={`/track/${quotation.id}`} className="font-medium text-primary hover:underline">
                            {quotation.id}
                          </Link>
                        </TableCell>
                        <TableCell className="text-card-foreground">
                          <div>{quotation.companyName}</div>
                        </TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: statusInfo.color, color: statusInfo.textColor }} className="border-transparent">
                            {statusInfo.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-card-foreground">{quotation.crmUserName}</TableCell>
                        <TableCell className="text-card-foreground">{quotation.designerRepresentativeName || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground">{isClient ? formatDate(quotation.createdAt) : <Skeleton className="h-4 w-20" />}</TableCell>
                        <TableCell className="pr-6 text-right space-x-2 whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9" title="Quotation Actions">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEditQuotation && (
                                <DropdownMenuItem
                                  onSelect={() => handleOpenEditQuotationDialog(quotation)}
                                  disabled={!currentUser || !currentUser.role} 
                                  className="cursor-pointer"
                                >
                                  <Edit3 className="mr-2 h-4 w-4" /> Edit Quotation
                                </DropdownMenuItem>
                              )}
                              {canAssignDr && (
                                <DropdownMenuItem
                                  onSelect={() => handleOpenAssignDrDialog(quotation)}
                                  className="cursor-pointer"
                                >
                                  <Users2 className="mr-2 h-4 w-4" />
                                  {quotation.designerRepresentativeId ? "Re-assign DR" : "Assign DR"}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href={`/track/${quotation.id}`}>
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </Link>
                              </DropdownMenuItem>
                              {canDeleteQuotation && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setQuotationToDelete(quotation);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Quotation
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
                      <PackageIcon className="mx-auto h-12 w-12 opacity-50 mb-3 text-muted-foreground" />
                      <p className="text-lg text-muted-foreground font-medium">
                        {searchTerm ? "No quotations match your search." :
                          (currentUser?.role === 'CRM' ? "You have no quotations." :
                            currentUser?.role === 'DESIGNER_REPRESENTATIVE' ? "No quotations assigned to you." :
                              "No quotations found.")
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ? "Try a different search term." :
                          (canCreateQuotation ? "Start by creating a new one!" :
                            currentUser?.role === 'DESIGNER_REPRESENTATIVE' ? "Check back later for assigned quotations." :
                              "Check back later for updates.")}
                      </p>
                      {canCreateQuotation && !searchTerm && (
                        <CreateQuotationDialog
                          currentUser={currentUser}
                          availableStatuses={memoizedAvailableStatusesForDialog}
                          onQuotationCreated={async () => {
                            await fetchQuotationData();
                          }}
                          allQuotations={quotations}
                        >
                          <Button size="sm" className="mt-4" disabled={isLoading || (allStatuses.length === 0)}>
                            {(isLoading && allStatuses.length === 0) ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <PlusCircle className="mr-2 h-4 w-4" />
                            )}
                            {(isLoading && allStatuses.length === 0) ? "Loading Data..." : "Create Quotation"}
                          </Button>
                        </CreateQuotationDialog>
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

      {statusesForDialog && selectedQuotationForDrAssignment && currentUser && isAssignDrDialogOpen && (
        <AssignDrToQuotationDialog
          isOpen={isAssignDrDialogOpen}
          onOpenChange={(open) => {
            setIsAssignDrDialogOpen(open);
            if (!open) {
              setSelectedQuotationForDrAssignment(null);
              setStatusesForDialog(null);
            }
          }}
          quotation={selectedQuotationForDrAssignment}
          currentUser={currentUser}
          allStatuses={statusesForDialog}
          onDrAssigned={handleDrAssignmentSuccess}
        />
      )}

      {isEditQuotationDialogOpen && quotationToEdit && currentUser && globalAppSettings && (
        <EditQuotationDialog
          isOpen={isEditQuotationDialogOpen}
          onOpenChange={(open) => {
            setIsEditQuotationDialogOpen(open);
            if (!open) setQuotationToEdit(null);
          }}
          quotation={quotationToEdit}
          currentUser={currentUser}
          onQuotationUpdated={handleQuotationUpdated}
        />
      )}

      {quotationToDelete && isDeleteDialogOpen && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete quotation "<span className="font-semibold">{quotationToDelete.id}</span>".
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setQuotationToDelete(null); setIsDeleteDialogOpen(false); }} disabled={isDeletingQuotation}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteQuotation}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={isDeletingQuotation}
              >
                {isDeletingQuotation ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Yes, delete quotation"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

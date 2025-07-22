
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, MoreVertical, Loader2, ShoppingCart, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { PurchaseRequest, PurchaseRequestStatus, User } from '@/types';
import { getPurchaseRequestsAction, deletePurchaseRequestAction } from './actions';
import { format } from 'date-fns';

const AddEditPurchaseRequestDialog = dynamic(() => import('@/components/purchase-request/AddEditPurchaseRequestDialog').then(mod => mod.AddEditPurchaseRequestDialog));
const DeletePurchaseRequestDialog = dynamic(() => import('@/components/purchase-request/DeletePurchaseRequestDialog').then(mod => mod.DeletePurchaseRequestDialog));

const formatCurrency = (value?: number | null): string => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

export default function PurchaseRequestPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null);

  const [requestToDelete, setRequestToDelete] = useState<PurchaseRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedRequests = await getPurchaseRequestsAction();
      setRequests(fetchedRequests);
    } catch (error) {
      toast({ title: "Error", description: "Could not load purchase requests.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser) {
      fetchRequests();
    }
  }, [currentUser, fetchRequests]);

  const filteredRequests = useMemo(() => {
    if (currentUser?.role === 'VENDOR') {
      return [];
    }
    
    let userFilteredRequests = requests;

    if (!searchTerm) return userFilteredRequests;
    
    return userFilteredRequests.filter(req =>
      (req.item && req.item.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (req.requestedByUserName && req.requestedByUserName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (req.requestId && req.requestId.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [requests, searchTerm, currentUser]);


  const getStatusBadgeClass = (status: PurchaseRequestStatus) => {
    switch (status) {
      case 'Approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Purchased': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'Pending':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const handleOpenAddDialog = () => {
    setEditingRequest(null);
    setIsAddEditOpen(true);
  };
  
  const handleOpenEditDialog = (req: PurchaseRequest) => {
    setEditingRequest(req);
    setIsAddEditOpen(true);
  };
  
  const handleRequestSaved = () => {
    setIsAddEditOpen(false);
    setEditingRequest(null);
    fetchRequests();
  };

  const handleDelete = async () => {
    if (!requestToDelete) return;
    setIsDeleting(true);
    const result = await deletePurchaseRequestAction(requestToDelete.id);
    if (result.success) {
      toast({ title: "Request Deleted", description: "The purchase request has been removed." });
      fetchRequests();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsDeleting(false);
    setRequestToDelete(null);
  };


  if (!currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const canModify = (req: PurchaseRequest) => {
      if (!currentUser) return false;
      if (currentUser.role === 'SYSTEM_ADMIN' || currentUser.role === 'ADMIN') return true;
      return currentUser.id === req.requestedByUserId;
  }

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
          <div>
            <h1 className="page-title">Purchase Requests</h1>
            <p className="page-description">
              Create, track, and manage all purchase requests for the company.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-md hover:shadow-lg transition-shadow h-10"
              onClick={handleOpenAddDialog}
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Create Request
            </Button>
          </div>
        </div>

        <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-grow">
                      <CardTitle className="text-card-foreground text-xl">Request List</CardTitle>
                      <CardDescription className="text-muted-foreground text-sm mt-0.5">A list of all purchase requests.</CardDescription>
                  </div>
                  <div className="relative flex-grow sm:flex-grow-0 sm:max-w-xs w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                      placeholder="Search requests..."
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
                    <TableHead className="pl-6">Request ID</TableHead>
                    <TableHead>Item Description</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(4)].map((_, i) => (
                      <TableRow key={`skel-${i}`}>
                        <TableCell className="pl-6"><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                        <TableCell className="pr-6 text-right"><Skeleton className="h-9 w-9 inline-block rounded-md" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredRequests.length > 0 ? (
                    filteredRequests.map((req, index) => (
                      <TableRow key={req.id || `req-${index}`} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="pl-6 font-mono text-sm text-primary">{req.requestId}</TableCell>
                        <TableCell className="text-card-foreground font-medium">{req.item}</TableCell>
                        <TableCell className="text-card-foreground">{req.quantity}</TableCell>
                        <TableCell className="text-card-foreground font-semibold">{formatCurrency(req.price)}</TableCell>
                        <TableCell className="text-muted-foreground">{req.requestedByUserName}</TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(req.date), 'd MMM yyyy')}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeClass(req.status)}>{req.status}</Badge>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          {canModify(req) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleOpenEditDialog(req)} className="cursor-pointer">
                                  <Edit className="mr-2 h-4 w-4" /> Edit / View
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setRequestToDelete(req)} className="text-destructive focus:text-destructive cursor-pointer">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 h-[300px]">
                        <ShoppingCart className="mx-auto h-12 w-12 opacity-50 mb-3 text-muted-foreground" />
                        <p className="text-lg text-muted-foreground font-medium">No purchase requests found.</p>
                        <p className="text-sm text-muted-foreground">
                          {searchTerm ? "Try adjusting your search term." : "Create a new request to get started."}
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

      <AddEditPurchaseRequestDialog
        isOpen={isAddEditOpen}
        onOpenChange={setIsAddEditOpen}
        onSave={handleRequestSaved}
        request={editingRequest}
        currentUser={currentUser}
      />

      {requestToDelete && (
         <DeletePurchaseRequestDialog
            isOpen={!!requestToDelete}
            onOpenChange={() => setRequestToDelete(null)}
            onConfirmDelete={handleDelete}
            request={requestToDelete}
            isDeleting={isDeleting}
         />
      )}
    </>
  );
}

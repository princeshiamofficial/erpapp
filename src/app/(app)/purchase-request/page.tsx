
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Placeholder types, to be replaced with actual types from /types/index.ts later
interface PurchaseRequest {
  id: string;
  item: string;
  quantity: number;
  requestedBy: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Purchased';
  date: string;
}

export default function PurchaseRequestPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    // In a real app, this would fetch from a service.
    // For now, we'll use placeholder data.
    setTimeout(() => {
      const placeholderData: PurchaseRequest[] = [
        { id: 'PR-001', item: 'Dell XPS 15 Laptop', quantity: 2, requestedBy: 'Admin User', status: 'Approved', date: new Date().toISOString() },
        { id: 'PR-002', item: 'Ergonomic Office Chairs', quantity: 5, requestedBy: 'Admin User', status: 'Pending', date: new Date().toISOString() },
        { id: 'PR-003', item: 'Wacom Drawing Tablets', quantity: 3, requestedBy: 'System Admin', status: 'Purchased', date: new Date().toISOString() },
        { id: 'PR-004', item: 'A4 Paper Reams', quantity: 50, requestedBy: 'Admin User', status: 'Rejected', date: new Date().toISOString() },
      ];
      setRequests(placeholderData);
      setIsLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    if (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN')) {
      fetchRequests();
    } else if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router, fetchRequests]);

  const filteredRequests = useMemo(() => {
    if (!searchTerm) return requests;
    return requests.filter(req =>
      req.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requestedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [requests, searchTerm]);

  const getStatusBadgeVariant = (status: PurchaseRequest['status']) => {
    switch (status) {
      case 'Approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Purchased': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'Pending':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };


  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN')) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
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
            onClick={() => toast({ title: "Coming Soon!", description: "Creating purchase requests will be available soon."})}
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
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                      <TableCell className="pr-6 text-right"><Skeleton className="h-9 w-9 inline-block rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredRequests.length > 0 ? (
                  filteredRequests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="pl-6 font-medium text-primary">{req.id}</TableCell>
                      <TableCell className="text-card-foreground">{req.item}</TableCell>
                      <TableCell className="text-card-foreground">{req.quantity}</TableCell>
                      <TableCell className="text-muted-foreground">{req.requestedBy}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(req.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeVariant(req.status)}>{req.status}</Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => toast({title: "Info", description: `Viewing details for ${req.id}`})}>
                              <Edit className="mr-2 h-4 w-4" /> Edit / View
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => toast({title: "Info", description: `Deleting ${req.id}`})} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 h-[300px]">
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
  );
}

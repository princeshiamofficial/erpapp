"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { FileText, Eye, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TrackingLink, CustomStatus, AdvancePaymentRecord } from '@/types';
import { getOrders } from '@/lib/order-service';
import { getStatuses, getContrastTextColor } from '@/lib/status-service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

export default function InvoicePage() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [allOrders, setAllOrders] = useState<TrackingLink[]>([]);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInvoiceData = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedStatuses] = await Promise.all([
        getOrders(),
        getStatuses(),
      ]);
      setAllOrders(fetchedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setAllStatuses(fetchedStatuses);
    } catch (error) {
      console.error("Failed to fetch orders or statuses:", error);
      toast({ title: "Error", description: "Could not load invoice data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchInvoiceData();
  }, [fetchInvoiceData]);

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return allOrders;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allOrders.filter(order =>
      order.id.toLowerCase().includes(lowerSearchTerm) ||
      (order.companyName && order.companyName.toLowerCase().includes(lowerSearchTerm)) ||
      (order.phoneNumber && order.phoneNumber.toLowerCase().includes(lowerSearchTerm)) ||
      order.crmUserName.toLowerCase().includes(lowerSearchTerm)
    );
  }, [allOrders, searchTerm]);

  const getOrderFinancials = useCallback((order: TrackingLink) => {
    const orderSubtotal = (order.orderItems || []).reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
    const effectiveDiscount = order.specialClientDiscount || 0;
    const netPayable = orderSubtotal - effectiveDiscount;

    const allAdvancePaymentRecords: AdvancePaymentRecord[] = [];
    if (order.advancePayments && order.advancePayments.length > 0) {
      allAdvancePaymentRecords.push(...order.advancePayments);
    } else if (order.advancePayment && order.advancePayment > 0) {
      allAdvancePaymentRecords.push({
        id: 'legacy-advance',
        amount: order.advancePayment,
        date: order.createdAt,
        paymentMethod: order.paymentMethod || "Unknown",
        notes: "Initial advance payment (legacy data).",
        recordedByUserId: order.crmUserId,
        recordedByUserName: order.crmUserName,
      });
    }

    const totalAdvancePaid = allAdvancePaymentRecords.reduce((sum, record) => sum + record.amount, 0);
    const amountDue = netPayable - totalAdvancePaid;

    return { totalAmount: netPayable, paidAmount: totalAdvancePaid, dueAmount: amountDue };
  }, []);

  const getStatusDisplayInfo = useCallback((statusId: string): { name: string; color: string; textColor: string } => {
    const status = allStatuses.find(s => s.id === statusId);
    if (status) {
      return { name: status.name, color: status.color, textColor: getContrastTextColor(status.color) };
    }
    return { name: 'N/A', color: '#A1A1AA', textColor: '#FFFFFF' };
  }, [allStatuses]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <h1 className="page-title">Invoices</h1>
            <p className="page-description">
              View and manage all order invoices.
            </p>
          </div>
        </div>
      </div>

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-grow">
              <CardTitle className="text-card-foreground text-xl">All Order Invoices</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">
                A list of all generated orders and their financial status.
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
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <TableRow key={`skel-invoice-${i}`}>
                      <TableCell className="pl-6"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                      <TableCell className="pr-6 text-right"><Skeleton className="h-9 w-24 inline-block rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    const financials = getOrderFinancials(order);
                    const statusInfo = getStatusDisplayInfo(order.currentStatus);
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="pl-6 font-medium text-primary">
                          <Link href={`/track/${order.id}`} className="hover:underline">
                            {order.id}
                          </Link>
                        </TableCell>
                        <TableCell className="text-card-foreground">{order.companyName}</TableCell>
                        <TableCell className="text-card-foreground font-mono">{formatCurrency(financials.totalAmount)}</TableCell>
                        <TableCell className="text-green-600 font-mono">{formatCurrency(financials.paidAmount)}</TableCell>
                        <TableCell className="text-red-600 font-mono">{formatCurrency(financials.dueAmount)}</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: statusInfo.color, color: statusInfo.textColor }} className="border-transparent">
                            {statusInfo.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <Button asChild variant="outline" size="sm" className="h-9 px-3">
                            <Link href={`/track/${order.id}`} target="_blank" rel="noopener noreferrer">
                              <Eye className="mr-1.5 h-4 w-4" /> View Invoice
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 h-[300px]">
                       <Package className="mx-auto h-12 w-12 opacity-50 mb-3 text-muted-foreground" />
                       <p className="text-lg text-muted-foreground font-medium">No orders found.</p>
                       <p className="text-sm text-muted-foreground">
                         {searchTerm ? "Try adjusting your search term." : "Create a new order to see it here."}
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

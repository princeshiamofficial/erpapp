
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Wallet, ArrowUpDown, Download, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllPaymentHistory } from '@/lib/payment-history-service';
import type { BillReport } from '@/types';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { DateRangePicker, type DateRange } from '@/components/dashboard/date-range-picker';
import Papa from 'papaparse';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from '@/lib/utils';
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


const ITEMS_PER_PAGE = 25;

const formatCurrency = (value?: number | null): string => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

const formatDateSafe = (dateString?: string) => {
  if (!dateString) return 'No Date';
  try {
    return format(parseISO(dateString), 'd MMM, yyyy');
  } catch (e) {
    return 'Invalid Date';
  }
};

type SortKey = 'vendorName' | 'date' | 'payment';
type SortDirection = 'asc' | 'desc';

// Mock data to demonstrate different statuses
const fallbackData: BillReport[] = [
    { id: 'fb-1', vendorId: 'V-001', vendorName: 'PrintSource Inc.', date: subDays(new Date(), 2).toISOString(), invoiceId: 'INV-2024-001', amount: 5000, payment: 5000, method: 'Bank Transfer', status: 'Approved' },
    { id: 'fb-2', vendorId: 'V-002', vendorName: 'Creative Papers', date: subDays(new Date(), 5).toISOString(), invoiceId: 'INV-2024-002', amount: 12000, payment: 0, method: 'N/A', status: 'Pending' },
    { id: 'fb-3', vendorId: 'V-001', vendorName: 'PrintSource Inc.', date: subDays(new Date(), 10).toISOString(), invoiceId: 'INV-2024-003', amount: 7500, payment: 7500, method: 'Cash', status: 'Approved' },
];

export default function PaymentHistoryPage() {
  const { toast } = useToast();
  const [allPayments, setAllPayments] = useState<BillReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  
  const [reportToUpdateStatus, setReportToUpdateStatus] = useState<BillReport | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedPayments = await getAllPaymentHistory();
      // If no real data, use fallback data to show UI capabilities
      setAllPayments(fetchedPayments.length > 0 ? fetchedPayments : fallbackData);
    } catch (error) {
      toast({ title: "Error", description: "Could not load payment history.", variant: "destructive" });
      setAllPayments(fallbackData); // Use fallback on error too
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAndSortedPayments = useMemo(() => {
    let results = [...allPayments];

    if (selectedDateRange?.from) {
      const startDate = startOfDay(selectedDateRange.from);
      const endDate = selectedDateRange.to ? endOfDay(selectedDateRange.to) : endOfDay(startDate);
      results = results.filter(payment => {
        try {
          const paymentDate = parseISO(payment.date);
          return isWithinInterval(paymentDate, { start: startDate, end: endDate });
        } catch {
          return false;
        }
      });
    }

    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      results = results.filter(p =>
        p.vendorName.toLowerCase().includes(lowerSearchTerm) ||
        p.invoiceId.toLowerCase().includes(lowerSearchTerm) ||
        p.method.toLowerCase().includes(lowerSearchTerm) ||
        (p.status && p.status.toLowerCase().includes(lowerSearchTerm))
      );
    }

    if (sortConfig !== null) {
      results.sort((a, b) => {
        let aValue: string | number = a[sortConfig.key];
        let bValue: string | number = b[sortConfig.key];

        if (sortConfig.key === 'date') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return results;
  }, [allPayments, searchTerm, selectedDateRange, sortConfig]);
  
  const totalAmount = useMemo(() => filteredAndSortedPayments.reduce((sum, p) => sum + p.amount, 0), [filteredAndSortedPayments]);
  const totalPayment = useMemo(() => filteredAndSortedPayments.reduce((sum, p) => sum + p.payment, 0), [filteredAndSortedPayments]);

  const totalPages = Math.ceil(filteredAndSortedPayments.length / ITEMS_PER_PAGE);

  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedPayments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedPayments, currentPage]);
  
  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };
  
  const getSortIndicator = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };
  
  const handleExport = () => {
    if (filteredAndSortedPayments.length === 0) {
      toast({ title: "No Data to Export", description: "There is no data matching the current filters." });
      return;
    }
    const dataToExport = filteredAndSortedPayments.map(p => ({
      'Order ID': p.vendorName,
      'Company': p.invoiceId, 
      'Payment Amount': p.payment,
      'Reference': p.invoiceId,
      'Status': p.status || (p.payment > 0 ? 'Paid' : 'Unpaid'),
      'Method': p.method,
      'Date': formatDateSafe(p.date),
    }));
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'payment_history.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStatusChangeRequest = (report: BillReport) => {
    // For now, only allow changing for 'Pending' or 'Approved' statuses
    if (report.status === 'Pending' || report.status === 'Approved') {
      setReportToUpdateStatus(report);
    } else {
        toast({ title: "Action Not Allowed", description: `Cannot change status from "${report.status}".`, variant: "default" });
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!reportToUpdateStatus) return;
    
    setIsUpdatingStatus(true);
    const newStatus = reportToUpdateStatus.status === 'Approved' ? 'Pending' : 'Approved';

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // UI-only update
    setAllPayments(prev => 
        prev.map(p => 
            p.id === reportToUpdateStatus.id ? { ...p, status: newStatus } : p
        )
    );
    
    setIsUpdatingStatus(false);
    setReportToUpdateStatus(null);
    
    toast({
      title: "Status Updated",
      description: `Status for ${reportToUpdateStatus.invoiceId} changed to ${newStatus}.`,
    });
  };

  return (
    <>
    <div className="space-y-6">
      <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-primary" />
                  Payment History
                </CardTitle>
                <CardDescription className="mt-1">
                  A comprehensive log of all bills and payments to vendors.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
                 {selectedDateRange && <DateRangePicker initialRange={selectedDateRange} onDateRangeChange={(r) => setSelectedDateRange(r)} />}
                 <Button variant="outline" onClick={handleExport} disabled={filteredAndSortedPayments.length === 0}><Download className="mr-2 h-4 w-4"/>Export</Button>
              </div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => requestSort('vendorName')}>Order ID {getSortIndicator('vendorName')}</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => requestSort('payment')}>Payment Amount {getSortIndicator('payment')}</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort('date')}>Date {getSortIndicator('date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                      <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-28"/></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-20"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                    </TableRow>
                  ))
                ) : paginatedPayments.length > 0 ? (
                  paginatedPayments.map((p) => (
                    <TableRow key={p.id} onDoubleClick={() => handleStatusChangeRequest(p)} className="cursor-pointer">
                      <TableCell className="font-medium">{p.vendorName}</TableCell>
                      <TableCell>{p.vendorName}</TableCell>
                      <TableCell className="text-right font-mono text-green-600">{p.payment > 0 ? formatCurrency(p.payment) : '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{p.invoiceId}</TableCell>
                       <TableCell>
                        <Badge variant={p.status === 'Approved' || p.payment > 0 ? 'default' : (p.status === 'Pending' ? 'outline' : 'destructive')} className={cn(
                          p.status === 'Approved' || p.payment > 0 ? 'bg-green-100 text-green-800' : 
                          p.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        )}>
                            {p.status || (p.payment > 0 ? 'Paid' : 'Unpaid')}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.method}</TableCell>
                      <TableCell>{formatDateSafe(p.date)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-48">No payment records found.</TableCell>
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
                  <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} aria-disabled={currentPage === 1} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}/>
                </PaginationItem>
                {/* {renderPagination()} */}
                <PaginationItem>
                  <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}/>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardFooter>
      </Card>
    </div>

    {reportToUpdateStatus && (
        <AlertDialog open={!!reportToUpdateStatus} onOpenChange={() => setReportToUpdateStatus(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-primary"/>
                        Confirm Status Change
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to change the status for invoice <span className="font-semibold">{reportToUpdateStatus.invoiceId}</span> from "<span className="font-semibold">{reportToUpdateStatus.status}</span>" to "<span className="font-semibold">{reportToUpdateStatus.status === 'Approved' ? 'Pending' : 'Approved'}</span>"?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isUpdatingStatus} onClick={() => setReportToUpdateStatus(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmStatusChange} disabled={isUpdatingStatus}>
                        {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Confirm
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}
    </>
  );
}

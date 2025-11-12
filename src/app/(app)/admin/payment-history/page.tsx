
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Wallet, ArrowUpDown, Download } from 'lucide-react';
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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedPayments = await getAllPaymentHistory();
      setAllPayments(fetchedPayments);
    } catch (error) {
      toast({ title: "Error", description: "Could not load payment history.", variant: "destructive" });
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
        p.method.toLowerCase().includes(lowerSearchTerm)
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
      'Vendor Name': p.vendorName,
      'Date': formatDateSafe(p.date),
      'Invoice/Payment ID': p.invoiceId,
      'Bill Amount': p.amount,
      'Payment Amount': p.payment,
      'Method': p.method,
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

  const renderPagination = () => {
    // Omitting for brevity, would be same as other paginated pages
    return null;
  };

  return (
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
                    placeholder="Search by vendor, ID..."
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
                  <TableHead className="cursor-pointer" onClick={() => requestSort('date')}>Date {getSortIndicator('date')}</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => requestSort('payment')}>Payment Amount {getSortIndicator('payment')}</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                      <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-28"/></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-20"/></TableCell>
                    </TableRow>
                  ))
                ) : paginatedPayments.length > 0 ? (
                  paginatedPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.vendorName}</TableCell>
                      <TableCell>{formatDateSafe(p.date)}</TableCell>
                      <TableCell className="font-mono text-xs">{p.invoiceId}</TableCell>
                      <TableCell className="text-right font-mono text-green-600">{p.payment > 0 ? formatCurrency(p.payment) : '-'}</TableCell>
                      <TableCell>{p.method}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-48">No payment records found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
              {!isLoading && paginatedPayments.length > 0 && (
                  <TableFooter>
                      <TableRow className="font-bold">
                          <TableCell colSpan={3}>Total for Period</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(totalPayment)}</TableCell>
                          <TableCell></TableCell>
                      </TableRow>
                  </TableFooter>
              )}
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
  );
}

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { format, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { Search, CreditCard, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateRangePicker, type DateRange } from '@/components/dashboard/date-range-picker';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export interface OnlinePaymentRow {
  id: string;
  orderId: string;
  companyName: string;
  crmUserName: string;
  amount: number;
  method: string;
  trxId: string;
  status: string;
  date: string;
}

const ITEMS_PER_PAGE = 25;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value || 0);

const formatDateSafe = (value: string) => {
  try {
    const date = parseISO(value);
    return isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'd MMM, yyyy, h:mm a');
  } catch {
    return 'Invalid Date';
  }
};

export function OnlinePaymentClient({ rows, isAdmin }: { rows: OnlinePaymentRow[]; isAdmin: boolean }) {
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return { from: startOfMonth(today), to: endOfMonth(today) };
  });

  useEffect(() => setIsMounted(true), []);
  useEffect(() => setCurrentPage(1), [searchTerm, selectedDateRange]);

  const filtered = useMemo(() => {
    const from = selectedDateRange?.from ? startOfDay(selectedDateRange.from).getTime() : null;
    const to = selectedDateRange?.to ? endOfDay(selectedDateRange.to).getTime() : null;
    const term = searchTerm.trim().toLowerCase();

    return rows.filter(r => {
      const t = new Date(r.date).getTime();
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;
      if (!term) return true;
      return [r.orderId, r.companyName, r.crmUserName, r.method, r.trxId, r.status]
        .some(v => v?.toLowerCase().includes(term));
    });
  }, [rows, searchTerm, selectedDateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageRows = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const colCount = isAdmin ? 8 : 7;

  const handleExport = () => {
    if (filtered.length === 0) return;
    const csv = Papa.unparse(filtered.map(r => ({
      'Order ID': r.orderId,
      'Company': r.companyName,
      'CR Manager': r.crmUserName,
      'Amount': r.amount,
      'Transaction ID': r.trxId,
      'Method': r.method,
      'Status': r.status,
      'Date': formatDateSafe(r.date),
    })));
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'online_payments.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderRows = () => {
    if (!isMounted) {
      return [...Array(8)].map((_, i) => (
        <TableRow key={`skel-${i}`}>
          <TableCell colSpan={colCount}><Skeleton className="h-8 w-full" /></TableCell>
        </TableRow>
      ));
    }
    if (pageRows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={colCount} className="text-center h-48 text-muted-foreground">
            No online payments found for the selected criteria.
          </TableCell>
        </TableRow>
      );
    }
    return pageRows.map(r => (
      <TableRow key={r.id}>
        <TableCell className="font-medium">
          <Link href={`/invoice/${r.orderId}`} className="hover:text-primary hover:underline">{r.orderId}</Link>
        </TableCell>
        <TableCell>{r.companyName}</TableCell>
        {isAdmin && <TableCell>{r.crmUserName}</TableCell>}
        <TableCell className="text-right font-mono text-green-600">{formatCurrency(r.amount)}</TableCell>
        <TableCell className="font-mono text-xs">{r.trxId || 'N/A'}</TableCell>
        <TableCell>{r.method}</TableCell>
        <TableCell>
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">{r.status}</Badge>
        </TableCell>
        <TableCell className="whitespace-nowrap">{formatDateSafe(r.date)}</TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-primary" />
                Online Payment
              </CardTitle>
              <CardDescription className="mt-1">
                {isAdmin
                  ? 'All payments received online through PayStation.'
                  : 'Online payments received through PayStation for your orders.'}
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
              <DateRangePicker initialRange={selectedDateRange} onDateRangeChange={(r) => setSelectedDateRange(r)} />
              {isAdmin && (
                <Button variant="outline" onClick={handleExport} disabled={!isMounted || filtered.length === 0}>
                  <Download className="mr-2 h-4 w-4" />Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Company</TableHead>
                  {isAdmin && <TableHead>CR Manager</TableHead>}
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderRows()}</TableBody>
            </Table>
          </div>
        </CardContent>
        {isMounted && totalPages > 1 && (
          <CardFooter className="py-4 border-t flex items-center justify-end">
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }}
                    aria-disabled={currentPage === 1}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-3 text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                </PaginationItem>
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
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

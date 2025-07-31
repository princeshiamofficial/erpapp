
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, PlusCircle, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { TrackingLink, OrderItem } from '@/types';
import { getOrdersForReport } from '@/lib/report-service';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

interface PrintReportItem {
  orderId: string;
  orderDate: string;
  creatorName: string;
  acceptedName: string;
}

export default function PrintReportPage() {
  const [reportItems, setReportItems] = useState<PrintReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all orders using the report service
      const fetchedOrders = await getOrdersForReport({ limit: 500, orderBy: 'createdAt', direction: 'desc' });
      
      // Flatten the orders into a list of printable items
      const flattenedItems: PrintReportItem[] = fetchedOrders.map(order => ({
          orderId: order.id,
          orderDate: order.createdAt,
          creatorName: order.crmUserName,
          acceptedName: order.designerRepresentativeName || 'N/A',
        }));
      setReportItems(flattenedItems);
    } catch (error) {
      console.error("Failed to fetch report data:", error);
      toast({ title: "Error", description: "Could not load data for the report.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);
  
  const filteredItems = useMemo(() => {
    if (!searchTerm) return reportItems;
    const lowercasedFilter = searchTerm.toLowerCase();
    return reportItems.filter(item =>
      item.orderId.toLowerCase().includes(lowercasedFilter) ||
      item.creatorName.toLowerCase().includes(lowercasedFilter) ||
      item.acceptedName.toLowerCase().includes(lowercasedFilter)
    );
  }, [reportItems, searchTerm]);

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
            <Button size="lg" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add New Task
            </Button>
          </div>
        </div>

        {/* This is the main card that will be visible on screen and on the print-out */}
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
                    <TableHead>Creator Name</TableHead>
                    <TableHead>Accepted Name</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(10)].map((_, i) => (
                      <TableRow key={`skel-report-${i}`}>
                        <TableCell className="pl-6"><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="pr-6 text-right"><Skeleton className="h-9 w-20 inline-block rounded-md" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredItems.length > 0 ? (
                    filteredItems.map((item, index) => (
                      <TableRow key={`${item.orderId}-${index}`} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="pl-6 font-mono text-sm text-primary">{item.orderId}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(parseISO(item.orderDate), 'd MMM, yyyy')}
                        </TableCell>
                        <TableCell>{item.creatorName}</TableCell>
                        <TableCell>{item.acceptedName}</TableCell>
                        <TableCell className="pr-6 text-right">
                          <Link href={`/track/${item.orderId}`} passHref>
                            <Button variant="outline" size="sm" className="h-9 px-3">
                              <Eye className="mr-1.5 h-4 w-4" /> View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
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

       <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}

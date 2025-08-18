
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { TrackingLink, GlobalSettings, User } from '@/types'; // Import User
import { getOrders } from '@/lib/order-service';
import { getGlobalSettings } from '@/lib/settings-service';
import { getUsers } from '@/lib/user-service'; // Import getUsers
import { useToast } from '@/hooks/use-toast';
import { Package, Settings, X, PlusCircle, Loader2, Users as UsersIcon } from 'lucide-react'; // Import UsersIcon
import { useAuth } from '@/contexts/auth-context'; // Corrected import path
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateReportFiltersAction } from './actions';
import { AnimatePresence, motion } from 'framer-motion';
import { DateRangePicker, type PredefinedRange } from '@/components/dashboard/date-range-picker';
import type { DateRange } from "react-day-picker";
import { isWithinInterval, parseISO, subDays, startOfDay, endOfDay } from 'date-fns';
import { DELIVERED_STATUS_ID } from '@/lib/status-service'; // Import delivered status ID

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-BD', {
        style: 'currency',
        currency: 'BDT',
    }).format(value);
};

interface ProductSalesData {
  product: string;
  sales: number;
  percentage: number;
}

interface DesignerPerformanceData {
  designerId: string;
  designerName: string;
  ordersDelivered: number;
  percentage: number;
}


interface ReportFilterSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialFilters: string[];
  onSave: (newFilters: string[]) => Promise<void>;
}

function ReportFilterSettingsDialog({ isOpen, onOpenChange, initialFilters, onSave }: ReportFilterSettingsDialogProps) {
  const [filters, setFilters] = useState(initialFilters);
  const [newFilter, setNewFilter] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFilters(initialFilters);
      setNewFilter("");
    }
  }, [isOpen, initialFilters]);

  const handleAddFilter = () => {
    if (newFilter.trim() && !filters.some(f => f.toLowerCase() === newFilter.trim().toLowerCase())) {
      setFilters([...filters, newFilter.trim()]);
      setNewFilter("");
    }
  };

  const handleRemoveFilter = (filterToRemove: string) => {
    setFilters(filters.filter(f => f !== filterToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(filters);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center"><Settings className="mr-2 h-5 w-5" />Report Filter Settings</DialogTitle>
          <DialogDescription>
            Manage keywords that group entire orders into a single product category on the report page.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Current Filter Keywords</Label>
            {filters.length > 0 ? (
              <div className="flex flex-wrap gap-2 rounded-md border p-3 bg-muted/50">
                <AnimatePresence>
                  {filters.map(filter => (
                    <motion.div
                      key={filter}
                      layout
                      initial={{ opacity: 0, y: -10, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -20, scale: 0.8 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      <Badge variant="secondary" className="text-base py-1 pl-3 pr-2 shadow-sm">
                        {filter}
                        <button onClick={() => handleRemoveFilter(filter)} className="ml-2 rounded-full hover:bg-destructive/20 p-0.5 transition-colors">
                          <X className="h-3 w-3 text-destructive" />
                        </button>
                      </Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground border border-dashed rounded-md p-4 text-center">
                No filters configured. All order items will be reported individually.
              </div>
            )}
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-grow space-y-1">
              <Label htmlFor="new-filter">Add New Filter</Label>
              <Input
                id="new-filter"
                value={newFilter}
                onChange={e => setNewFilter(e.target.value)}
                placeholder="e.g., Combo Package"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFilter(); } }}
              />
            </div>
            <Button onClick={handleAddFilter} type="button" variant="outline" size="icon">
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export function ReportPageClient() {
  const [orders, setOrders] = useState<TrackingLink[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const handleDateRangeChange = useCallback((range: DateRange | undefined, displayLabel: string, predefinedValue: PredefinedRange | "custom" | null) => {
    setSelectedDateRange(range);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedSettings, fetchedUsers] = await Promise.all([
        getOrders(),
        getGlobalSettings(),
        getUsers(),
      ]);
      setOrders(fetchedOrders);
      setGlobalSettings(fetchedSettings);
      setAllUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch data for report:", error);
      toast({
        title: "Error",
        description: "Could not load data for the report.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleSaveFilters = async (newFilters: string[]) => {
    const result = await updateReportFiltersAction(newFilters);
    if (result.success) {
      toast({ title: "Filters Saved", description: "Your report filter keywords have been updated." });
      await fetchData();
      setIsSettingsOpen(false);
    } else {
      toast({ title: "Error", description: result.error || "Failed to save filters.", variant: "destructive" });
    }
  };

  const filteredOrdersByDate = useMemo(() => {
    if (!selectedDateRange?.from) return orders;

    const startDate = startOfDay(selectedDateRange.from);
    const endDate = endOfDay(selectedDateRange.to || selectedDateRange.from);

    return orders.filter(order => {
      if (!order.createdAt) return false;
      try {
        const orderDate = parseISO(order.createdAt);
        return isWithinInterval(orderDate, { start: startDate, end: endDate });
      } catch {
        return false;
      }
    });
  }, [orders, selectedDateRange]);

  const productSalesData: ProductSalesData[] = useMemo(() => {
    if (filteredOrdersByDate.length === 0 || !globalSettings) {
      return [];
    }
  
    const salesMap: Map<string, { sales: number }> = new Map();
    const filters = globalSettings.reportProductFilters || [];
  
    filteredOrdersByDate.forEach(order => {
      let isConsolidated = false;
  
      if (!order.orderItems || order.orderItems.length === 0) {
        return; 
      }
      
      for (const filter of filters) {
        if (order.orderItems.some(item => item.model.toLowerCase().includes(filter.toLowerCase()))) {
          const orderTotal = order.orderItems.reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
          const existing = salesMap.get(filter) || { sales: 0 };
          salesMap.set(filter, { sales: existing.sales + orderTotal });
          isConsolidated = true;
          break; 
        }
      }
  
      if (!isConsolidated) {
        order.orderItems.forEach(item => {
          const existing = salesMap.get(item.model) || { sales: 0 };
          salesMap.set(item.model, {
            sales: existing.sales + (item.lineItemTotalPrice || 0),
          });
        });
      }
    });
  
    const totalSales = Array.from(salesMap.values()).reduce((acc, { sales }) => acc + sales, 0);
    if (totalSales === 0) return [];
  
    return Array.from(salesMap.entries())
      .map(([product, data]) => ({
        product,
        sales: data.sales,
        percentage: (data.sales / totalSales) * 100,
      }))
      .sort((a, b) => b.sales - a.sales);
  }, [filteredOrdersByDate, globalSettings]);
  
  const designerPerformanceData: DesignerPerformanceData[] = useMemo(() => {
    if (orders.length === 0 || allUsers.length === 0 || !selectedDateRange?.from) {
        return [];
    }

    const startDate = startOfDay(selectedDateRange.from);
    const endDate = endOfDay(selectedDateRange.to || selectedDateRange.from);

    const designerMap = new Map<string, { name: string; count: number }>();
    allUsers
      .filter(user => user.role === 'DESIGNER_REPRESENTATIVE')
      .forEach(dr => {
        designerMap.set(dr.id, { name: dr.name, count: 0 });
      });

    orders.forEach(order => {
      // Find a delivery event within the date range
      const deliveryLog = order.statusHistory.find(h =>
        h.status === DELIVERED_STATUS_ID &&
        isWithinInterval(parseISO(h.timestamp), { start: startDate, end: endDate })
      );
      
      // If a delivery happened in the range and the order has a DR
      if (deliveryLog && order.designerRepresentativeId && designerMap.has(order.designerRepresentativeId)) {
        const designer = designerMap.get(order.designerRepresentativeId)!;
        designer.count += 1;
        designerMap.set(order.designerRepresentativeId, designer);
      }
    });

    const totalDelivered = Array.from(designerMap.values()).reduce((acc, { count }) => acc + count, 0);
    if (totalDelivered === 0) return [];

    return Array.from(designerMap.entries())
      .map(([id, data]) => ({
        designerId: id,
        designerName: data.name,
        ordersDelivered: data.count,
        percentage: (data.count / totalDelivered) * 100,
      }))
      .sort((a, b) => b.ordersDelivered - a.ordersDelivered);

  }, [orders, allUsers, selectedDateRange]);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';


  return (
    <>
      <div className="space-y-6 p-1 sm:p-0">
        <div className="flex flex-col lg:flex-row gap-6">
            <Card className="w-full lg:flex-1">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Product Sales Performance</CardTitle>
                  <CardDescription>
                    An overview of sales distribution across all products.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <DateRangePicker 
                      initialRange={selectedDateRange} 
                      onDateRangeChange={handleDateRangeChange}
                      className="w-full sm:w-auto"
                    />
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} disabled={!globalSettings}>
                        <Settings className="h-5 w-5" />
                        <span className="sr-only">Configure Report Filters</span>
                      </Button>
                    )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Sales Amount</TableHead>
                      <TableHead className="w-[30%] text-center">Sales Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [...Array(4)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-4">
                              <Skeleton className="h-2.5 w-2/3" />
                              <Skeleton className="h-6 w-16" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : productSalesData.length > 0 ? (
                      productSalesData.map((item) => (
                        <TableRow key={item.product}>
                          <TableCell className="font-medium">{item.product}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(item.sales)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-4">
                                <Progress value={item.percentage} className="w-2/3 h-2.5" indicatorClassName="bg-primary" />
                                <Badge variant="outline" className="w-16 justify-center">{item.percentage.toFixed(1)}%</Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                          <Package className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-2" />
                          No sales data available for the selected period.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="w-full lg:flex-1">
              <CardHeader>
                <CardTitle>Designer&apos;s Performance</CardTitle>
                <CardDescription>
                  Number of delivered orders completed by each designer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Designer</TableHead>
                      <TableHead className="text-right">Orders Delivered</TableHead>
                      <TableHead className="w-[30%] text-center">Contribution</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [...Array(3)].map((_, i) => (
                        <TableRow key={`skel-designer-${i}`}>
                          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-4">
                              <Skeleton className="h-2.5 w-2/3" />
                              <Skeleton className="h-6 w-16" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : designerPerformanceData.length > 0 ? (
                      designerPerformanceData.map((item) => (
                        <TableRow key={item.designerId}>
                          <TableCell className="font-medium">{item.designerName}</TableCell>
                          <TableCell className="text-right font-mono">{item.ordersDelivered}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-4">
                              <Progress value={item.percentage} className="w-2/3 h-2.5" indicatorClassName="bg-primary" />
                              <Badge variant="outline" className="w-16 justify-center">{item.percentage.toFixed(1)}%</Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                          <UsersIcon className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-2" />
                          No designer performance data available for this period.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        </div>
      </div>

      {isAdmin && (
        <ReportFilterSettingsDialog
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          initialFilters={globalSettings?.reportProductFilters || []}
          onSave={handleSaveFilters}
        />
      )}
    </>
  );
}

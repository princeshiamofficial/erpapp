
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
  TableFooter,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from "@/components/ui/progress";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { TrackingLink, GlobalSettings, User, TaskEntry, UserRole } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Package, Settings, X, PlusCircle, Loader2, Users as UsersIcon, BarChart3, ClipboardList, Edit, Trash2, Download, LineChart as LineChartIcon, ChevronsUpDown, Check } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTaskEntryAction, deleteTaskEntryAction, updateReportFiltersAction, getReportDataAction } from './actions';
import { AnimatePresence, motion } from 'framer-motion';
import { DateRangePicker, type PredefinedRange } from '@/components/dashboard/date-range-picker';
import type { DateRange } from "react-day-picker";
import { isWithinInterval, parseISO, subDays, startOfDay, endOfDay, getYear, format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import dynamic from 'next/dynamic';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AddEditTaskDialog } from '@/components/report/AddEditTaskDialog';
import { DeleteTaskDialog } from '@/components/report/DeleteTaskDialog';
import { BarChart as RechartsBarChart, Line, Area, AreaChart as RechartsAreaChart, LineChart as RechartsLineChart } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import Papa from 'papaparse';
import { cn } from '@/lib/utils';


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-BD', {
        style: 'currency',
        currency: 'BDT',
    }).format(value);
};

const formatDateSafe = (dateString?: string) => {
  if (!dateString) return 'No Date';
  try {
    return format(parseISO(dateString), 'd MMM, yyyy');
  } catch (e) {
    return 'Invalid Date';
  }
};


interface ProductSalesData {
  product: string;
  sales: number;
  quantity: number;
  percentage: number;
}

interface CrmSalesData {
  crmId: string;
  crmName: string;
  totalSales: number;
  avatarUrl?: string | null;
}

const salesBreakdownChartConfig = {
  totalSales: {
    label: "Total Sales",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const dailySalesChartConfig = {
  salesCount: {
    label: "Sales Count",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;


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
            Manage keywords that group individual products into a single category on the report page.
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
                No filters configured. All products will be reported individually.
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

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};


export function ReportPageClient() {
  const [orders, setOrders] = useState<TrackingLink[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allTasks, setAllTasks] = useState<TaskEntry[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [activeTab, setActiveTab] = useState("sales_report");

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setActiveTab(hash as any);
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as any);
    window.history.replaceState(null, '', `#${value}`);
  }, []);

  const [selectedTeam, setSelectedTeam] = useState<UserRole | 'all'>('CRM');

  const [taskToEdit, setTaskToEdit] = useState<TaskEntry | null>(null);
  const [isAddEditTaskOpen, setIsAddEditTaskOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskEntry | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [productViewMode, setProductViewMode] = useState<'single' | 'category'>('single');
  
  const [selectedCrmId, setSelectedCrmId] = useState<string>('all');
  const [isCrmFilterOpen, setIsCrmFilterOpen] = useState(false);
  const [crmSearchQuery, setCrmSearchQuery] = useState("");
  const allCrmUsers = useMemo(() => allUsers.filter(u => u.role === 'CRM'), [allUsers]);

  const handleDateRangeChange = useCallback((range: DateRange | undefined, displayLabel: string, predefinedValue: PredefinedRange | "custom" | null) => {
    setSelectedDateRange(range);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { orders, settings, users, tasks } = await getReportDataAction();
      setOrders(orders);
      setGlobalSettings(settings);
      setAllUsers(users);
      setAllTasks(tasks); 
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
        toast({ title: "Settings Saved", description: "Report product filters have been updated." });
        setGlobalSettings(prev => prev ? { ...prev, reportProductFilters: newFilters } : { reportProductFilters: newFilters } as GlobalSettings);
        setIsSettingsOpen(false);
    } else {
        toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
  };
  
  const handleTaskSaved = () => {
    setIsAddEditTaskOpen(false);
    setTaskToEdit(null);
    fetchData();
  };

  const handleOpenEditTaskDialog = (task: TaskEntry) => {
    setTaskToEdit(task);
    setIsAddEditTaskOpen(true);
  };

  const handleDeleteTask = (task: TaskEntry) => {
    setTaskToDelete(task);
  };
  
  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeletingTask(true);
    const result = await deleteTaskEntryAction(taskToDelete.id);
    if (result.success) {
        toast({ title: "Task Entry Deleted" });
        fetchData();
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsDeletingTask(false);
    setTaskToDelete(null);
  };

  const filteredOrdersByDate = useMemo(() => {
    let dateFiltered = orders;
    if (selectedDateRange?.from) {
      const startDate = startOfDay(selectedDateRange.from);
      const endDate = selectedDateRange.to ? endOfDay(selectedDateRange.to) : endOfDay(startDate);

      dateFiltered = orders.filter(order => {
        if (!order.createdAt) return false;
        try {
          const orderDate = parseISO(order.createdAt);
          return isWithinInterval(orderDate, { start: startDate, end: endDate });
        } catch {
          return false;
        }
      });
    }
    if (selectedCrmId !== 'all') {
      return dateFiltered.filter(order => order.crmUserId === selectedCrmId);
    }
    return dateFiltered;
  }, [orders, selectedDateRange, selectedCrmId]);

  const filteredTasksByDate = useMemo(() => {
    let tasksToFilter = allTasks;
    
    // Filter by date
    if (selectedDateRange?.from) {
        const startDate = startOfDay(selectedDateRange.from);
        const endDate = selectedDateRange.to ? endOfDay(selectedDateRange.to) : endOfDay(startDate);
        tasksToFilter = tasksToFilter.filter(task => {
            try {
                const taskDate = parseISO(task.date);
                return isWithinInterval(taskDate, { start: startDate, end: endDate });
            } catch { return false; }
        });
    }
    
    // Filter by team/user
    if (selectedCrmId !== 'all') {
      tasksToFilter = tasksToFilter.filter(task => task.userId === selectedCrmId);
    } else if (selectedTeam !== 'all') {
      tasksToFilter = tasksToFilter.filter(task => task.role === selectedTeam);
    }

    return tasksToFilter.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTasks, selectedDateRange, selectedTeam, selectedCrmId]);

  const { totalTasksCount } = useMemo(() => {
    const totalTasks = filteredTasksByDate.reduce((sum, task) => sum + task.taskCount, 0);
    return { totalTasksCount: totalTasks };
  }, [filteredTasksByDate]);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';
  
  const productSalesData: ProductSalesData[] = useMemo(() => {
    const salesMap: Map<string, { sales: number; quantity: number }> = new Map();
    const filters = globalSettings?.reportProductFilters || [];
  
    filteredOrdersByDate.forEach(order => {
      if (!order.orderItems) return;
  
      order.orderItems.forEach(item => {
        let productName = item.model;
        let quantity = item.quantity;
        let sales = item.isGift ? 0 : (item.lineItemTotalPrice || 0);
  
        if (productViewMode === 'category') {
          const matchingFilter = filters.find(filter =>
            productName.toLowerCase().includes(filter.toLowerCase())
          );
          if (matchingFilter) {
            productName = matchingFilter; // Use the keyword as the category name
          }
        }
  
        const existing = salesMap.get(productName) || { sales: 0, quantity: 0 };
        salesMap.set(productName, {
          sales: existing.sales + sales,
          quantity: existing.quantity + quantity,
        });
      });
    });
  
    const totalSales = Array.from(salesMap.values()).reduce((acc, { sales }) => acc + sales, 0);
    if (totalSales === 0) return [];
  
    return Array.from(salesMap.entries())
      .map(([product, data]) => ({
        product,
        sales: data.sales,
        quantity: data.quantity,
        percentage: (data.sales / totalSales) * 100,
      }))
      .sort((a, b) => b.sales - a.sales);
  }, [filteredOrdersByDate, productViewMode, globalSettings]);
  
  const crmSalesData: CrmSalesData[] = useMemo(() => {
    if (filteredOrdersByDate.length === 0 || allUsers.length === 0) {
      return [];
    }
  
    const salesByCrm: Record<string, { totalSales: number }> = {};
  
    filteredOrdersByDate.forEach(order => {
      if (order.crmUserId) {
        if (!salesByCrm[order.crmUserId]) {
          salesByCrm[order.crmUserId] = { totalSales: 0 };
        }
        const orderTotal = order.orderItems.reduce((sum, item) => sum + (item.isGift ? 0 : (item.lineItemTotalPrice || 0)), 0);
        salesByCrm[order.crmUserId].totalSales += orderTotal;
      }
    });
  
    const crmUsers = allUsers.filter(u => u.role === 'CRM');
  
    return crmUsers
      .map(crm => ({
        crmId: crm.id,
        crmName: crm.name,
        avatarUrl: crm.avatarUrl,
        totalSales: salesByCrm[crm.id]?.totalSales || 0,
      }))
      .filter(data => data.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales);
  
  }, [filteredOrdersByDate, allUsers]);

  const dailySalesData = useMemo(() => {
    const salesByDayAndCrm: { [date: string]: { [crmName: string]: { salesCount: number; totalSale: number } } } = {};
  
    filteredOrdersByDate.forEach(order => {
      try {
        const dateKey = formatDateSafe(order.createdAt);
        if (!salesByDayAndCrm[dateKey]) {
          salesByDayAndCrm[dateKey] = {};
        }
        const crmName = order.crmUserName || 'Unknown CRM';
        if (!salesByDayAndCrm[dateKey][crmName]) {
          salesByDayAndCrm[dateKey][crmName] = { salesCount: 0, totalSale: 0 };
        }
        salesByDayAndCrm[dateKey][crmName].salesCount += 1;
        salesByDayAndCrm[dateKey][crmName].totalSale += order.orderItems.reduce((sum, item) => sum + (item.isGift ? 0 : (item.lineItemTotalPrice || 0)), 0);
      } catch (e) {
        // ignore invalid dates
      }
    });
  
    const flattenedData = Object.entries(salesByDayAndCrm).flatMap(([date, crmSales]) => 
      Object.entries(crmSales).map(([crmName, data]) => ({
        date,
        crmName,
        salesCount: data.salesCount,
        totalSale: data.totalSale,
      }))
    );
  
    return flattenedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredOrdersByDate]);

  const selectedCrmName = useMemo(() => {
    if (selectedCrmId === 'all') return 'All CRMs';
    return allCrmUsers.find(u => u.id === selectedCrmId)?.name || "Select CRM";
  }, [selectedCrmId, allCrmUsers]);
  
  const filteredCrmUsersForDropdown = useMemo(() => {
    const allCrmsOption = { id: 'all', name: 'All CRMs', role: 'SYSTEM_ADMIN' as const, email: '' };
    const baseUsers = [allCrmsOption, ...allCrmUsers];
    if (!crmSearchQuery) return baseUsers;
    return baseUsers.filter(user =>
      user.name.toLowerCase().includes(crmSearchQuery.toLowerCase())
    );
  }, [allCrmUsers, crmSearchQuery]);

  return (
    <>
      <div className="space-y-6 p-1 sm:p-0">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="flex justify-between items-center mb-4">
              <TabsList>
                  <TabsTrigger value="sales_report">Sales Report</TabsTrigger>
                  <TabsTrigger value="daily_sales">Daily Sales</TabsTrigger>
                  <TabsTrigger value="team_report">Team Report</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Popover open={isCrmFilterOpen} onOpenChange={setIsCrmFilterOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={isCrmFilterOpen} className="w-[180px] justify-between h-10">
                        <span className="truncate">{selectedCrmName}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Search CRM..." value={crmSearchQuery} onValueChange={setCrmSearchQuery} />
                        <CommandList>
                          <CommandEmpty>No CRM found.</CommandEmpty>
                          <CommandGroup>
                            {filteredCrmUsersForDropdown.map(crm => (
                              <CommandItem key={crm.id} value={crm.name} onSelect={() => { setSelectedCrmId(crm.id); setIsCrmFilterOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", crm.id === selectedCrmId ? "opacity-100" : "opacity-0")} />
                                {crm.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                <DateRangePicker 
                    initialRange={selectedDateRange} 
                    onDateRangeChange={handleDateRangeChange}
                />
              </div>
          </div>
          <TabsContent value="sales_report">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="w-full">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <CardTitle>Product Sales Performance</CardTitle>
                          <CardDescription>
                            Sales distribution for the selected period.
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="flex items-center bg-muted p-1 rounded-lg">
                              <Button variant={productViewMode === 'single' ? 'secondary' : 'ghost'} size="sm" className="h-8" onClick={() => setProductViewMode('single')}>Product</Button>
                              <Button variant={productViewMode === 'category' ? 'secondary' : 'ghost'} size="sm" className="h-8" onClick={() => setProductViewMode('category')}>Category</Button>
                           </div>
                           {isAdmin && <Button variant="outline" size="sm" className="h-9" onClick={() => setIsSettingsOpen(true)}><Settings className="mr-2 h-4 w-4"/>Filters</Button>}
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{productViewMode === 'category' ? 'Category' : 'Product'}</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Sales Amount</TableHead>
                          <TableHead className="w-[30%] text-center">Sales Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          [...Array(4)].map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                              <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
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
                              <TableCell className="text-right font-mono">{item.quantity.toLocaleString()}</TableCell>
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
                            <TableCell colSpan={4} className="h-24 text-center">
                              <Package className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-2" />
                              No sales data available for the selected period.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card className="w-full">
                  <CardHeader>
                      <CardTitle>CRM Sales Breakdown</CardTitle>
                      <CardDescription>
                        Sales contribution by each CRM for the selected period.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>CRM</TableHead>
                                <TableHead className="text-right">Total Sales</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(4)].map((_, i) => (
                                    <TableRow key={`crm-skel-${i}`}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="h-10 w-10 rounded-full" />
                                                <Skeleton className="h-5 w-32" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Skeleton className="h-5 w-24 ml-auto" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : crmSalesData.length > 0 ? (
                                crmSalesData.map(crm => (
                                    <TableRow key={crm.crmId}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border">
                                                    <AvatarImage src={crm.avatarUrl || undefined} alt={crm.crmName} />
                                                    <AvatarFallback>{getInitials(crm.crmName)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{crm.crmName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-base font-semibold">
                                            {formatCurrency(crm.totalSales)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                 <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                        <UsersIcon className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-2" />
                                        No CRM sales data for this period.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                  </CardContent>
                </Card>
            </div>
          </TabsContent>
          <TabsContent value="daily_sales">
            <Card>
              <CardHeader>
                <CardTitle>Daily Sales Log</CardTitle>
                <CardDescription>A day-by-day summary of sales activity by CRM within the selected date range.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SL</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>CR Name</TableHead>
                      <TableHead className="text-right">Total Sales Count</TableHead>
                      <TableHead className="text-right">Sales Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={`daily-skel-${i}`}>
                          <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : dailySalesData.length > 0 ? (
                      dailySalesData.map((sale, index) => (
                        <TableRow key={`${sale.date}-${sale.crmName}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{sale.date}</TableCell>
                          <TableCell>{sale.crmName}</TableCell>
                          <TableCell className="text-right">{sale.salesCount}</TableCell>
                          <TableCell className="text-right">{formatCurrency(sale.totalSale)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          No sales data for this period.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="team_report">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-primary"/>
                                {selectedTeam === 'CRM' ? 'Sellers Report' : selectedTeam === 'DESIGNER_REPRESENTATIVE' ? 'Designers Report' : selectedTeam === 'LR' ? 'Logistics Report' : selectedTeam === 'CO' ? 'CO Report' : 'Team Task Report'}
                            </CardTitle>
                            <CardDescription>
                                Count of {selectedTeam === 'CRM' ? 'sales' : selectedTeam === 'DESIGNER_REPRESENTATIVE' ? 'designs' : selectedTeam === 'CO' ? 'docs' : 'tasks'} submitted by team members in the selected period. Total {selectedTeam === 'CRM' ? 'Sales' : selectedTeam === 'DESIGNER_REPRESENTATIVE' ? 'Designed' : selectedTeam === 'CO' ? 'Docs' : 'Tasks'}: <span className="font-bold text-foreground">{totalTasksCount}</span>
                            </CardDescription>
                        </div>
                        <Tabs value={selectedTeam} onValueChange={(value) => setSelectedTeam(value as UserRole | 'all')}>
                            <TabsList>
                                <TabsTrigger value="all">All Teams</TabsTrigger>
                                <TabsTrigger value="CRM">CR Team</TabsTrigger>
                                <TabsTrigger value="DESIGNER_REPRESENTATIVE">DR Team</TabsTrigger>
                                <TabsTrigger value="CO">CO Team</TabsTrigger>
                                <TabsTrigger value="LR">LR Team</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">
                                    {selectedTeam === 'CRM' ? 'Sales' : selectedTeam === 'DESIGNER_REPRESENTATIVE' ? 'Designed' : selectedTeam === 'CO' ? 'Docs' : 'Task Count'}
                                </TableHead>
                                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={`task-skel-${i}`}>
                                        <TableCell><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-5 w-28" /></div></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        {selectedTeam === 'CRM' && <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>}
                                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                        {isAdmin && <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md" /></TableCell>}
                                    </TableRow>
                                ))
                            ) : filteredTasksByDate.length > 0 ? (
                                filteredTasksByDate.map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 border">
                                                    <AvatarImage src={allUsers.find(u => u.id === task.userId)?.avatarUrl || undefined} alt={task.userName} />
                                                    <AvatarFallback>{getInitials(task.userName)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{task.userName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{task.role.replace(/_/g, ' ')}</TableCell>
                                        <TableCell>{formatDateSafe(task.date)}</TableCell>
                                        <TableCell className="text-right font-mono text-base font-semibold">{task.taskCount}</TableCell>
                                        {isAdmin && (
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditTaskDialog(task)}>
                                                    <Edit className="h-4 w-4 text-muted-foreground"/>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => handleDeleteTask(task)}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            ) : (
                                 <TableRow>
                                    <TableCell colSpan={isAdmin ? 5 : 4} className="h-24 text-center">
                                        <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-2" />
                                        No {selectedTeam === 'CRM' ? 'sales' : selectedTeam === 'DESIGNER_REPRESENTATIVE' ? 'design' : selectedTeam === 'CO' ? 'docs' : 'task'} data for this period or team.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                         <TableFooter>
                            <TableRow>
                                <TableCell colSpan={2}></TableCell>
                                <TableCell className="text-right font-bold col-span-2">Total {selectedTeam === 'CRM' ? 'Sales' : selectedTeam === 'DESIGNER_REPRESENTATIVE' ? 'Designed' : selectedTeam === 'CO' ? 'Docs' : 'Tasks'}:</TableCell>
                                <TableCell className="text-right font-bold">{totalTasksCount}</TableCell>
                                {isAdmin && <TableCell />}
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {isAdmin && (
        <ReportFilterSettingsDialog
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          initialFilters={globalSettings?.reportProductFilters || []}
          onSave={handleSaveFilters}
        />
      )}

      {taskToEdit && currentUser && (
        <AddEditTaskDialog
            isOpen={isAddEditTaskOpen}
            onOpenChange={setIsAddEditTaskOpen}
            onTaskSaved={handleTaskSaved}
            task={taskToEdit}
            currentUser={currentUser}
        />
      )}
      
      {taskToDelete && (
        <DeleteTaskDialog
            isOpen={!!taskToDelete}
            onOpenChange={() => setTaskToDelete(null)}
            onConfirmDelete={handleConfirmDeleteTask}
            task={taskToDelete}
            isDeleting={isDeletingTask}
        />
      )}
    </>
  );
}

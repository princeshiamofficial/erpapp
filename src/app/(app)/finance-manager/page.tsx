
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import type { Transaction, User, TransactionType, GlobalSettings, PersonalNote, UserRole } from "@/types";
import { getUsers } from '@/lib/user-service';
import { getGlobalSettings } from '@/lib/settings-service';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, ArrowDownCircle, ArrowUpCircle, Wallet, AlertTriangle, Calculator, NotebookPen, RefreshCw, Loader2, Minus, Send, Edit2, Trash2, X, Construction, Search, Filter, CalendarDays as CalendarIconLucide, User as UserIcon, ChevronsUpDown, PieChart, Landmark } from 'lucide-react'; 
import { TransactionListItem } from '@/components/finance-manager/transaction-list-item';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  addTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
  getTransactionsForUserAction,
  getAllTransactionsAction,
} from './actions';
import { MultiColorCalculatorIcon } from '@/components/icons/MultiColorCalculatorIcon';
import { Banknote } from 'lucide-react';
import { DateRangePicker, type PredefinedRange } from '@/components/dashboard/date-range-picker';
import type { DateRange } from "react-day-picker";
import { isWithinInterval, parseISO, subDays } from "date-fns";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Pie,
  PieChart as RechartsPieChart,
  Cell,
} from "recharts"

const AddTransactionDialog = dynamic(() => import('@/components/finance-manager/add-transaction-dialog').then(mod => mod.AddTransactionDialog));
const EditTransactionDialog = dynamic(() => import('@/components/finance-manager/edit-transaction-dialog').then(mod => mod.EditTransactionDialog));
const CalculatorDialog = dynamic(() => import('@/components/layout/CalculatorDialog').then(mod => mod.CalculatorDialog));


const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

const TRANSACTION_TYPES_FOR_FILTER: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All Transactions' },
  { value: 'income', label: 'Income' },
  { value: 'expense_only', label: 'Expenses' },
  { value: 'purchase', label: 'Purchases' },
  { value: 'send_money', label: 'Sent Money' },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF", "#FF4560", "#775DD0", "#82ca9d", "#ffc658", "#d0ed57", "#a4de6c", "#8884d8" ];


export default function FinanceManagerPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'personal' | 'global'>('personal');
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allUsersForFilter, setAllUsersForFilter] = useState<User[]>([]); 
  const [selectedUserIdFilter, setSelectedUserIdFilter] = useState<string>('all'); 
  const [isUserFilterPopoverOpen, setIsUserFilterPopoverOpen] = useState(false);

  const [globalAppSettings, setGlobalAppSettings] = useState<GlobalSettings | null>(null);
  const [transactionSearchTerm, setTransactionSearchTerm] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');

  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  
  useEffect(() => {
    setSelectedDateRange({ from: subDays(new Date(), 29), to: new Date() });
  }, []);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [isEditDialogVisible, setIsEditDialogVisible] = useState(false);


  const fetchFinancialData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      let fetchedTransactions: Transaction[];
      let fetchedUsers: User[] = [];

      const settings = await getGlobalSettings();
      setGlobalAppSettings(settings);

      const dataPromises: any[] = [];
      if (currentUser.role === 'SYSTEM_ADMIN') {
        dataPromises.push(getAllTransactionsAction(), getUsers());
      } else {
        dataPromises.push(getTransactionsForUserAction(currentUser.id));
      }

      const results = await Promise.all(dataPromises);
      fetchedTransactions = results[0] as Transaction[];
      
      if (currentUser.role === 'SYSTEM_ADMIN') {
        fetchedUsers = results[1] as User[];
        const newUserMap = new Map(fetchedUsers.map(user => [user.id, user.name]));
        setUserMap(newUserMap);
        
        const perms = settings.expenseLoggingPermissions || { mode: 'none' };
        const permittedUsers = fetchedUsers.filter(u => {
            if (u.id === currentUser.id) return true; 
            if (u.role === 'SYSTEM_ADMIN') return true; 
            switch (perms.mode) {
                case 'all': return true;
                case 'specificRoles': return perms.allowedRoles?.includes(u.role);
                case 'specificUsers': return perms.allowedUserIds?.includes(u.id);
                case 'none': return false;
                default: return false;
            }
        });
        setAllUsersForFilter(permittedUsers);
        setAllUsers(fetchedUsers);
      } else {
        setUserMap(new Map());
        setAllUsersForFilter([]);
        setAllUsers([]);
      }
      
      setTransactions(fetchedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error("Failed to fetch financial data, users, or settings:", error);
      toast({ title: "Error", description: "Could not load page data. Please try again.", variant: "destructive" });
      setTransactions([]);
      setUserMap(new Map());
      setAllUsersForFilter([]);
      setAllUsers([]);
      setGlobalAppSettings(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (currentUser) {
      fetchFinancialData();
    }
  }, [currentUser, fetchFinancialData]);

  useEffect(() => {
    setSelectedUserIdFilter('all');
  }, [viewMode]);

  const displayableTransactionTypeFilters = useMemo(() => {
    if (currentUser?.role === 'SYSTEM_ADMIN') {
      return TRANSACTION_TYPES_FOR_FILTER;
    }
    return TRANSACTION_TYPES_FOR_FILTER.filter(
      (type) => type.value !== 'send_money'
    );
  }, [currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role !== 'SYSTEM_ADMIN' && transactionTypeFilter === 'send_money') {
      setTransactionTypeFilter('all');
    }
  }, [currentUser?.role, transactionTypeFilter]);


  const handleDeleteRequest = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteAlertOpen(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete || !currentUser) return;
    setIsDeleting(true);
    const result = await deleteTransactionAction(transactionToDelete.id, currentUser.id, currentUser.role);
    setIsDeleting(false);
    setIsDeleteAlertOpen(false);
    if (result.success) {
      toast({ title: "Transaction Deleted", description: "The transaction has been removed." });
      fetchFinancialData();
    } else {
      toast({ title: "Deletion Failed", description: result.error || "Could not delete transaction.", variant: "destructive" });
    }
    setTransactionToDelete(null);
  };

  const handleOpenEditDialog = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    setIsEditDialogVisible(true);
  };

  const handleTransactionUpdated = () => {
    setIsEditDialogVisible(false);
    setTransactionToEdit(null);
    fetchFinancialData();
    toast({title: "Transaction Updated", description: "The transaction has been successfully updated."})
  };


  const filteredTransactions = useMemo(() => {
    let results = transactions;
    
    if (viewMode === 'global' && selectedUserIdFilter !== 'all') {
      results = results.filter(t => t.userId === selectedUserIdFilter);
    }

    if (selectedDateRange?.from && selectedDateRange?.to) {
      const startDate = new Date(selectedDateRange.from);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(selectedDateRange.to);
      endDate.setHours(23, 59, 59, 999);

      results = results.filter(t => {
        try {
          const transactionDate = parseISO(t.date);
          return isWithinInterval(transactionDate, { start: startDate, end: endDate });
        } catch (e) {
          console.error("Error parsing transaction date for filtering:", t.date, e);
          return false;
        }
      });
    }

    if (transactionTypeFilter !== 'all') {
      results = results.filter(t => {
        if (transactionTypeFilter === 'income') return t.type === 'income';
        if (transactionTypeFilter === 'expense_only') return t.type === 'expense' && !t.sentToUserId;
        if (transactionTypeFilter === 'purchase') return t.type === 'purchase';
        if (transactionTypeFilter === 'send_money') return t.type === 'expense' && !!t.sentToUserId;
        return true;
      });
    }
  
    if (transactionSearchTerm.trim()) {
      const lowerSearchTerm = transactionSearchTerm.toLowerCase();
      results = results.filter(t => {
        const userName = viewMode === 'global' ? userMap.get(t.userId)?.toLowerCase() : '';
        const matchesSearch = (
          t.category.toLowerCase().includes(lowerSearchTerm) ||
          (t.description && t.description.toLowerCase().includes(lowerSearchTerm)) ||
          t.amount.toString().includes(lowerSearchTerm) ||
          (userName && userName.includes(lowerSearchTerm)) ||
          t.type.toLowerCase().includes(lowerSearchTerm) ||
          (t.sentToUserName && t.sentToUserName.toLowerCase().includes(lowerSearchTerm)) ||
          (t.receivedFromUserName && t.receivedFromUserName.toLowerCase().includes(lowerSearchTerm))
        );
        return matchesSearch;
      });
    }
    return results;
  }, [transactions, transactionSearchTerm, viewMode, userMap, transactionTypeFilter, selectedDateRange, selectedUserIdFilter]);

  const { totalIncome, totalExpenses, availableBalance, expenseChartData } = useMemo(() => {
    let income = 0;
    let expensesSum = 0;
    const categoryTotals: Record<string, number> = {};

    filteredTransactions.forEach(t => { 
      if (t.type === 'income') {
        income += t.amount;
      } else if (t.type === 'expense' || t.type === 'purchase') {
        expensesSum += t.amount;
        const categoryKey = t.category || "Uncategorized";
        categoryTotals[categoryKey] = (categoryTotals[categoryKey] || 0) + t.amount;
      }
    });

    const chartData = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value, fill: 'var(--color-expenses)' })) // All expenses are one color initially
      .sort((a, b) => b.value - a.value);

    return { 
      totalIncome: income, 
      totalExpenses: expensesSum, 
      availableBalance: income - expensesSum,
      expenseChartData: chartData,
    };
  }, [filteredTransactions]); 

  const expenseChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    expenseChartData.forEach((item, index) => {
      const uniqueKey = item.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
      config[uniqueKey] = {
        label: item.name,
        color: COLORS[index % COLORS.length],
      };
    });
    // Add a total entry for the center label
    config.total = {
      label: "Total Expenses",
    };
    return config;
  }, [expenseChartData]);

  const pageDescription = useMemo(() => {
    if (!currentUser) return "Manage your finances.";
    if (currentUser.role === 'SYSTEM_ADMIN') {
        const selectedUserName = allUsersForFilter.find(u => u.id === selectedUserIdFilter)?.name;
        if (viewMode === 'global' && selectedUserIdFilter !== 'all' && selectedUserName) {
            return `Viewing transactions for ${selectedUserName}.`;
        }
        return viewMode === 'global'
            ? "View and manage all user financial transactions."
            : "Track your personal income, expenses, and send money to staff.";
    }
    return `Track your personal income, expenses, and purchases.`;
  }, [currentUser, viewMode, selectedUserIdFilter, allUsersForFilter]);


  const canUserAddExpense = useMemo(() => {
    if (!currentUser || !globalAppSettings?.expenseLoggingPermissions) return false;
    if (currentUser.role === 'SYSTEM_ADMIN') return true;

    const perms = globalAppSettings.expenseLoggingPermissions;
    switch (perms.mode) {
      case 'all': return true;
      case 'none': return false;
      case 'specificRoles': return perms.allowedRoles.includes(currentUser.role);
      case 'specificUsers': return perms.allowedUserIds.includes(currentUser.id);
      default: return false;
    }
  }, [currentUser, globalAppSettings]);

  const summaryCardsToDisplay = useMemo(() => {
    return [
      { title: "Total Income", value: totalIncome, icon: ArrowUpCircle, iconColorClass: "text-green-600", circleBgClass: "bg-green-100 dark:bg-green-700/20", hint: "green money" },
      { title: "Total Expenses & Purchases", value: totalExpenses, icon: ArrowDownCircle, iconColorClass: "text-red-600", circleBgClass: "bg-red-100 dark:bg-red-700/20", hint: "red money" },
      {
        title: "Available Balance",
        value: availableBalance,
        icon: Wallet,
        iconColorClass: availableBalance >= 0 ? "text-blue-600" : "text-orange-600",
        circleBgClass: availableBalance >=0 ? "bg-blue-100 dark:bg-blue-700/20" : "bg-orange-100 dark:bg-orange-700/20",
        hint: "wallet coins"
      },
    ].filter(card => {
      if (currentUser?.role === 'SYSTEM_ADMIN') return true; 
      if (card.title.toLowerCase().includes("expense") && !canUserAddExpense) return false;
      return true;
    });
  }, [totalIncome, totalExpenses, availableBalance, canUserAddExpense, currentUser]);

  const handleDateRangeChange = (
    range: DateRange | undefined,
    label: string, 
    predefined: PredefinedRange | "custom" | null
  ) => {
    setSelectedDateRange(range);
  };


  if (!currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
         <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isLoadingContent = isLoading || !selectedDateRange;

  const selectedUserNameForFilter = useMemo(() => {
    if (selectedUserIdFilter === 'all') return 'All Users';
    return allUsersForFilter.find(u => u.id === selectedUserIdFilter)?.name || 'Select User';
  }, [selectedUserIdFilter, allUsersForFilter]);

  return (
    <div className="space-y-6 p-1 sm:p-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Finance Manager</h1>
          <p className="page-description">
            {pageDescription}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
           <Button variant="outline" size="icon" onClick={fetchFinancialData} disabled={isLoading} className="h-10 w-10" title="Refresh Data">
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {currentUser.role === 'SYSTEM_ADMIN' && (
            <AddTransactionDialog currentUser={currentUser} onTransactionAdded={fetchFinancialData} dialogMode="addIncome">
              <Button size="default" className="bg-green-600 hover:bg-green-700 text-white h-10">
                <PlusCircle className="mr-2 h-5 w-5" /> Add Income
              </Button>
            </AddTransactionDialog>
          )}
          {canUserAddExpense && (
            <AddTransactionDialog currentUser={currentUser} onTransactionAdded={fetchFinancialData} dialogMode="addExpenseOrPurchase">
              <Button size="default" className="bg-red-600 hover:bg-red-700 text-white h-10">
                <Minus className="mr-2 h-5 w-5" /> Add Expense/Purchase
              </Button>
            </AddTransactionDialog>
          )}
          {currentUser.role === 'SYSTEM_ADMIN' && (
            <AddTransactionDialog
                currentUser={currentUser}
                onTransactionAdded={fetchFinancialData}
                dialogMode="sendMoney"
                allUsersForDropdown={allUsers}
            >
            <Button size="default" className="bg-blue-600 hover:bg-blue-600 text-white h-10">
              <Send className="mr-2 h-5 w-5" /> Send Money
            </Button>
          </AddTransactionDialog>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center flex-wrap">
        {currentUser.role === 'SYSTEM_ADMIN' && (
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'personal' | 'global')} className="w-full sm:w-auto order-1 sm:order-none">
            <TabsList className="grid w-full grid-cols-2 sm:max-w-xs">
              <TabsTrigger value="personal">Personal View</TabsTrigger>
              <TabsTrigger value="global">Global View</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {currentUser.role === 'SYSTEM_ADMIN' && viewMode === 'global' && (
           <DropdownMenu open={isUserFilterPopoverOpen} onOpenChange={setIsUserFilterPopoverOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto order-2 sm:order-none flex-shrink-0 h-10">
                  <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{selectedUserNameForFilter}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-80 overflow-y-auto">
                 <Command>
                    <CommandInput placeholder="Search user..." />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => {setSelectedUserIdFilter('all'); setIsUserFilterPopoverOpen(false);}}>
                          <Check className={cn("mr-2 h-4 w-4", selectedUserIdFilter === 'all' ? "opacity-100" : "opacity-0")}/>
                          All Users
                        </CommandItem>
                        {allUsersForFilter.map((user) => (
                           <CommandItem key={user.id} onSelect={() => {setSelectedUserIdFilter(user.id); setIsUserFilterPopoverOpen(false);}}>
                             <Check className={cn("mr-2 h-4 w-4", selectedUserIdFilter === user.id ? "opacity-100" : "opacity-0")}/>
                             {user.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
              </DropdownMenuContent>
            </DropdownMenu>
        )}
        <div className="w-full sm:w-auto grow sm:grow-0 order-3 sm:order-none sm:min-w-[200px] md:min-w-[240px]">
          <Label htmlFor="transaction-type-filter" className="sr-only">Filter by type</Label>
          <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
            <SelectTrigger id="transaction-type-filter" className="w-full h-10 bg-card border-border/50">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by type" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {displayableTransactionTypeFilters.map((filterType) => (
                <SelectItem key={filterType.value} value={filterType.value}>
                  {filterType.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
         <div className="w-full sm:w-auto grow sm:grow-0 order-4 sm:order-none">
            {selectedDateRange ? (
              <DateRangePicker 
                  initialRange={selectedDateRange} 
                  onDateRangeChange={handleDateRangeChange} 
              />
            ) : (
              <Skeleton className="h-10 w-full sm:w-[260px]"/>
            )}
        </div>
        <div className="relative w-full sm:w-auto grow sm:flex-1 order-5 sm:order-none sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
            type="search"
            placeholder="Search transactions..."
            value={transactionSearchTerm}
            onChange={(e) => setTransactionSearchTerm(e.target.value)}
            className="pl-10 bg-background/50 h-10"
            />
        </div>
      </div>


      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {summaryCardsToDisplay.map(card => (
          <Card key={card.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out border bg-card rounded-xl overflow-hidden transform hover:scale-[1.02]">
            <CardContent className="p-4 sm:p-5 flex items-center space-x-4">
              <div className={`p-3 rounded-full ${card.circleBgClass}`}>
                <card.icon className={`h-6 w-6 ${card.iconColorClass}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                {isLoadingContent ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <div className="text-2xl font-bold text-card-foreground font-mono">
                    {formatCurrency(card.value)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-xl border bg-card rounded-lg lg:col-span-2">
          <CardHeader className="border-b p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-card-foreground text-xl">Recent Transactions</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm mt-0.5">
                    {currentUser.role === 'SYSTEM_ADMIN' && viewMode === 'global' && selectedUserIdFilter === 'all' ? "Latest transactions from all users." : 
                     currentUser.role === 'SYSTEM_ADMIN' && viewMode === 'global' && selectedUserIdFilter !== 'all' ? `Latest transactions for selected user.` : 
                     "Your latest income, expense and purchase entries."}
                    {transactionTypeFilter !== 'all' && ` (Filtered by: ${displayableTransactionTypeFilters.find(f=>f.value === transactionTypeFilter)?.label})`}
                  </CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {isLoadingContent ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : filteredTransactions.length > 0 ? (
              <div className="space-y-3 sm:space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {filteredTransactions.map(t => (
                  <TransactionListItem
                    key={t.id}
                    transaction={t}
                    currentUser={currentUser}
                    onDelete={() => handleDeleteRequest(t)}
                    onEdit={() => handleOpenEditDialog(t)}
                    userName={(viewMode === 'global' && userMap.get(t.userId)) || undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Banknote className="h-16 w-16 mx-auto opacity-30 mb-3" />
                <p className="text-lg font-medium">
                  {transactionSearchTerm || transactionTypeFilter !== 'all' || selectedUserIdFilter !== 'all' || (selectedDateRange)
                    ? "No transactions match your filters."
                    : "No transactions yet."}
                </p>
                <p className="text-sm">
                  {transactionSearchTerm || transactionTypeFilter !== 'all' || selectedUserIdFilter !== 'all' || (selectedDateRange)
                    ? "Try adjusting your search or filters."
                    : (canUserAddExpense || currentUser?.role === 'SYSTEM_ADMIN' ? "Add your first transaction to get started!" : "Transaction logging may be restricted for your role.")
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
            <Card className="shadow-xl border bg-card rounded-lg">
                <CardHeader>
                <CardTitle className="text-card-foreground text-xl flex items-center">
                    <PieChart className="mr-2 h-5 w-5 text-primary"/>
                    Expense Breakdown
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm mt-0.5">
                    Spending by category for the selected period.
                </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center min-h-60">
                {isLoadingContent ? (
                    <Skeleton className="h-48 w-48 rounded-full" />
                ) : expenseChartData.length > 0 ? (
                    <ChartContainer config={expenseChartConfig} className="mx-auto aspect-square w-full max-w-[250px]">
                    <RechartsPieChart>
                        <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={expenseChartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            strokeWidth={5}
                            label={({
                                cx,
                                cy,
                                ...props
                            }) => {
                                if (isNaN(cx) || isNaN(cy)) {
                                    return null;
                                }
                                return (
                                    <text
                                        x={cx}
                                        y={cy}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        className="fill-foreground text-center"
                                    >
                                        <tspan
                                            x={cx}
                                            y={cy - 12}
                                            className="text-2xl font-bold"
                                        >
                                            {formatCurrency(totalExpenses).replace('BDT', '৳')}
                                        </tspan>
                                        <tspan
                                            x={cx}
                                            y={cy + 12}
                                            className="text-xs text-muted-foreground"
                                        >
                                            Total Expenses
                                        </tspan>
                                    </text>
                                )
                            }}
                        >
                        {expenseChartData.map((entry, index) => (
                            <Cell
                            key={`cell-${index}`}
                            fill={expenseChartConfig[entry.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()]?.color}
                            className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            />
                        ))}
                        </Pie>
                    </RechartsPieChart>
                    </ChartContainer>
                ) : (
                    <div className="text-center text-muted-foreground">
                    <p>No expense data to display.</p>
                    </div>
                )}
                </CardContent>
                <CardContent className="flex flex-col gap-2 text-sm pt-0">
                    <ChartLegend
                        content={<ChartLegendContent nameKey="name" />}
                        className="flex-wrap gap-2 [&>*]:basis-1/2 [&>*]:justify-center"
                    />
                </CardContent>
            </Card>
        </div>
      </div>

      {isDeleteAlertOpen && transactionToDelete && (
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" /> Are you sure?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the transaction for "<span className="font-semibold">{transactionToDelete.category}</span>" of {formatCurrency(transactionToDelete.amount)}.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteAlertOpen(false)} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteTransaction}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={isDeleting}
              >
                {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Yes, delete it"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isEditDialogVisible && transactionToEdit && currentUser && (
        <EditTransactionDialog
          isOpen={isEditDialogVisible}
          onOpenChange={setIsEditDialogVisible}
          transaction={transactionToEdit}
          currentUser={currentUser}
          onTransactionUpdated={handleTransactionUpdated}
        />
      )}
    </div>
  );
}
    

    


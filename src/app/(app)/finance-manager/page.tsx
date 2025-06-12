
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import type { Transaction, User, TransactionType, GlobalSettings, PersonalNote } from "@/types";
import { getUsers } from '@/lib/user-service';
import { getGlobalSettings } from '@/lib/settings-service';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, ArrowDownCircle, ArrowUpCircle, Wallet, AlertTriangle, Calculator, NotebookPen, RefreshCw, Loader2, Minus, Send, Edit2, Trash2, X, Construction, Search } from 'lucide-react'; // Added Search
import { TransactionListItem } from '@/components/finance-manager/transaction-list-item';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input'; // Added Input
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
  deleteTransactionAction,
  updateTransactionAction,
  getTransactionsForUserAction,
  getAllTransactionsAction,
} from './actions';
import { MultiColorCalculatorIcon } from '@/components/icons/MultiColorCalculatorIcon';
import { Banknote } from 'lucide-react';

const AddTransactionDialog = dynamic(() => import('@/components/finance-manager/add-transaction-dialog').then(mod => mod.AddTransactionDialog));
const EditTransactionDialog = dynamic(() => import('@/components/finance-manager/edit-transaction-dialog').then(mod => mod.EditTransactionDialog));
const CalculatorDialog = dynamic(() => import('@/components/layout/CalculatorDialog').then(mod => mod.CalculatorDialog));


const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

export default function FinanceManagerPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'personal' | 'global'>('personal');
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
  const [allUsersForDialog, setAllUsersForDialog] = useState<User[]>([]);
  const [globalAppSettings, setGlobalAppSettings] = useState<GlobalSettings | null>(null);
  const [transactionSearchTerm, setTransactionSearchTerm] = useState(''); // State for search

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
      let fetchedUsersForMap: User[] = [];
      let fetchedUsersForDialogLocal: User[] = [];

      const settings = await getGlobalSettings();
      setGlobalAppSettings(settings);

      const dataPromises: any[] = [];
      if (currentUser.role === 'SYSTEM_ADMIN' && viewMode === 'global') {
        dataPromises.push(getAllTransactionsAction(), getUsers());
      } else {
        dataPromises.push(getTransactionsForUserAction(currentUser.id));
        if (currentUser.role === 'SYSTEM_ADMIN') {
            dataPromises.push(getUsers());
        }
      }

      const results = await Promise.all(dataPromises);
      fetchedTransactions = results[0] as Transaction[];

      if (currentUser.role === 'SYSTEM_ADMIN' && viewMode === 'global') {
        fetchedUsersForMap = results[1] as User[];
        fetchedUsersForDialogLocal = fetchedUsersForMap.filter(u => u.id !== currentUser.id && u.role !== 'SYSTEM_ADMIN');
        const newUserMap = new Map(fetchedUsersForMap.map(user => [user.id, user.name]));
        setUserMap(newUserMap);
      } else if (currentUser.role === 'SYSTEM_ADMIN') {
        fetchedUsersForMap = results[1] as User[];
        fetchedUsersForDialogLocal = fetchedUsersForMap.filter(u => u.id !== currentUser.id && u.role !== 'SYSTEM_ADMIN');
        setUserMap(new Map());
      } else {
        setUserMap(new Map());
        fetchedUsersForDialogLocal = [];
      }

      setAllUsersForDialog(fetchedUsersForDialogLocal);
      setTransactions(fetchedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error("Failed to fetch financial data, users, or settings:", error);
      toast({ title: "Error", description: "Could not load page data. Please try again.", variant: "destructive" });
      setTransactions([]);
      setUserMap(new Map());
      setAllUsersForDialog([]);
      setGlobalAppSettings(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, viewMode, toast]);

  useEffect(() => {
    if (currentUser) {
      fetchFinancialData();
    }
  }, [currentUser, viewMode, fetchFinancialData]);


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


  const { totalIncome, totalExpenses, availableBalance } = useMemo(() => {
    let income = 0;
    let expensesSum = 0;
    transactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense' || t.type === 'purchase') expensesSum += t.amount;
    });
    return { totalIncome: income, totalExpenses: expensesSum, availableBalance: income - expensesSum };
  }, [transactions]);


  const pageDescription = useMemo(() => {
    if (!currentUser) return "Manage your finances.";
    if (currentUser.role === 'SYSTEM_ADMIN') {
      return viewMode === 'global'
        ? "View and manage all user financial transactions."
        : "Track your personal income, expenses, and send money to staff.";
    }
    return `Track your personal income, expenses, and purchases.`;
  }, [currentUser, viewMode]);

  const filteredTransactions = useMemo(() => {
    if (!transactionSearchTerm.trim()) {
      return transactions;
    }
    const lowerSearchTerm = transactionSearchTerm.toLowerCase();
    return transactions.filter(t => {
      const userName = viewMode === 'global' ? userMap.get(t.userId)?.toLowerCase() : '';
      return (
        t.category.toLowerCase().includes(lowerSearchTerm) ||
        (t.description && t.description.toLowerCase().includes(lowerSearchTerm)) ||
        t.amount.toString().includes(lowerSearchTerm) ||
        (userName && userName.includes(lowerSearchTerm)) ||
        t.type.toLowerCase().includes(lowerSearchTerm)
      );
    });
  }, [transactions, transactionSearchTerm, viewMode, userMap]);


  if (!currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
         <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

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
      if (canUserAddExpense) return true; 
      return card.title === "Total Income";
    });
  }, [totalIncome, totalExpenses, availableBalance, canUserAddExpense, currentUser]);


  return (
    <div className="space-y-6 p-1 sm:p-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Finance Manager</h1>
          <p className="page-description">
            {pageDescription}
            {currentUser.role === 'SYSTEM_ADMIN' && viewMode === 'personal' && ` (Viewing: Personal Data)`}
            {currentUser.role === 'SYSTEM_ADMIN' && viewMode === 'global' && ` (Viewing: Global Data)`}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
           <Button variant="outline" size="icon" onClick={fetchFinancialData} disabled={isLoading} className="h-10 w-10" title="Refresh Data">
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {currentUser.role === 'SYSTEM_ADMIN' && (
            <AddTransactionDialog currentUser={currentUser} onTransactionAdded={fetchFinancialData}>
              <Button size="default" className="bg-green-600 hover:bg-green-700 text-white h-10">
                <PlusCircle className="mr-2 h-5 w-5" /> Add Income
              </Button>
            </AddTransactionDialog>
          )}
          {canUserAddExpense && (
            <AddTransactionDialog currentUser={currentUser} onTransactionAdded={fetchFinancialData}>
              <Button size="default" className="bg-red-600 hover:bg-red-700 text-white h-10">
                <Minus className="mr-2 h-5 w-5" /> Add Expense/Purchase
              </Button>
            </AddTransactionDialog>
          )}
          {currentUser.role === 'SYSTEM_ADMIN' && (
            <AddTransactionDialog
                currentUser={currentUser}
                onTransactionAdded={fetchFinancialData}
                isSendMoneyFlow={true}
                allUsersForDropdown={allUsersForDialog}
            >
            <Button size="default" className="bg-blue-600 hover:bg-blue-700 text-white h-10">
              <Send className="mr-2 h-5 w-5" /> Send Money
            </Button>
          </AddTransactionDialog>
          )}
        </div>
      </div>

      {currentUser.role === 'SYSTEM_ADMIN' && (
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'personal' | 'global')} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 sm:max-w-xs">
            <TabsTrigger value="personal">Personal View</TabsTrigger>
            <TabsTrigger value="global">Global View (All Users)</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {summaryCardsToDisplay.map(card => (
          <Card key={card.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out border bg-card rounded-xl overflow-hidden transform hover:scale-[1.02]">
            <CardContent className="p-4 sm:p-5 flex items-center space-x-4">
              <div className={`p-3 rounded-full ${card.circleBgClass}`}>
                <card.icon className={`h-6 w-6 ${card.iconColorClass}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-card-foreground font-mono">
                    {formatCurrency(card.value)}
                  </p>
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
                    {currentUser.role === 'SYSTEM_ADMIN' && viewMode === 'global' ? "Latest transactions from all users." : "Your latest income, expense and purchase entries."}
                  </CardDescription>
                </div>
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search transactions..."
                    value={transactionSearchTerm}
                    onChange={(e) => setTransactionSearchTerm(e.target.value)}
                    className="pl-10 bg-background/50"
                  />
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {isLoading ? (
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
                  {transactionSearchTerm ? "No transactions match your search." : "No transactions yet."}
                </p>
                <p className="text-sm">
                  {transactionSearchTerm ? "Try a different search term." : 
                    (canUserAddExpense ? "Add your first income or expense to get started!" : "Expense logging may be disabled for your role.")
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
           <Card className="shadow-xl border bg-card rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-card-foreground text-xl flex items-center"><MultiColorCalculatorIcon className="mr-2 h-5 w-5"/>Calculator</CardTitle>
                <CardDescription className="text-muted-foreground text-sm mt-0.5">Quick calculations.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
                <CalculatorDialog>
                  <Button variant="outline" className="w-full">
                    <Calculator className="mr-2 h-4 w-4"/> Open Calculator
                  </Button>
                </CalculatorDialog>
            </CardContent>
          </Card>

           <Card className="shadow-xl border bg-card rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-card-foreground text-xl flex items-center"><NotebookPen className="mr-2 h-5 w-5 text-primary"/>Notes (Coming Soon)</CardTitle>
                <CardDescription className="text-muted-foreground text-sm mt-0.5">Jot down financial reminders.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="text-center py-6 text-muted-foreground">
                <Construction className="h-10 w-10 mx-auto opacity-50 mb-2"/>
                <p className="text-sm">This feature will be available soon!</p>
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

    
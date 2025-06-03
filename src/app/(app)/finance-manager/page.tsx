
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import type { Transaction, User, TransactionType, GlobalSettings, ExpenseLoggingPermissions } from "@/types"; 
import { getTransactionsForUser, getAllTransactions } from "@/lib/personal-finance-service";
import { getUsers } from '@/lib/user-service';
import { getGlobalSettings } from '@/lib/settings-service'; 
import { deleteTransactionAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, ArrowDownCircle, ArrowUpCircle, DollarSign, Wallet, AlertTriangle, ListFilter, Calculator, NotebookPen, RefreshCw, Loader2, Minus, Send } from 'lucide-react';
import { TransactionListItem } from '@/components/finance-manager/transaction-list-item';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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

const AddTransactionDialog = dynamic(() => import('@/components/finance-manager/add-transaction-dialog').then(mod => mod.AddTransactionDialog));
const EditTransactionDialog = dynamic(() => import('@/components/finance-manager/edit-transaction-dialog').then(mod => mod.EditTransactionDialog));


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
        dataPromises.push(getAllTransactions(), getUsers());
      } else {
        dataPromises.push(getTransactionsForUser(currentUser.id));
        if (currentUser.role === 'SYSTEM_ADMIN') { // SysAdmin in personal view still needs all users for "Send Money"
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
      } else if (currentUser.role === 'SYSTEM_ADMIN') { // Personal view for SysAdmin
        fetchedUsersForMap = results[1] as User[]; // all users
        fetchedUsersForDialogLocal = fetchedUsersForMap.filter(u => u.id !== currentUser.id && u.role !== 'SYSTEM_ADMIN');
        setUserMap(new Map()); // No user map needed for personal view display, but keep users for dialog
      } else { // Non-SysAdmin users
        setUserMap(new Map());
        fetchedUsersForDialogLocal = []; 
      }

      setAllUsersForDialog(fetchedUsersForDialogLocal);
      setTransactions(fetchedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error("Failed to fetch financial data, users, or settings:", error);
      toast({ title: "Error", description: "Could not load financial data, users, or settings.", variant: "destructive" });
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
    const allCards = [
      { title: "Total Income", value: totalIncome, icon: ArrowUpCircle, color: "text-green-600", hint: "green money" },
      { title: "Total Expenses & Purchases", value: totalExpenses, icon: ArrowDownCircle, color: "text-red-600", hint: "red money" },
      { title: "Available Balance", value: availableBalance, icon: Wallet, color: availableBalance >= 0 ? "text-blue-600" : "text-orange-600", hint: "wallet coins" },
    ];

    if (currentUser?.role === 'SYSTEM_ADMIN') {
      return allCards; // System Admins see all cards
    }

    if (canUserAddExpense) {
      return allCards; // Users who can add expenses see all cards
    }
    
    // Users who cannot add expenses only see Total Income
    return [allCards[0]]; 
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 sm:pt-5 px-4 sm:px-5">
              <CardTitle className="text-md sm:text-lg font-semibold text-card-foreground">{card.title}</CardTitle>
              <card.icon className={`h-6 w-6 sm:h-7 sm:w-7 ${card.color}`} />
            </CardHeader>
            <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
              {isLoading ? (
                <Skeleton className="h-10 w-3/5" />
              ) : (
                <div className="text-3xl sm:text-4xl font-bold text-card-foreground">{formatCurrency(card.value)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {card.title === "Available Balance" ? "Your current financial standing" : `Total ${card.title.toLowerCase().replace(' & purchases','')} recorded`}
                 {currentUser.role === 'SYSTEM_ADMIN' && viewMode === 'global' && card.title === "Available Balance" && " (All Users Combined)"}
                 {currentUser.role === 'SYSTEM_ADMIN' && viewMode === 'global' && card.title !== "Available Balance" && " (All Users)"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-xl border bg-card rounded-lg lg:col-span-2">
          <CardHeader className="border-b p-5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-card-foreground text-xl">Recent Transactions</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">
                {currentUser.role === 'SYSTEM_ADMIN' && viewMode === 'global' ? "Latest transactions from all users." : "Your latest income, expense and purchase entries."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-3 sm:space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {transactions.map(t => (
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
                <DollarSign className="h-16 w-16 mx-auto opacity-30 mb-3" />
                <p className="text-lg font-medium">No transactions yet.</p>
                <p className="text-sm">
                  {canUserAddExpense ? "Add your first income or expense to get started!" : "Expense logging may be disabled for your role."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-xl border bg-card rounded-lg">
            <CardHeader>
              <CardTitle className="text-card-foreground text-xl flex items-center"><Calculator className="mr-2 h-5 w-5 text-primary"/>Calculator</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">Quick calculations.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-lg">
                Built-in calculator coming soon!
              </div>
            </CardContent>
          </Card>

           <Card className="shadow-xl border bg-card rounded-lg">
            <CardHeader>
              <CardTitle className="text-card-foreground text-xl flex items-center"><NotebookPen className="mr-2 h-5 w-5 text-primary"/>Notes</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">Jot down financial reminders.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-lg">
                 Notes section coming soon!
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
       <Separator className="my-8" />
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Quick Navigation (Coming Soon)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <Button variant="outline" size="lg" className="h-auto py-4 flex-col" disabled>
                  <ListFilter className="h-6 w-6 mb-1.5"/> View All Transactions
              </Button>
              <Button variant="outline" size="lg" className="h-auto py-4 flex-col" disabled>
                  <ArrowUpCircle className="h-6 w-6 mb-1.5 text-green-500"/> Income History
              </Button>
              <Button variant="outline" size="lg" className="h-auto py-4 flex-col" disabled>
                 <ArrowDownCircle className="h-6 w-6 mb-1.5 text-red-500"/> Expense History
              </Button>
              <Button variant="outline" size="lg" className="h-auto py-4 flex-col" disabled>
                <DollarSign className="h-6 w-6 mb-1.5"/> Budgeting Tools
              </Button>
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


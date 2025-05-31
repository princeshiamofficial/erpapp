
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import type { Transaction, User } from "@/types";
import { getTransactionsForUser, getAllTransactions } from "@/lib/personal-finance-service";
import { deleteTransactionAction } from './actions'; // Import the server action
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, ArrowDownCircle, ArrowUpCircle, DollarSign, Wallet, AlertTriangle, ListFilter, Calculator, NotebookPen, RefreshCw, Loader2 } from 'lucide-react';
import { TransactionListItem } from '@/components/finance-manager/transaction-list-item';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'; // For Personal/Global toggle
import { Separator } from '@/components/ui/separator';

const AddTransactionDialog = dynamic(() => import('@/components/finance-manager/add-transaction-dialog').then(mod => mod.AddTransactionDialog));
// Placeholder for future components:
// const EditTransactionDialog = dynamic(() => import('@/components/finance-manager/edit-transaction-dialog').then(mod => mod.EditTransactionDialog));
// const NotesSection = dynamic(() => import('@/components/finance-manager/notes-section').then(mod => mod.NotesSection));
// const FinanceCalculator = dynamic(() => import('@/components/finance-manager/finance-calculator').then(mod => mod.FinanceCalculator));

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

export default function FinanceManagerPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'personal' | 'global'>('personal'); // For System Admin

  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);


  const fetchTransactions = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      let fetchedTransactions: Transaction[];
      if (currentUser.role === 'SYSTEM_ADMIN' && viewMode === 'global') {
        fetchedTransactions = await getAllTransactions();
      } else {
        fetchedTransactions = await getTransactionsForUser(currentUser.id);
      }
      setTransactions(fetchedTransactions);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast({ title: "Error", description: "Could not load transactions.", variant: "destructive" });
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, viewMode, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!currentUser) return;
    // Basic confirmation, can be enhanced with AlertDialog
    if (!confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) {
      return;
    }
    const result = await deleteTransactionAction(transactionId, currentUser.id);
    if (result.success) {
      toast({ title: "Transaction Deleted", description: "The transaction has been removed." });
      fetchTransactions(); // Refresh list
    } else {
      toast({ title: "Deletion Failed", description: result.error || "Could not delete transaction.", variant: "destructive" });
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    // Placeholder for opening an edit dialog
    toast({ title: "Edit (Soon)", description: `Editing transaction ${transaction.id} - to be implemented.`});
  };


  const { totalIncome, totalExpenses, availableBalance } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    transactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expenses += t.amount;
    });
    return { totalIncome: income, totalExpenses: expenses, availableBalance: income - expenses };
  }, [transactions]);

  const summaryCards = [
    { title: "Total Income", value: totalIncome, icon: ArrowUpCircle, color: "text-green-600", hint: "green money" },
    { title: "Total Expenses", value: totalExpenses, icon: ArrowDownCircle, color: "text-red-600", hint: "red money" },
    { title: "Available Balance", value: availableBalance, icon: Wallet, color: availableBalance >= 0 ? "text-blue-600" : "text-orange-600", hint: "wallet coins" },
  ];

  if (!currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
         <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1 sm:p-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Finance Manager</h1>
          <p className="page-description">
            Track your income, expenses, and manage your personal finances.
            {currentUser.role === 'SYSTEM_ADMIN' && ` (Viewing: ${viewMode === 'personal' ? 'Personal' : 'Global'} Data)`}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
           <Button variant="outline" size="icon" onClick={fetchTransactions} disabled={isLoading} className="h-10 w-10" title="Refresh Data">
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <AddTransactionDialog currentUser={currentUser} onTransactionAdded={fetchTransactions}>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground h-10">
              <PlusCircle className="mr-2 h-5 w-5" /> Add Transaction
            </Button>
          </AddTransactionDialog>
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
        {summaryCards.map(card => (
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
                {card.title === "Available Balance" ? "Your current financial standing" : `Total ${card.title.toLowerCase()} recorded`}
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
                Your latest income and expense entries.
              </CardDescription>
            </div>
            {/* <Button variant="outline" size="sm"><ListFilter className="mr-2 h-4 w-4"/>Filter (Soon)</Button> */}
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
                    onDelete={handleDeleteTransaction} 
                    onEdit={handleEditTransaction} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <DollarSign className="h-16 w-16 mx-auto opacity-30 mb-3" />
                <p className="text-lg font-medium">No transactions yet.</p>
                <p className="text-sm">Add your first income or expense to get started!</p>
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
    </div>
  );
}

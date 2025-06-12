
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import type { Transaction, User, TransactionType, GlobalSettings, ExpenseLoggingPermissions, PersonalNote } from "@/types"; 
import { getUsers } from '@/lib/user-service';
import { getGlobalSettings } from '@/lib/settings-service'; 
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, ArrowDownCircle, ArrowUpCircle, DollarSign, Wallet, AlertTriangle, ListFilter, Calculator, NotebookPen, RefreshCw, Loader2, Minus, Send, Edit2, Trash2, X } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Dialog as NoteDialog, DialogContent as NoteDialogContent, DialogHeader as NoteDialogHeader, DialogTitle as NoteDialogTitle, DialogDescription as NoteDialogDescription, DialogFooter as NoteDialogFooter } from "@/components/ui/dialog";
import { addNoteAction, deleteNoteAction, getNotesForUserAction, updateNoteAction } from './actions';
import { MultiColorCalculatorIcon } from '@/components/icons/MultiColorCalculatorIcon'; 
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Banknote } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


const AddTransactionDialog = dynamic(() => import('@/components/finance-manager/add-transaction-dialog').then(mod => mod.AddTransactionDialog));
const EditTransactionDialog = dynamic(() => import('@/components/finance-manager/edit-transaction-dialog').then(mod => mod.EditTransactionDialog));
const CalculatorDialog = dynamic(() => import('@/components/layout/CalculatorDialog').then(mod => mod.CalculatorDialog));


const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

const NOTES_STORAGE_KEY = 'COLORHUT_FINANCE_NOTES_LIST_KEY'; // Updated for list

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

  // Notes state
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);
  const [currentNoteTitle, setCurrentNoteTitle] = useState('');
  const [currentNoteContent, setCurrentNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<PersonalNote | null>(null);
  const [isDeleteNoteAlertOpen, setIsDeleteNoteAlertOpen] = useState(false);


  const fetchFinancialData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      let fetchedTransactions: Transaction[];
      let fetchedUsersForMap: User[] = [];
      let fetchedUsersForDialogLocal: User[] = [];
      let fetchedNotes: PersonalNote[] = [];

      const settings = await getGlobalSettings();
      setGlobalAppSettings(settings);

      const dataPromises: any[] = [getNotesForUserAction(currentUser.id)]; 
      if (currentUser.role === 'SYSTEM_ADMIN' && viewMode === 'global') {
        dataPromises.push(addTransactionAction.getAllTransactions(), getUsers()); // Assuming getAllTransactions is on addTransactionAction or similar
      } else {
        dataPromises.push(addTransactionAction.getTransactionsForUser(currentUser.id)); // Assuming getTransactionsForUser is on addTransactionAction
        if (currentUser.role === 'SYSTEM_ADMIN') { 
            dataPromises.push(getUsers());
        }
      }
      
      const results = await Promise.all(dataPromises);
      fetchedNotes = results[0] as PersonalNote[];
      fetchedTransactions = results[1] as Transaction[];

      if (currentUser.role === 'SYSTEM_ADMIN' && viewMode === 'global') {
        fetchedUsersForMap = results[2] as User[];
        fetchedUsersForDialogLocal = fetchedUsersForMap.filter(u => u.id !== currentUser.id && u.role !== 'SYSTEM_ADMIN');
        const newUserMap = new Map(fetchedUsersForMap.map(user => [user.id, user.name]));
        setUserMap(newUserMap);
      } else if (currentUser.role === 'SYSTEM_ADMIN') { 
        fetchedUsersForMap = results[2] as User[]; 
        fetchedUsersForDialogLocal = fetchedUsersForMap.filter(u => u.id !== currentUser.id && u.role !== 'SYSTEM_ADMIN');
        setUserMap(new Map()); 
      } else { 
        setUserMap(new Map());
        fetchedUsersForDialogLocal = []; 
      }

      setAllUsersForDialog(fetchedUsersForDialogLocal);
      setNotes(fetchedNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.createdAt).getTime()));
      setTransactions(fetchedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error("Failed to fetch financial data, users, settings, or notes:", error);
      toast({ title: "Error", description: "Could not load page data. Please try again.", variant: "destructive" });
      setTransactions([]);
      setUserMap(new Map());
      setAllUsersForDialog([]);
      setGlobalAppSettings(null);
      setNotes([]);
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
    const result = await addTransactionAction.deleteTransaction(transactionToDelete.id, currentUser.id, currentUser.role);
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

  const handleOpenNewNoteDialog = () => {
    setEditingNote(null);
    setCurrentNoteTitle('');
    setCurrentNoteContent('');
    setIsNoteDialogOpen(true);
  };

  const handleOpenEditNoteDialog = (note: PersonalNote) => {
    setEditingNote(note);
    setCurrentNoteTitle(note.title || '');
    setCurrentNoteContent(note.content || '');
    setIsNoteDialogOpen(true);
  };

  const handleSaveNote = async () => {
    if (!currentUser) return;
    if (!currentNoteTitle?.trim()) { // Check if currentNoteTitle is not undefined/null before trimming
      toast({ title: "Validation Error", description: "Note title is required.", variant: "destructive" });
      return;
    }
    setIsSubmittingNote(true);
    let result;
    const noteData = {
      title: currentNoteTitle.trim(),
      content: currentNoteContent.trim(),
      userId: currentUser.id,
    };

    if (editingNote) {
      result = await updateNoteAction(editingNote.id, noteData);
    } else {
      result = await addNoteAction(noteData);
    }
    setIsSubmittingNote(false);

    if (result.success) {
      toast({ title: editingNote ? "Note Updated" : "Note Added", description: "Your note has been saved." });
      setIsNoteDialogOpen(false);
      fetchFinancialData(); 
    } else {
      toast({ title: "Error", description: result.error || "Could not save note.", variant: "destructive" });
    }
  };
  
  const handleDeleteNoteRequest = (note: PersonalNote) => {
    setNoteToDelete(note);
    setIsDeleteNoteAlertOpen(true);
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete || !currentUser) return;
    setIsSubmittingNote(true); // Reuse for delete loading state
    const result = await deleteNoteAction(noteToDelete.id, currentUser.id);
    setIsSubmittingNote(false);
    setIsDeleteNoteAlertOpen(false);

    if (result.success) {
      toast({ title: "Note Deleted", description: "The note has been removed." });
      fetchFinancialData();
    } else {
      toast({ title: "Deletion Failed", description: result.error || "Could not delete note.", variant: "destructive" });
    }
    setNoteToDelete(null);
  };


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
                <Banknote className="h-16 w-16 mx-auto opacity-30 mb-3" />
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
                <CardTitle className="text-card-foreground text-xl flex items-center"><NotebookPen className="mr-2 h-5 w-5 text-primary"/>Notes</CardTitle>
                <CardDescription className="text-muted-foreground text-sm mt-0.5">Jot down financial reminders.</CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={handleOpenNewNoteDialog} className="h-9 w-9" title="Add New Note">
                <PlusCircle className="h-5 w-5 text-primary"/>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              ) : notes.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {notes.map(note => (
                    <div key={note.id} className="p-3 border rounded-md bg-background/50 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground truncate" title={note.title}>{note.title}</h4>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleOpenEditNoteDialog(note)} title="Edit Note">
                            <Edit2 className="h-4 w-4"/>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteNoteRequest(note)} title="Delete Note">
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5" title={note.content}>{note.content || "No content"}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Last updated: {formatDistanceToNowStrict(new Date(note.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <NotebookPen className="h-10 w-10 mx-auto opacity-30 mb-2"/>
                  <p className="text-sm">No notes yet. Click '+' to add one.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
       <Separator className="my-8" />
       {/* Quick Navigation was removed */}

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

      {isNoteDialogOpen && (
        <NoteDialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
          <NoteDialogContent className="sm:max-w-lg">
            <NoteDialogHeader>
              <NoteDialogTitle>{editingNote ? "Edit Note" : "Add New Note"}</NoteDialogTitle>
              <NoteDialogDescription>
                {editingNote ? `Update your note titled "${editingNote.title}".` : "Create a new financial note."}
              </NoteDialogDescription>
            </NoteDialogHeader>
            <div className="py-4 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="noteTitle">Title *</Label>
                <Input id="noteTitle" value={currentNoteTitle} onChange={(e) => setCurrentNoteTitle(e.target.value)} placeholder="e.g., Q1 Budget Ideas" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="noteContent">Content</Label>
                <Textarea id="noteContent" value={currentNoteContent} onChange={(e) => setCurrentNoteContent(e.target.value)} placeholder="Write your detailed notes here..." rows={5} className="min-h-[100px]" />
              </div>
            </div>
            <NoteDialogFooter>
              <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)} disabled={isSubmittingNote}>Cancel</Button>
              <Button onClick={handleSaveNote} disabled={isSubmittingNote || !currentNoteTitle?.trim()}>
                {isSubmittingNote ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : (editingNote ? "Save Changes" : "Add Note")}
              </Button>
            </NoteDialogFooter>
          </NoteDialogContent>
        </NoteDialog>
      )}

      {isDeleteNoteAlertOpen && noteToDelete && (
        <AlertDialog open={isDeleteNoteAlertOpen} onOpenChange={setIsDeleteNoteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-destructive" />Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the note "<span className="font-semibold">{noteToDelete.title}</span>"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteNoteAlertOpen(false)} disabled={isSubmittingNote}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteNote} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmittingNote}>
                {isSubmittingNote ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Deleting...</> : "Yes, Delete Note"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}


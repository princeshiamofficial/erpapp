
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TransactionType, User } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { addTransactionAction } from '@/app/(app)/finance-manager/actions';
import { Loader2, CalendarIcon, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getUsers } from '@/lib/user-service'; // To fetch users for recipient dropdown

interface AddTransactionDialogProps {
  currentUser: User;
  onTransactionAdded: () => void; // Callback to refresh parent list
  children: React.ReactNode; // For DialogTrigger
  isSendMoneyFlow?: boolean; // New prop to indicate "Send Money" specific flow
}

export function AddTransactionDialog({ currentUser, onTransactionAdded, children, isSendMoneyFlow = false }: AddTransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<TransactionType>(isSendMoneyFlow ? 'expense' : 'expense'); // Default to 'expense'
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedSentToUserId, setSelectedSentToUserId] = useState<string | undefined>(undefined);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // When dialog opens, set type based on flow
      setType(isSendMoneyFlow ? 'expense' : 'expense');
      
      if (isSendMoneyFlow) {
        setIsLoadingUsers(true);
        getUsers().then(fetchedUsers => {
          setAllUsers(fetchedUsers.filter(u => u.id !== currentUser.id)); // Exclude current user
          setIsLoadingUsers(false);
        }).catch(err => {
          console.error("Failed to fetch users for Send Money dialog:", err);
          toast({ title: "Error", description: "Could not load users.", variant: "destructive" });
          setIsLoadingUsers(false);
        });
        setCategory("Sent Money"); // Default category for send money
      } else {
        setCategory(""); // Reset category if not send money flow
      }
      
      setAmount('');
      setDescription('');
      setDate(new Date());
      setSelectedSentToUserId(undefined);
    }
  }, [isOpen, isSendMoneyFlow, currentUser.id, toast]);

  useEffect(() => {
    if (isSendMoneyFlow) {
      if (selectedSentToUserId) {
        const recipient = allUsers.find(u => u.id === selectedSentToUserId);
        if (recipient) {
          setCategory(`Sent Money to ${recipient.name}`);
        } else {
          setCategory("Sent Money");
        }
      } else {
        setCategory("Sent Money");
      }
    }
  }, [isSendMoneyFlow, selectedSentToUserId, allUsers]);


  const resetForm = () => {
    setType(isSendMoneyFlow ? 'expense' : 'expense');
    setAmount('');
    setCategory(isSendMoneyFlow ? 'Sent Money' : '');
    setDescription('');
    setDate(new Date());
    setSelectedSentToUserId(undefined);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !date) {
      toast({ title: "Validation Error", description: "Amount, Category, and Date are required.", variant: "destructive" });
      return;
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({ title: "Validation Error", description: "Amount must be a positive number.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const transactionData = {
      type: isSendMoneyFlow ? 'expense' : type, 
      amount: numericAmount,
      category: category.trim(),
      description: description.trim() || undefined,
      date: date.toISOString(), // Send as ISO string
      ...(isSendMoneyFlow && selectedSentToUserId && { 
          relatedUserId: selectedSentToUserId, 
          relatedUserName: allUsers.find(u => u.id === selectedSentToUserId)?.name 
      }),
    };

    // @ts-ignore
    const result = await addTransactionAction(currentUser, transactionData);
    setIsSubmitting(false);

    if (result.success && result.transaction) {
      const successType = isSendMoneyFlow ? 'Payment' : (type.charAt(0).toUpperCase() + type.slice(1));
      toast({ title: `${successType} Recorded`, description: `${category} of ${numericAmount} recorded.` });
      onTransactionAdded();
      setIsOpen(false);
      resetForm();
    } else {
      toast({ title: "Error", description: result.error || "Could not add transaction.", variant: "destructive" });
    }
  };
  
  const getCategoryPlaceholder = () => {
    if (isSendMoneyFlow) return "e.g., Payment for Services";
    if (type === 'income') return "e.g., Salary, Sales";
    if (type === 'purchase') return "e.g., Inventory, Supplies, Groceries";
    return "e.g., Utilities, Rent";
  }

  const dialogTitle = isSendMoneyFlow ? "Record Payment to User" : "Add New Transaction";
  const dialogDescription = isSendMoneyFlow 
    ? "Log an expense for money sent to another user." 
    : `Log a new ${type} entry.`;


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {!isSendMoneyFlow && (
              <div className="space-y-1">
                <Label htmlFor="transaction-type">Type *</Label>
                <Select value={type} onValueChange={(value) => setType(value as TransactionType)} required>
                  <SelectTrigger id="transaction-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="purchase">Purchase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="transaction-amount">Amount (BDT) *</Label>
              <Input id="transaction-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 50.00" min="0.01" step="0.01" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="transaction-category">Category *</Label>
              <Input id="transaction-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={getCategoryPlaceholder()} required />
            </div>
            {isSendMoneyFlow && (
              <div className="space-y-1">
                <Label htmlFor="send-to-user">Send To User (Optional)</Label>
                <Select value={selectedSentToUserId} onValueChange={setSelectedSentToUserId} disabled={isLoadingUsers}>
                  <SelectTrigger id="send-to-user">
                    <SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Select recipient"} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingUsers && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                    {!isLoadingUsers && allUsers.length === 0 && <SelectItem value="no-users" disabled>No other users found</SelectItem>}
                    {!isLoadingUsers && allUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.role.replace(/_/g, ' ')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
             <div className="space-y-1">
              <Label htmlFor="transaction-date">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label htmlFor="transaction-description">Description (Optional)</Label>
              <Input id="transaction-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Weekly supermarket run" />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : (isSendMoneyFlow ? "Record Payment" : "Add Transaction")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

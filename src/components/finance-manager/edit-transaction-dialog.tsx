
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Transaction, TransactionType, User } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { updateTransactionAction } from '@/app/(app)/finance-manager/actions';
import { Loader2, CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface EditTransactionDialogProps {
  currentUser: User;
  transaction: Transaction;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onTransactionUpdated: () => void;
}

export function EditTransactionDialog({ currentUser, transaction, isOpen, onOpenChange, onTransactionUpdated }: EditTransactionDialogProps) {
  const [type, setType] = useState<TransactionType>(transaction.type);
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [category, setCategory] = useState(transaction.category);
  const [description, setDescription] = useState(transaction.description || '');
  const [date, setDate] = useState<Date | undefined>(parseISO(transaction.date));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setCategory(transaction.category);
      setDescription(transaction.description || '');
      setDate(parseISO(transaction.date));
    }
  }, [isOpen, transaction]);

  const resetForm = () => {
    // Fields will be reset/updated by useEffect when transaction prop changes or dialog opens
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
    const updates: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>> = {
      type,
      amount: numericAmount,
      category: category.trim(),
      description: description.trim() || null,
      date: date.toISOString(),
    };

    const result = await updateTransactionAction(transaction.id, updates, currentUser.id);
    setIsSubmitting(false);

    if (result.success) {
      onTransactionUpdated(); // Parent handles toast and closes dialog
    } else {
      toast({ title: "Error", description: result.error || "Could not update transaction.", variant: "destructive" });
    }
  };

  const getCategoryPlaceholder = () => {
    if (type === 'income') return "e.g., Salary, Sales";
    if (type === 'purchase') return "e.g., Inventory, Supplies";
    return "e.g., Utilities, Rent";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); if (!open) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>Update the details for this transaction.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-1">
              <Label htmlFor="edit-transaction-type">Type *</Label>
              <Select value={type} onValueChange={(value) => setType(value as TransactionType)} required>
                <SelectTrigger id="edit-transaction-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-transaction-amount">Amount (BDT) *</Label>
              <Input id="edit-transaction-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 50.00" min="0.01" step="0.01" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-transaction-category">Category *</Label>
              <Input id="edit-transaction-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={getCategoryPlaceholder()} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-transaction-date">Date *</Label>
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
              <Label htmlFor="edit-transaction-description">Description (Optional)</Label>
              <Input id="edit-transaction-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Weekly supermarket run" />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    
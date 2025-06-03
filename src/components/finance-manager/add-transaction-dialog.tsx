
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'; 
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
import { Loader2, CalendarIcon, Users, ChevronsUpDown, Check } from 'lucide-react'; 
import { format } from 'date-fns';
// getUsers import removed as users are now passed as props
import { Command, CommandEmpty, CommandInput, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"; 
import { cn } from "@/lib/utils"; 

interface AddTransactionDialogProps {
  currentUser: User;
  onTransactionAdded: () => void;
  children: React.ReactNode;
  isSendMoneyFlow?: boolean;
  allUsersForDropdown?: User[]; // New prop for pre-fetched users
}

export function AddTransactionDialog({ 
  currentUser, 
  onTransactionAdded, 
  children, 
  isSendMoneyFlow = false,
  allUsersForDropdown = [] // Default to empty array
}: AddTransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<TransactionType>(isSendMoneyFlow ? 'expense' : 'expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  const [selectedSentToUserId, setSelectedSentToUserId] = useState<string | undefined>(undefined);
  const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false); 
  const [userSearchQuery, setUserSearchQuery] = useState(""); 

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const availableUsers = useMemo(() => {
      return allUsersForDropdown.filter(u => u.id !== currentUser.id);
  }, [allUsersForDropdown, currentUser.id]);

  useEffect(() => {
    if (isOpen) {
      setType(isSendMoneyFlow ? 'expense' : 'expense');
      // No longer need to fetch users here, they are passed via props
      // Category setting logic for Send Money flow
      if (isSendMoneyFlow) {
        const recipient = availableUsers.find(u => u.id === selectedSentToUserId);
        setCategory(recipient ? `Sent Money to ${recipient.name}` : "Sent Money");
      } else {
        setCategory(""); // Reset category for other flows
      }
      setAmount('');
      setDescription('');
      setDate(new Date());
      setSelectedSentToUserId(undefined);
      setUserSearchQuery("");
    }
  }, [isOpen, isSendMoneyFlow, selectedSentToUserId, availableUsers]);


  useEffect(() => {
    if (isSendMoneyFlow) {
      if (selectedSentToUserId) {
        const recipient = availableUsers.find(u => u.id === selectedSentToUserId);
        if (recipient) {
          setCategory(`Sent Money to ${recipient.name}`);
        } else {
          setCategory("Sent Money"); 
        }
      } else {
        setCategory("Sent Money"); 
      }
    }
  }, [isSendMoneyFlow, selectedSentToUserId, availableUsers]);

  const resetForm = () => {
    setType(isSendMoneyFlow ? 'expense' : 'expense');
    setAmount('');
    setCategory(isSendMoneyFlow ? "Sent Money" : "");
    setDescription('');
    setDate(new Date());
    setSelectedSentToUserId(undefined);
    setIsSubmitting(false);
    setIsUserPopoverOpen(false);
    setUserSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date || (isSendMoneyFlow && !selectedSentToUserId) ) {
      toast({ title: "Validation Error", description: "Amount, Date, and Recipient (if sending money) are required.", variant: "destructive" });
      return;
    }
    // Category is now auto-set for send money flow, so this check is only for other types
    if (!isSendMoneyFlow && !category.trim()) {
        toast({ title: "Validation Error", description: "Category is required for this transaction type.", variant: "destructive" });
        return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({ title: "Validation Error", description: "Amount must be a positive number.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    const finalCategory = isSendMoneyFlow 
        ? (selectedSentToUserId ? `Sent Money to ${availableUsers.find(u => u.id === selectedSentToUserId)?.name || 'user'}` : "Sent Money")
        : category.trim();

    const transactionPayload = {
      type: isSendMoneyFlow ? 'expense' : type, 
      amount: numericAmount,
      category: finalCategory, 
      description: description.trim() || null,
      date: date.toISOString(),
      sentToUserId: isSendMoneyFlow ? selectedSentToUserId : null,
      sentToUserName: isSendMoneyFlow && selectedSentToUserId ? availableUsers.find(u => u.id === selectedSentToUserId)?.name || null : null,
    };

    const result = await addTransactionAction(currentUser, transactionPayload);
    setIsSubmitting(false);

    if (result.success && result.transaction) {
      const successType = isSendMoneyFlow ? 'Payment' : (type.charAt(0).toUpperCase() + type.slice(1));
      toast({ title: `${successType} Recorded`, description: `${finalCategory} of ${numericAmount} recorded.` });
      if(result.error) { 
        toast({ title: "Notice", description: result.error, variant: "default", duration: 7000 });
      }
      onTransactionAdded();
      setIsOpen(false);
      resetForm();
    } else {
      toast({ title: "Error", description: result.error || "Could not add transaction.", variant: "destructive" });
    }
  };
  
  const getCategoryPlaceholder = () => {
    if (type === 'income') return "e.g., Salary, Sales";
    if (type === 'purchase') return "e.g., Inventory, Supplies, Groceries";
    return "e.g., Utilities, Rent";
  }

  const dialogTitle = isSendMoneyFlow ? "Record Payment to User" : "Add New Transaction";
  const dialogDescription = isSendMoneyFlow 
    ? "Log an expense for money sent to another user. An income transaction will also be recorded for the recipient." 
    : `Log a new ${type} entry.`;

  const filteredUsersForDropdown = useMemo(() => {
    if (!userSearchQuery) return availableUsers;
    return availableUsers.filter(user =>
      user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  }, [availableUsers, userSearchQuery]);

  const canSubmit = useMemo(() => {
    const baseValid = !isSubmitting &&
      amount.trim() && parseFloat(amount) > 0 &&
      date;
    
    if (isSendMoneyFlow) {
      return baseValid && selectedSentToUserId;
    } else {
      return baseValid && category.trim(); // Category is now auto-set for send money
    }
  }, [isSubmitting, amount, category, date, isSendMoneyFlow, selectedSentToUserId]);


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
            
            {!isSendMoneyFlow && (
              <div className="space-y-1">
                <Label htmlFor="transaction-category">Category *</Label>
                <Input id="transaction-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={getCategoryPlaceholder()} required />
              </div>
            )}

            {isSendMoneyFlow && (
              <div className="space-y-1">
                <Label htmlFor="send-to-user">Send To User *</Label>
                <Popover open={isUserPopoverOpen} onOpenChange={setIsUserPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isUserPopoverOpen}
                      className="w-full justify-between"
                    >
                      {selectedSentToUserId
                        ? availableUsers.find((user) => user.id === selectedSentToUserId)?.name
                        : ("Select recipient *")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search user..." 
                        value={userSearchQuery}
                        onValueChange={setUserSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No user found.</CommandEmpty>
                        <CommandGroup>
                          {availableUsers.length === 0 && !userSearchQuery && (
                            <CommandItem disabled>No other users available.</CommandItem>
                          )}
                          {filteredUsersForDropdown.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.name + user.id} 
                              onSelect={() => {
                                setSelectedSentToUserId(user.id);
                                setIsUserPopoverOpen(false);
                                setUserSearchQuery("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedSentToUserId === user.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {user.name} ({user.role.replace(/_/g, ' ')})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
              <Label htmlFor="transaction-description">Description / Notes (Optional)</Label>
              <Input id="transaction-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isSendMoneyFlow ? "e.g., Advance salary payment" : "e.g., Weekly supermarket run"} />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : (isSendMoneyFlow ? "Record Payment" : "Add Transaction")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


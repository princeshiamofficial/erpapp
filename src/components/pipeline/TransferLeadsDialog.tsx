
"use client";

import React, { useState } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { transferLeadsBatchAction } from '@/app/(app)/pipeline/actions';
import { Loader2, ChevronsUpDown, Check, X } from 'lucide-react';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import type { DateRange } from "react-day-picker";
import { subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface TransferLeadsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLeadsTransferred: () => void;
  allCrmUsers: User[];
  currentUser: User;
  sourceCrmId: string;
}

export function TransferLeadsDialog({ isOpen, onOpenChange, onLeadsTransferred, allCrmUsers, currentUser, sourceCrmId }: TransferLeadsDialogProps) {
  const [targetCrmIds, setTargetCrmIds] = useState<string[]>([]);
  const [leadAmount, setLeadAmount] = useState('10');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 29), to: new Date() });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { toast } = useToast();

  const handleTransfer = async () => {
    if (targetCrmIds.length === 0 || !leadAmount || !dateRange?.from || !dateRange?.to) {
      toast({ title: "Missing Information", description: "Please fill all fields.", variant: "destructive" });
      return;
    }
    
    const amount = parseInt(leadAmount, 10);
    if (isNaN(amount) || amount <= 0 || amount > 50) {
      toast({ title: "Invalid Amount", description: "Number of leads must be between 1 and 50.", variant: "destructive" });
      return;
    }

    if (sourceCrmId !== 'all' && targetCrmIds.includes(sourceCrmId)) {
        toast({ title: "Invalid Selection", description: "Source and Target CRM cannot be the same.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    const result = await transferLeadsBatchAction(
        sourceCrmId,
        targetCrmIds,
        amount,
        { from: dateRange.from.toISOString(), to: dateRange.to.toISOString() },
        currentUser
    );
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: "Transfer Successful", description: `${result.transferredCount} total leads have been transferred.` });
      onLeadsTransferred();
      onOpenChange(false);
    } else {
      toast({ title: "Transfer Failed", description: result.error || "An error occurred.", variant: "destructive" });
    }
  };

  const handleTargetCrmSelect = (crmId: string) => {
    setTargetCrmIds(prev => {
        if (prev.includes(crmId)) {
            return prev.filter(id => id !== crmId);
        } else {
            return [...prev, crmId];
        }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Lead Transfer</DialogTitle>
          <DialogDescription>Transfer a number of leads from one CRM to one or more other CRMs within a specific date range.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="lead-amount">Leads to Transfer (per CRM, Max 50)</Label>
            <Input id="lead-amount" type="number" value={leadAmount} onChange={e => {
                const val = e.target.value.replace(/\s/g, '');
                if (val === '' || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 50)) {
                    setLeadAmount(val);
                }
            }} placeholder="e.g., 25" max={50} min={1} />
          </div>
          <div className="space-y-1">
            <Label>Date Range of Leads</Label>
            <DateRangePicker initialRange={dateRange} onDateRangeChange={(range) => setDateRange(range)} />
          </div>
          <div className="space-y-1">
            <Label>To CRM(s)</Label>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={isPopoverOpen} className="w-full justify-between h-auto min-h-10">
                  <div className="flex flex-wrap gap-1">
                    {targetCrmIds.length > 0 ? (
                      targetCrmIds.map(id => {
                        const user = allCrmUsers.find(u => u.id === id);
                        return <Badge key={id} variant="secondary">{user?.name || id}</Badge>
                      })
                    ) : (
                      "Select target CRM(s)..."
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search CRM user..." />
                  <CommandList>
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup>
                       {allCrmUsers.filter(u => u.id !== sourceCrmId).map(user => (
                        <CommandItem
                          key={user.id}
                          value={user.name}
                          onSelect={() => handleTargetCrmSelect(user.id)}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              targetCrmIds.includes(user.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {user.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleTransfer} disabled={isSubmitting || sourceCrmId === 'all' || targetCrmIds.length === 0 || !leadAmount}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Transferring...</> : "Transfer Leads"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TransferLeadsDialog;

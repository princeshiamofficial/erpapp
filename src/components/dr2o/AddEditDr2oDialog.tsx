
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import type { Dr2oEntry, User } from '@/types';
import { addDr2oEntryAction, updateDr2oEntryAction } from '@/app/(app)/workflow/actions';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AddEditDr2oDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDr2oSaved: () => void;
  entry?: Dr2oEntry | null;
  currentUser: User;
}

export function AddEditDr2oDialog({ isOpen, onOpenChange, onDr2oSaved, entry, currentUser }: AddEditDr2oDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [newCustomer1, setNewCustomer1] = useState('');
  const [newCustomer2, setNewCustomer2] = useState('');
  const [newCustomer3, setNewCustomer3] = useState('');
  const [oldCustomer1, setOldCustomer1] = useState('');
  const [oldCustomer2, setOldCustomer2] = useState('');
  const [oldCustomer3, setOldCustomer3] = useState('');
  const [oldCustomer4, setOldCustomer4] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!entry;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && entry) {
        setDate(new Date(entry.date));
        setNewCustomer1(entry.newCustomer1 || '');
        setNewCustomer2(entry.newCustomer2 || '');
        setNewCustomer3(entry.newCustomer3 || '');
        setOldCustomer1(entry.oldCustomer1 || '');
        setOldCustomer2(entry.oldCustomer2 || '');
        setOldCustomer3(entry.oldCustomer3 || '');
        setOldCustomer4(entry.oldCustomer4 || '');
      } else {
        setDate(new Date());
        setNewCustomer1('');
        setNewCustomer2('');
        setNewCustomer3('');
        setOldCustomer1('');
        setOldCustomer2('');
        setOldCustomer3('');
        setOldCustomer4('');
      }
      setIsSubmitting(false);
    }
  }, [isOpen, entry, isEditMode]);

  const canSelectDate = currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast({ title: "Validation Error", description: "Date is required.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);

    const entryData = {
      date: date.toISOString(),
      crmId: currentUser.id,
      crmName: currentUser.name,
      newCustomer1, newCustomer2, newCustomer3,
      oldCustomer1, oldCustomer2, oldCustomer3, oldCustomer4,
    };

    let result;
    if (isEditMode && entry) {
      result = await updateDr2oEntryAction(entry.id, entryData);
    } else {
      result = await addDr2oEntryAction(entryData);
    }
    
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: `Report ${isEditMode ? 'Updated' : 'Submitted'}`, description: "Your daily report has been saved." });
      onDr2oSaved();
    } else {
      toast({ title: "Error", description: result.error || "Failed to save the report.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Add'} Daily Report</DialogTitle>
          <DialogDescription>
            {isEditMode ? `Editing report for ${format(new Date(entry.date), 'PPP')}` : 'Fill in your daily customer follow-ups.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="space-y-1">
            <Label htmlFor="report-date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                  disabled={!canSelectDate && !isEditMode}
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
                  disabled={!canSelectDate && !isEditMode}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">New Customers</legend>
            <div className="space-y-2 mt-2">
              <Input value={newCustomer1} onChange={e => setNewCustomer1(e.target.value)} placeholder="New Customer 1" />
              <Input value={newCustomer2} onChange={e => setNewCustomer2(e.target.value)} placeholder="New Customer 2" />
              <Input value={newCustomer3} onChange={e => setNewCustomer3(e.target.value)} placeholder="New Customer 3" />
            </div>
          </fieldset>

          <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Old Customer Follow-ups</legend>
            <div className="space-y-2 mt-2">
              <Input value={oldCustomer1} onChange={e => setOldCustomer1(e.target.value)} placeholder="Old Customer 1" />
              <Input value={oldCustomer2} onChange={e => setOldCustomer2(e.target.value)} placeholder="Old Customer 2" />
              <Input value={oldCustomer3} onChange={e => setOldCustomer3(e.target.value)} placeholder="Old Customer 3" />
              <Input value={oldCustomer4} onChange={e => setOldCustomer4(e.target.value)} placeholder="Old Customer 4" />
            </div>
          </fieldset>
          
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (isEditMode ? 'Save Changes' : 'Submit Report')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

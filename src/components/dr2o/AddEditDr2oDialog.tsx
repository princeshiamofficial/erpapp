

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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar as CalendarIcon, PlusCircle, Trash2, XCircle } from 'lucide-react';
import type { Dr2oEntry, User, LrEntryItem } from '@/types';
import { addDr2oEntryAction, updateDr2oEntryAction } from '@/app/(app)/workflow/actions';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AddEditDr2oDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDr2oSaved: () => void;
  entry?: Dr2oEntry | null;
  currentUser: User;
  team: 'CR' | 'DR' | 'LR';
}

const LR_DRAFT_STORAGE_KEY = 'lrDailyEntryDraft';

export function AddEditDr2oDialog({ isOpen, onOpenChange, onDr2oSaved, entry, currentUser, team }: AddEditDr2oDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [newCustomer1, setNewCustomer1] = useState('');
  const [newCustomer2, setNewCustomer2] = useState('');
  const [newCustomer3, setNewCustomer3] = useState('');
  const [oldCustomer1, setOldCustomer1] = useState('');
  const [oldCustomer2, setOldCustomer2] = useState('');
  const [oldCustomer3, setOldCustomer3] = useState('');
  const [oldCustomer4, setOldCustomer4] = useState('');
  const [lrItems, setLrItems] = useState<LrEntryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!entry;
  const isAdmin = useMemo(() => currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN', [currentUser]);

  // Load from localStorage on initial mount or when dialog opens for a new entry
  useEffect(() => {
    if (isOpen && !isEditMode && team === 'LR') {
      try {
        const savedDraft = localStorage.getItem(LR_DRAFT_STORAGE_KEY);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          if (draft.date) setDate(new Date(draft.date));
          if (draft.lrItems && draft.lrItems.length > 0) {
            setLrItems(draft.lrItems);
          } else {
             setLrItems([{ id: uuidv4(), companyName: '', productName: '', productQty: 0, courierId: '', dueOrderName: '', dueOrderQty: 0 }]);
          }
          toast({ title: "Draft Restored", description: "Your previously unsaved entry has been loaded.", duration: 3000 });
        } else {
          setLrItems([{ id: uuidv4(), companyName: '', productName: '', productQty: 0, courierId: '', dueOrderName: '', dueOrderQty: 0 }]);
        }
      } catch (error) {
        console.error("Failed to parse LR draft from localStorage", error);
        setLrItems([{ id: uuidv4(), companyName: '', productName: '', productQty: 0, courierId: '', dueOrderName: '', dueOrderQty: 0 }]);
      }
    }
  }, [isOpen, isEditMode, team, toast]);

  // Save to localStorage on change for LR new entry mode
  useEffect(() => {
    if (isOpen && !isEditMode && team === 'LR') {
      const draft = {
        date: date?.toISOString(),
        lrItems,
      };
      localStorage.setItem(LR_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }
  }, [date, lrItems, isOpen, isEditMode, team]);


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
        if (team !== 'LR') { // Only reset for non-LR or if no items exist
            setLrItems(entry.lrItems && entry.lrItems.length > 0 ? entry.lrItems : [{ id: uuidv4(), companyName: '', productName: '', productQty: 0, courierId: '', dueOrderName: '', dueOrderQty: 0 }]);
        }
      } else {
        if (team !== 'LR') { // Non-LR teams always reset
             setDate(new Date());
             setNewCustomer1(''); setNewCustomer2(''); setNewCustomer3('');
             setOldCustomer1(''); setOldCustomer2(''); setOldCustomer3(''); setOldCustomer4('');
             setLrItems([{ id: uuidv4(), companyName: '', productName: '', productQty: 0, courierId: '', dueOrderName: '', dueOrderQty: 0 }]);
        }
      }
      setIsSubmitting(false);
    }
  }, [isOpen, entry, isEditMode, team]);

  const canSelectDate = currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN';
  const canEditEntry = isEditMode ? (currentUser.id === entry?.crmId || isAdmin) : true;
  
  const handleLrItemChange = (id: string, field: keyof LrEntryItem, value: string | number) => {
    setLrItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };
  
  const handleAddLrItem = () => {
    setLrItems(prev => [...prev, { id: uuidv4(), companyName: '', productName: '', productQty: 0, courierId: '', dueOrderName: '', dueOrderQty: 0 }]);
  };

  const handleRemoveLrItem = (id: string) => {
    if (lrItems.length > 1) {
      setLrItems(prev => prev.filter(item => item.id !== id));
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast({ title: "Validation Error", description: "Date is required.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);

    const entryData = {
      date: date.toISOString(),
      crmId: isEditMode && entry ? entry.crmId : currentUser.id,
      crmName: isEditMode && entry ? entry.crmName : currentUser.name,
      newCustomer1, newCustomer2, newCustomer3,
      oldCustomer1, oldCustomer2, oldCustomer3, oldCustomer4,
      lrItems: team === 'LR' ? lrItems.filter(item => item.companyName.trim() !== '' || item.productName.trim() !== '') : [],
    };

    let result;
    if (isEditMode && entry) {
      result = await updateDr2oEntryAction(entry.id, entryData, team);
    } else {
      result = await addDr2oEntryAction(entryData, team);
    }
    
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: `Report ${isEditMode ? 'Updated' : 'Submitted'}`, description: "Your daily report has been saved." });
      if (!isEditMode && team === 'LR') {
        localStorage.removeItem(LR_DRAFT_STORAGE_KEY);
      }
      onDr2oSaved();
    } else {
      toast({ title: "Error", description: result.error || "Failed to save the report.", variant: "destructive" });
    }
  };
  
  const getDialogTitle = () => {
    const action = isEditMode ? 'Edit' : 'Add';
    switch(team) {
      case 'CR': return `${action} CR Report`;
      case 'DR': return `${action} DR Report`;
      case 'LR': return `${action} LR Daily Entry`;
      default: return `${action} Daily Report`;
    }
  };

  const getDialogDescription = () => {
    if (isEditMode) return `Editing report for ${format(new Date(entry!.date), 'PPP')}`;
    switch (team) {
      case 'CR': return 'Fill in your daily customer follow-ups.';
      case 'DR': return 'Fill in your daily DR follow-ups.';
      case 'LR': return 'Submit your daily entry for the logistics team.';
      default: return 'Fill in your daily report.';
    }
  };

  
  const renderFormFields = () => {
    if (team === 'LR') {
      return (
        <div className="space-y-4">
          {/* Mobile View */}
          <div className="space-y-4 md:hidden">
            {lrItems.map((item, index) => (
              <div key={item.id} className="p-3 border rounded-lg bg-muted/30 space-y-2 relative">
                <p className="font-semibold text-sm">Item {index + 1}</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <div className="space-y-1">
                    <Label htmlFor={`m-companyName-${item.id}`} className="text-xs">Company Name</Label>
                    <Input id={`m-companyName-${item.id}`} value={item.companyName} onChange={e => handleLrItemChange(item.id, 'companyName', e.target.value)} disabled={!canEditEntry} />
                  </div>
                   <div className="space-y-1">
                    <Label htmlFor={`m-productName-${item.id}`} className="text-xs">Product Name</Label>
                    <Input id={`m-productName-${item.id}`} value={item.productName} onChange={e => handleLrItemChange(item.id, 'productName', e.target.value)} disabled={!canEditEntry} />
                  </div>
                   <div className="space-y-1">
                    <Label htmlFor={`m-productQty-${item.id}`} className="text-xs">Product Qty</Label>
                    <Input id={`m-productQty-${item.id}`} type="number" value={item.productQty} onChange={e => handleLrItemChange(item.id, 'productQty', parseInt(e.target.value) || 0)} disabled={!canEditEntry} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`m-courierId-${item.id}`} className="text-xs">Courier ID</Label>
                    <Input id={`m-courierId-${item.id}`} value={item.courierId} onChange={e => handleLrItemChange(item.id, 'courierId', e.target.value)} disabled={!canEditEntry} />
                  </div>
                   <div className="space-y-1">
                    <Label htmlFor={`m-dueOrderName-${item.id}`} className="text-xs">Due Order Name</Label>
                    <Input id={`m-dueOrderName-${item.id}`} value={item.dueOrderName} onChange={e => handleLrItemChange(item.id, 'dueOrderName', e.target.value)} disabled={!canEditEntry} />
                  </div>
                   <div className="space-y-1">
                    <Label htmlFor={`m-dueOrderQty-${item.id}`} className="text-xs">Due Order Qty</Label>
                    <Input id={`m-dueOrderQty-${item.id}`} type="number" value={item.dueOrderQty} onChange={e => handleLrItemChange(item.id, 'dueOrderQty', parseInt(e.target.value) || 0)} disabled={!canEditEntry} />
                  </div>
                </div>
                {lrItems.length > 1 && canEditEntry && (
                  <Button variant="ghost" size="icon" className="absolute -top-1 -right-1 h-7 w-7" onClick={() => handleRemoveLrItem(item.id)}>
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          {/* Desktop View */}
          <div className="hidden md:block space-y-4">
            {lrItems.map((item, index) => (
              <div key={item.id} className="p-3 border rounded-lg bg-muted/30 relative">
                <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                  <div className="space-y-1">
                    <Label htmlFor={`d-companyName-${item.id}`} className="text-xs">Company Name</Label>
                    <Input id={`d-companyName-${item.id}`} value={item.companyName} onChange={e => handleLrItemChange(item.id, 'companyName', e.target.value)} className="h-9" disabled={!canEditEntry}/>
                  </div>
                   <div className="space-y-1">
                    <Label htmlFor={`d-productName-${item.id}`} className="text-xs">Product Name</Label>
                    <Input id={`d-productName-${item.id}`} value={item.productName} onChange={e => handleLrItemChange(item.id, 'productName', e.target.value)} className="h-9" disabled={!canEditEntry}/>
                  </div>
                   <div className="space-y-1">
                    <Label htmlFor={`d-productQty-${item.id}`} className="text-xs">Product Qty</Label>
                    <Input id={`d-productQty-${item.id}`} type="number" value={item.productQty} onChange={e => handleLrItemChange(item.id, 'productQty', parseInt(e.target.value) || 0)} className="h-9" disabled={!canEditEntry}/>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`d-courierId-${item.id}`} className="text-xs">Courier ID</Label>
                    <Input id={`d-courierId-${item.id}`} value={item.courierId} onChange={e => handleLrItemChange(item.id, 'courierId', e.target.value)} className="h-9" disabled={!canEditEntry}/>
                  </div>
                   <div className="space-y-1">
                    <Label htmlFor={`d-dueOrderName-${item.id}`} className="text-xs">Due Order Name</Label>
                    <Input id={`d-dueOrderName-${item.id}`} value={item.dueOrderName} onChange={e => handleLrItemChange(item.id, 'dueOrderName', e.target.value)} className="h-9" disabled={!canEditEntry}/>
                  </div>
                   <div className="space-y-1">
                    <Label htmlFor={`d-dueOrderQty-${item.id}`} className="text-xs">Due Order Qty</Label>
                    <Input id={`d-dueOrderQty-${item.id}`} type="number" value={item.dueOrderQty} onChange={e => handleLrItemChange(item.id, 'dueOrderQty', parseInt(e.target.value) || 0)} className="h-9" disabled={!canEditEntry}/>
                  </div>
                </div>
                {lrItems.length > 1 && canEditEntry && (
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => handleRemoveLrItem(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {canEditEntry && (
            <Button type="button" variant="outline" size="sm" onClick={handleAddLrItem}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Row
            </Button>
          )}
        </div>
      );
    }
    
    // Default fields for CR and DR
    return (
      <>
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
      </>
    );
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
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
          
          {renderFormFields()}
          
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !canEditEntry}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (isEditMode ? 'Save Changes' : 'Submit Report')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

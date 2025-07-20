
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Lead, User } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { addLeadAction, updateLeadAction } from '@/app/(app)/pipeline/actions';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO } from "date-fns";

interface AddEditLeadDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLeadSaved: () => void;
  lead?: Lead | null;
  currentUser: User;
}

const CATEGORIES: Array<Lead['category']> = ['POP', 'POG', 'OC', 'OD', 'B2B'];

export function AddEditLeadDialog({ isOpen, onOpenChange, onLeadSaved, lead, currentUser }: AddEditLeadDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [schedule, setSchedule] = useState<Date | undefined>();
  const [contactName, setContactName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<Lead['category'] | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!lead;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && lead) {
        setDate(parseISO(lead.date));
        setSchedule(lead.schedule ? parseISO(lead.schedule) : undefined);
        setContactName(lead.contactName);
        setBusinessName(lead.businessName);
        setPhone(lead.phone);
        setSource(lead.source);
        setAddress(lead.address);
        setCategory(lead.category);
        setNotes(lead.notes || '');
      } else {
        // Reset for add mode
        setDate(new Date());
        setSchedule(undefined);
        setContactName('');
        setBusinessName('');
        setPhone('');
        setSource('');
        setAddress('');
        setCategory('');
        setNotes('');
      }
    }
  }, [isOpen, lead, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !contactName || !businessName || !phone || !source || !address || !category) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const leadData = {
      date: date.toISOString(),
      schedule: schedule ? schedule.toISOString() : null,
      contactName, businessName, phone, source, address, category,
      notes: notes || null,
    };

    let result;
    if (isEditMode) {
      result = await updateLeadAction(lead.id, leadData);
    } else {
      result = await addLeadAction(leadData, currentUser);
    }
    
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: `Lead ${isEditMode ? 'Updated' : 'Added'}`, description: `Lead for "${contactName}" has been saved.` });
      onLeadSaved();
    } else {
      toast({ title: "Error", description: result.error || `Could not ${isEditMode ? 'update' : 'add'} lead.`, variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? `Update details for the lead: ${lead.contactName}` : 'Enter the details for the new sales lead.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="date">Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label htmlFor="schedule">Schedule (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {schedule ? format(schedule, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={schedule} onSelect={setSchedule} initialFocus /></PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-1">
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
              </div>
            <div className="space-y-1">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="source">Source *</Label>
                <Input id="source" value={source} onChange={(e) => setSource(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Address *</Label>
              <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
             <div className="space-y-1">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as Lead['category'])} required>
                <SelectTrigger id="category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (isEditMode ? 'Save Changes' : 'Add Lead')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

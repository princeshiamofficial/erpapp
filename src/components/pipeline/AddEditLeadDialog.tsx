
"use client";

import React, { useState, useEffect, useRef } from 'react';
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
import type { Lead, User, CustomerType, LeadCategory, LeadStatusType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { addLeadAction, updateLeadAction } from '@/app/(app)/pipeline/actions';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO } from "date-fns";
import { cn } from '@/lib/utils';
import { divisions } from '@/lib/district-data';

interface AddEditLeadDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLeadSaved: (savedLead?: Lead, isEdit?: boolean) => void;
  lead?: Lead | null;
  currentUser: User;
}

const LEAD_SOURCES = ["Facebook", "WhatsApp", "Office Visit", "Phone Call", "Others"];
const CUSTOMER_TYPES: CustomerType[] = ["WARM", "COLD", "Order Lock"];

export function AddEditLeadDialog({ isOpen, onOpenChange, onLeadSaved, lead, currentUser }: AddEditLeadDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [schedule, setSchedule] = useState<Date | undefined>();
  const [contactName, setContactName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [source, setSource] = useState('');
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');
  const [thana, setThana] = useState('');
  const [notes, setNotes] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const contactNameInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!lead;

  const validatePhone = (phoneNumber: string) => {
    if (phoneNumber.length > 0 && !phoneNumber.startsWith('0')) {
      setPhoneError("Phone number must start with 0.");
    } else if (phoneNumber.length > 0 && phoneNumber.length !== 11) {
      setPhoneError("Phone number must be 11 digits long.");
    } else {
      setPhoneError(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && lead) {
        setDate(parseISO(lead.date));
        setSchedule(lead.schedule ? parseISO(lead.schedule) : undefined);
        setContactName(lead.contactName);
        setBusinessName(lead.businessName);
        setPhone(lead.phone);
        setSource(lead.source);
        setDivision(lead.division || '');
        setDistrict(lead.district || '');
        setThana(lead.thana || '');
        setNotes(lead.notes || '');
        setCustomerType(lead.customerType || '');
        setPhoneError(null);
      } else {
        // Reset for add mode
        setDate(new Date());
        setSchedule(undefined);
        setContactName('');
        setBusinessName('');
        setPhone('');
        setSource('');
        setDivision('');
        setDistrict('');
        setThana('');
        setNotes('');
        setCustomerType('');
        setPhoneError(null);
      }
      setTimeout(() => {
        contactNameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, lead, isEditMode]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, '');
    if (numericValue.length <= 11) {
        setPhone(numericValue);
        validatePhone(numericValue);
    }
  };

  const handleDivisionChange = (value: string) => {
    setDivision(value);
    setDistrict(''); // Reset district when division changes
  };

  const districtOptions = division ? divisions.find(d => d.division === division)?.districts || [] : [];


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    validatePhone(phone);
    if (phoneError) {
        toast({ title: "Validation Error", description: phoneError, variant: "destructive" });
        return;
    }

    if (!date || !contactName || !businessName || !phone || !source || !division || !district || !thana || !customerType) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    const phoneRegex = /^0\d{10}$/;
    if (!phoneRegex.test(phone)) {
      toast({
        title: "Validation Error",
        description: "Invalid phone number. It must be an 11-digit number starting with 0.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    const addressParts = [];
    if (thana) addressParts.push(thana.trim());
    if (district) addressParts.push(district.trim());
    if (division && division.trim().toLowerCase() !== district.trim().toLowerCase()) {
      addressParts.push(division.trim());
    }
    const combinedAddress = addressParts.filter(Boolean).join(', ');

    const leadData: Omit<Lead, 'id' | 'crmId' | 'crmName' | 'activityHistory' | 'category' | 'status'> & { category?: LeadCategory, status?: LeadStatusType } = {
      date: date.toISOString(),
      schedule: schedule ? schedule.toISOString() : null,
      contactName, businessName, phone, source, 
      address: combinedAddress,
      division: division || null,
      district: district || null,
      thana: thana || null,
      notes: notes || null,
      customerType: customerType || null,
    };
    
    let result;
    if (isEditMode && lead) {
      result = await updateLeadAction(lead.id, leadData);
      if (result.success && result.lead) {
        onLeadSaved(result.lead, true);
      }
    } else {
        const createData: Omit<Lead, 'id' | 'crmId' | 'crmName' | 'activityHistory' | 'category' | 'status'> & { category?: LeadCategory, status?: LeadStatusType } = leadData;
        result = await addLeadAction(createData, currentUser);
        if (result.success && result.lead) {
            onLeadSaved(result.lead, false);
        }
    }
    
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: `Lead ${isEditMode ? 'Updated' : 'Added'}`, description: `Lead for "${contactName}" has been saved.` });
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
                <Label htmlFor="date">Date</Label>
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
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={schedule}
                      onSelect={setSchedule}
                      disabled={{ before: new Date() }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-1">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input id="contactName" ref={contactNameInputRef} value={contactName} onChange={(e) => setContactName(e.target.value)} required />
              </div>
            <div className="space-y-1">
              <Label htmlFor="businessName">Business Name</Label>
              <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required placeholder="e.g., Color Hut"/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    required
                    pattern="0\d{10}"
                    maxLength={11}
                    title="Phone number must be an 11-digit number starting with 0."
                    placeholder="01xxxxxxxxx"
                    className={cn(phoneError && "border-destructive focus-visible:ring-destructive")}
                />
                {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="source">Source</Label>
                <Select value={source} onValueChange={setSource} required>
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Select a source" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="division">Division</Label>
                    <Select value={division} onValueChange={handleDivisionChange}>
                        <SelectTrigger id="division"><SelectValue placeholder="Select Division" /></SelectTrigger>
                        <SelectContent>
                            {divisions.map(d => <SelectItem key={d.division} value={d.division}>{d.division}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="district">District</Label>
                    <Select value={district} onValueChange={setDistrict} disabled={!division}>
                        <SelectTrigger id="district"><SelectValue placeholder="Select District" /></SelectTrigger>
                        <SelectContent>
                            {districtOptions.map(d => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
             <div className="space-y-1">
                <Label htmlFor="thana">Thana</Label>
                <Input id="thana" value={thana} onChange={(e) => setThana(e.target.value)} placeholder="Enter Thana/Upazila" required/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="customerType">Customer Type</Label>
              <Select value={customerType} onValueChange={(value) => setCustomerType(value as CustomerType)} required>
                <SelectTrigger id="customerType">
                  <SelectValue placeholder="Select a customer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WARM">WARM</SelectItem>
                  <SelectItem value="COLD">COLD</SelectItem>
                  <SelectItem value="Order Lock">Order Lock</SelectItem>
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
            <Button type="submit" disabled={isSubmitting || !!phoneError}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (isEditMode ? 'Save Changes' : 'Add Lead')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

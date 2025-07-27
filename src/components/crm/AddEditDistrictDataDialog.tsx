
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DistrictDataEntry } from "@/types";
import { divisions } from '@/lib/district-data';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';


interface AddEditDistrictDataDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDataSaved: () => void;
  entry?: DistrictDataEntry | null;
}

export function AddEditDistrictDataDialog({ isOpen, onOpenChange, onDataSaved, entry }: AddEditDistrictDataDialogProps) {
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [jobId, setJobId] = useState('');
  const [orderDate, setOrderDate] = useState<Date | undefined>(new Date());
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!entry;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && entry) {
        // In a real scenario, you'd find the division/district for the entry's address
        // For now, we'll leave it blank or pre-fill if possible
        setSelectedDivision('');
        setSelectedDistrict('');
        setJobId(entry.jobId);
        setOrderDate(entry.orderDate ? new Date(entry.orderDate) : new Date());
        setBusinessName(entry.businessName);
        setAddress(entry.address);
        setPhone(entry.phone);
      } else {
        // Reset form for add mode
        setSelectedDivision('');
        setSelectedDistrict('');
        setJobId('');
        setOrderDate(new Date());
        setBusinessName('');
        setAddress('');
        setPhone('');
      }
    }
  }, [isOpen, entry, isEditMode, toast]);
  
  const handleDivisionChange = (divisionName: string) => {
    setSelectedDivision(divisionName);
    setSelectedDistrict(''); // Reset district when division changes
  };

  const districtOptions = divisions.find(d => d.division === selectedDivision)?.districts || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDivision || !selectedDistrict || !jobId || !orderDate || !businessName || !address || !phone) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields.",
        variant: "destructive"
      });
      return;
    }
    // In a real implementation, you would save the data here.
    // For this UI-only change, we'll just simulate a success.
    setIsSubmitting(true);
    console.log("Submitting Data:", {
        division: selectedDivision,
        district: selectedDistrict,
        jobId,
        orderDate: orderDate.toISOString(),
        businessName,
        address,
        phone,
    });
    setTimeout(() => {
        setIsSubmitting(false);
        onDataSaved();
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} District Data</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this entry.' : 'Manually enter the data for a new district entry.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="division">Division *</Label>
                <Select value={selectedDivision} onValueChange={handleDivisionChange} required>
                  <SelectTrigger id="division"><SelectValue placeholder="Select a division" /></SelectTrigger>
                  <SelectContent>
                    {divisions.map(div => <SelectItem key={div.division} value={div.division}>{div.division}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="district">District *</Label>
                <Select value={selectedDistrict} onValueChange={setSelectedDistrict} required disabled={!selectedDivision}>
                  <SelectTrigger id="district"><SelectValue placeholder="Select a district" /></SelectTrigger>
                  <SelectContent>
                    {districtOptions.map(dist => <SelectItem key={dist.name} value={dist.name}>{dist.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="job-id">Job ID *</Label>
                <Input id="job-id" value={jobId} onChange={e => setJobId(e.target.value)} required placeholder="e.g., 1911" />
              </div>
               <div className="space-y-1">
                <Label htmlFor="order-date">Order Date *</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !orderDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {orderDate ? format(orderDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={orderDate}
                        onSelect={setOrderDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
              </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="business-name">Business Name *</Label>
            <Input id="business-name" value={businessName} onChange={e => setBusinessName(e.target.value)} required placeholder="e.g., Acme Corp"/>
          </div>
           <div className="space-y-1">
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="e.g., 01712345678"/>
          </div>
          <div className="space-y-1">
            <Label htmlFor="address">Address *</Label>
            <Textarea id="address" value={address} onChange={e => setAddress(e.target.value)} required placeholder="Full address of the business"/>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving...' : 'Save Data'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

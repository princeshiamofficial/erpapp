
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import type { User, ServicePaymentMethodItem, BillReport } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { addBillReportAction } from '@/app/(app)/vendors/actions';


interface AddEditBillReportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: () => void;
  vendors: User[];
  paymentMethods: ServicePaymentMethodItem[];
}

export function AddEditBillReportDialog({ isOpen, onOpenChange, onSave, vendors, paymentMethods }: AddEditBillReportDialogProps) {
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [payment, setPayment] = useState('');
  const [method, setMethod] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId || !amount || !payment || !method || !selectedVendor || !selectedDate) {
      toast({ title: "Validation Error", description: "All fields are required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    const reportData: Omit<BillReport, 'id'> = {
      vendorId: selectedVendor,
      vendorName: vendors.find(v => v.id === selectedVendor)?.name || 'Unknown',
      date: selectedDate.toISOString(),
      invoiceId,
      amount: parseFloat(amount),
      payment: parseFloat(payment),
      method,
    };

    const result = await addBillReportAction(reportData);

    setIsSubmitting(false);

    if (result.success) {
      toast({ title: "Success", description: "Bill report has been saved." });
      onSave();
    } else {
       toast({ title: "Error", description: result.error || "Failed to save report.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add/Edit Bill Report</DialogTitle>
          <DialogDescription>
            Enter the details for the bill report.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="vendor">Vendor</Label>
            <Select value={selectedVendor} onValueChange={setSelectedVendor} required>
                <SelectTrigger id="vendor">
                    <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                    {vendors.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
           <div className="space-y-1">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label htmlFor="invoice-id">Invoice ID</Label>
            <Input id="invoice-id" value={invoiceId} onChange={e => setInvoiceId(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="payment">Payment</Label>
            <Input id="payment" type="number" value={payment} onChange={e => setPayment(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="method">Method</Label>
            <Select value={method} onValueChange={setMethod} required>
                <SelectTrigger id="method">
                    <SelectValue placeholder="Select a method" />
                </SelectTrigger>
                <SelectContent>
                    {paymentMethods.map(pm => (
                        <SelectItem key={pm.id} value={pm.name}>{pm.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddEditBillReportDialog;


"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Vendor } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { addVendorAction, updateVendorAction } from '@/app/(app)/vendors/actions';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddEditVendorDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onVendorSaved: () => void;
  vendor?: Vendor | null;
}

const VENDOR_CATEGORIES = ["Printing", "Materials", "Logistics", "Stationery", "Other"];

export function AddEditVendorDialog({ isOpen, onOpenChange, onVendorSaved, vendor }: AddEditVendorDialogProps) {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const { toast } = useToast();

  const isEditMode = !!vendor;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && vendor) {
        setName(vendor.name);
        setContactPerson(vendor.contactPerson);
        setPhone(vendor.phone);
        setAddress(vendor.address);
        setCategory(vendor.category);
        setPhoneError(null);
      } else {
        setName('');
        setContactPerson('');
        setPhone('');
        setAddress('');
        setCategory('');
        setPhoneError(null);
      }
    }
  }, [isOpen, vendor, isEditMode]);

  const validatePhone = (phoneNumber: string) => {
    const phoneRegex = /^0\d{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setPhoneError("Phone must be 11 digits and start with 0.");
    } else {
      setPhoneError(null);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, '');
    if (numericValue.length <= 11) {
      setPhone(numericValue);
      validatePhone(numericValue);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    validatePhone(phone);
    if (phoneError || !name || !contactPerson || !phone || !address || !category) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields correctly.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    const vendorData = { name, contactPerson, phone, address, category };
    
    let result;
    if (isEditMode) {
      result = await updateVendorAction(vendor.id, vendorData);
    } else {
      result = await addVendorAction(vendorData);
    }
    
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: `Vendor ${isEditMode ? 'Updated' : 'Added'}`,
        description: `Vendor "${name}" has been saved.`,
      });
      onVendorSaved();
    } else {
      toast({
        title: "Error",
        description: result.error || "Could not save vendor.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Vendor</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this vendor.' : 'Enter the details for a new vendor.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="space-y-1">
            <Label htmlFor="vendor-name">Vendor Name</Label>
            <Input id="vendor-name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="contact-person">Contact Person</Label>
            <Input id="contact-person" value={contactPerson} onChange={e => setContactPerson(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              required
              className={cn(phoneError && "border-destructive")}
            />
            {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" value={address} onChange={e => setAddress(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="category">Category</Label>
            <Input id="category" value={category} onChange={e => setCategory(e.target.value)} required />
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !!phoneError}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Vendor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DistrictDataEntry, TrackingLink } from "@/types";
import { divisions } from '@/lib/district-data';
import { getOrders } from '@/lib/order-service';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddEditDistrictDataDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDataSaved: () => void;
  entry?: DistrictDataEntry | null;
}

export function AddEditDistrictDataDialog({ isOpen, onOpenChange, onDataSaved, entry }: AddEditDistrictDataDialogProps) {
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedOrder, setSelectedOrder] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<TrackingLink[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!entry;

  useEffect(() => {
    if (isOpen) {
        setIsLoadingOrders(true);
        getOrders()
            .then(orders => setAvailableOrders(orders))
            .catch(() => toast({ title: "Error", description: "Could not load orders.", variant: "destructive" }))
            .finally(() => setIsLoadingOrders(false));

      if (isEditMode && entry) {
        // In a real scenario, you'd find the division/district for the entry's address
        // For now, we'll leave it blank
        setSelectedDivision('');
        setSelectedDistrict('');
        setSelectedOrder(entry.jobId);
      } else {
        setSelectedDivision('');
        setSelectedDistrict('');
        setSelectedOrder('');
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
    // In a real implementation, you would save the data here.
    // For this UI-only change, we'll just simulate a success.
    setIsSubmitting(true);
    setTimeout(() => {
        setIsSubmitting(false);
        onDataSaved();
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} District Data</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this entry.' : 'Select a division, district, and order to add.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="division">Division</Label>
            <Select value={selectedDivision} onValueChange={handleDivisionChange} required>
              <SelectTrigger id="division"><SelectValue placeholder="Select a division" /></SelectTrigger>
              <SelectContent>
                {divisions.map(div => <SelectItem key={div.division} value={div.division}>{div.division}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="district">District</Label>
            <Select value={selectedDistrict} onValueChange={setSelectedDistrict} required disabled={!selectedDivision}>
              <SelectTrigger id="district"><SelectValue placeholder="Select a district" /></SelectTrigger>
              <SelectContent>
                {districtOptions.map(dist => <SelectItem key={dist.name} value={dist.name}>{dist.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="order">Order</Label>
            <Select value={selectedOrder} onValueChange={setSelectedOrder} required disabled={isLoadingOrders}>
              <SelectTrigger id="order">
                  <SelectValue placeholder={isLoadingOrders ? "Loading orders..." : "Select an order"} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingOrders ? <div className="p-2 text-center text-sm">Loading...</div> : 
                  availableOrders.map(order => 
                    <SelectItem key={order.id} value={order.id}>
                        {order.id} - {order.companyName}
                    </SelectItem>)
                }
              </SelectContent>
            </Select>
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

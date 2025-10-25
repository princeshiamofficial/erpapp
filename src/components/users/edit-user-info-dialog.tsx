

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
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
import type { User, VendorCategory } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { updateUserInfoAction } from '@/app/(app)/users/actions';
import { Edit3 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface EditUserInfoDialogProps {
  user: User;
  onUserInfoUpdated: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  availableCategories?: VendorCategory[];
}

export function EditUserInfoDialog({ user, onUserInfoUpdated, isOpen, onOpenChange, availableCategories = [] }: EditUserInfoDialogProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [companyName, setCompanyName] = useState(user.companyName || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [address, setAddress] = useState(user.address || ''); // New state for address
  const [category, setCategory] = useState(user.category || '');
  const [isLeader, setIsLeader] = useState(user.isLeader || false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const isVendor = user.role === 'VENDOR';
  const isCrm = user.role === 'CRM';

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name);
      setEmail(user.email);
      setCompanyName(user.companyName || '');
      setPhone(user.phone || '');
      setAddress(user.address || ''); // Set address state
      setCategory(user.category || '');
      setIsLeader(user.isLeader || false);
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and Email are required.",
        variant: "destructive",
      });
      return;
    }
    
    if (isVendor) {
        if (!companyName.trim()) {
            toast({ title: "Validation Error", description: "Business Name is required for vendors.", variant: "destructive" });
            return;
        }
        if (!phone.trim() || !/^0\d{10}$/.test(phone.trim())) {
            toast({ title: "Validation Error", description: "A valid 11-digit phone number is required for vendors.", variant: "destructive" });
            return;
        }
        if (!address.trim()) {
            toast({ title: "Validation Error", description: "Address is required for vendors.", variant: "destructive" });
            return;
        }
        if (!category || category === 'none') {
             toast({ title: "Validation Error", description: "Category is required for vendors.", variant: "destructive" });
            return;
        }
    }

    setIsLoading(true);
    const updates: Partial<Pick<User, 'name' | 'email' | 'companyName' | 'phone' | 'address' | 'category' | 'isLeader'>> = {
      name: name.trim(),
      email: email.trim(),
      companyName: companyName.trim() || null,
      isLeader: isCrm ? isLeader : undefined,
    };
    
    if (isVendor) {
        updates.phone = phone.trim() || null;
        updates.address = address.trim() || null;
        updates.category = category === 'none' ? null : category.trim() || null;
    }

    const result = await updateUserInfoAction(user.id, updates);
    setIsLoading(false);

    if (result.success) {
      onUserInfoUpdated();
    } else {
      toast({
        title: "Update Failed",
        description: result.error || "Could not update user information. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit3 className="mr-2 h-5 w-5 text-primary" /> Edit User Information
          </DialogTitle>
          <DialogDescription>
            Update details for {user?.name} ({user?.email}).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-1">
              <Label htmlFor="userName-edit">Name</Label>
              <Input
                id="userName-edit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="userEmail-edit">Email</Label>
              <Input
                id="userEmail-edit"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="userCompany-edit">{isVendor ? 'Business Name' : 'Company Name (Optional)'}</Label>
              <Input
                id="userCompany-edit"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={isLoading}
                required={isVendor}
              />
            </div>

            {isCrm && (
              <div className="flex items-center justify-between space-x-2 rounded-lg border p-3 shadow-sm bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="leader-switch-edit">Team Leader Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable if this CRM user is a team leader.
                  </p>
                </div>
                <Switch
                  id="leader-switch-edit"
                  checked={isLeader}
                  onCheckedChange={setIsLeader}
                  disabled={isLoading}
                />
              </div>
            )}
            
            {isVendor && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="userPhone-edit">Phone</Label>
                  <Input
                    id="userPhone-edit"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading}
                    required={isVendor}
                    pattern="^0\d{10}$"
                    title="Phone number must be 11 digits and start with 0."
                  />
                </div>
                <div className="space-y-1">
                   <Label htmlFor="userAddress-edit">Address</Label>
                   <Textarea
                     id="userAddress-edit"
                     value={address}
                     onChange={(e) => setAddress(e.target.value)}
                     disabled={isLoading}
                     required={isVendor}
                     placeholder="Enter vendor's full address"
                   />
                 </div>
                <div className="space-y-1">
                  <Label htmlFor="userCategory-edit">Category</Label>
                   <Select value={category || 'none'} onValueChange={setCategory} disabled={isLoading} required={isVendor}>
                    <SelectTrigger id="userCategory-edit">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a category</SelectItem>
                      {availableCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}



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
import { updateEmployeeAction } from '@/app/(app)/payroll/actions';
import { Loader2 } from 'lucide-react';
import type { Employee } from '@/types';
import { format } from 'date-fns';

interface EditEmployeeDialogProps {
  employee: Employee;
  onEmployeeUpdated: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEmployeeDialog({ employee, onEmployeeUpdated, isOpen, onOpenChange }: EditEmployeeDialogProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mobileNo, setMobileNo] = useState('');
    const [dob, setDob] = useState('');
    const [designation, setDesignation] = useState('');
    const [salary, setSalary] = useState('');
    const [joiningDate, setJoiningDate] = useState('');
    const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (employee && isOpen) {
            setName(employee.name);
            setEmail(employee.email);
            setMobileNo(employee.mobileNo);
            setDesignation(employee.designation);
            setStatus(employee.status);
            setSalary((employee.salary || '').toString());
            try {
              setDob(format(new Date(employee.dob), 'yyyy-MM-dd'));
              setJoiningDate(format(new Date(employee.joiningDate), 'yyyy-MM-dd'));
            } catch (e) {
              setDob('');
              setJoiningDate('');
            }
        }
    }, [employee, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericSalary = parseFloat(salary);
        if (isNaN(numericSalary) || numericSalary < 0) {
            toast({ title: "Validation Error", description: "Please enter a valid positive salary.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        const updates: Partial<Omit<Employee, 'id' | 'employeeId'>> = {
            name, email, mobileNo, designation, status,
            dob: new Date(dob).toISOString(),
            joiningDate: new Date(joiningDate).toISOString(),
            salary: numericSalary,
        };

        const result = await updateEmployeeAction(employee.id, updates);
        setIsSubmitting(false);

        if (result.success) {
            toast({ title: "Employee Updated", description: `${name}'s details have been updated.` });
            onEmployeeUpdated();
            onOpenChange(false);
        } else {
            toast({ title: "Error", description: result.error || "Failed to update employee.", variant: "destructive" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Employee: {employee.name}</DialogTitle>
                    <DialogDescription>Update the details for this employee.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="space-y-1">
                        <Label htmlFor="edit-name">Name</Label>
                        <Input id="edit-name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="edit-email">Email</Label>
                        <Input id="edit-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="edit-mobileNo">Mobile No</Label>
                        <Input
                          id="edit-mobileNo"
                          type="tel"
                          value={mobileNo}
                          onChange={(e) => {
                            const numericValue = e.target.value.replace(/[^0-9]/g, '');
                            if (numericValue.length <= 11) {
                              setMobileNo(numericValue);
                            }
                          }}
                          required
                          pattern="0\d{10}"
                          maxLength={11}
                          title="Phone number must be an 11-digit number starting with 0."
                          placeholder="01xxxxxxxxx"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="edit-designation">Designation</Label>
                        <Input id="edit-designation" value={designation} onChange={e => setDesignation(e.target.value)} required />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="edit-salary">Salary (BDT)</Label>
                        <Input id="edit-salary" type="number" value={salary} onChange={e => setSalary(e.target.value)} required placeholder="e.g., 50000" min="0" />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="edit-dob">Date of Birth</Label>
                            <Input id="edit-dob" type="date" value={dob} onChange={e => setDob(e.target.value)} required />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="edit-joiningDate">Joining Date</Label>
                            <Input id="edit-joiningDate" type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} required />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="edit-status">Status</Label>
                        <Select value={status} onValueChange={(v) => setStatus(v as 'Active' | 'Inactive')}>
                          <SelectTrigger id="edit-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter className="pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

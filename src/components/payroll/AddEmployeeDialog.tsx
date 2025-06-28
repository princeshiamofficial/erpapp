
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { addEmployeeAction } from '@/app/(app)/payroll/actions';
import { Loader2 } from 'lucide-react';
import type { Employee } from '@/types';

interface AddEmployeeDialogProps {
  onEmployeeAdded: () => void;
  children: React.ReactNode;
}

export function AddEmployeeDialog({ onEmployeeAdded, children }: AddEmployeeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [dob, setDob] = useState('');
  const [designation, setDesignation] = useState('');
  const [salary, setSalary] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !mobileNo || !dob || !designation || !joiningDate || !salary) {
      toast({ title: "Validation Error", description: "All fields are required.", variant: "destructive" });
      return;
    }
     const numericSalary = parseFloat(salary);
    if (isNaN(numericSalary) || numericSalary < 0) {
      toast({ title: "Validation Error", description: "Please enter a valid salary.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const newEmployeeData: Omit<Employee, 'id' | 'employeeId'> = {
      name, email, mobileNo,
      dob: new Date(dob).toISOString(),
      designation,
      salary: numericSalary,
      joiningDate: new Date(joiningDate).toISOString(),
      status: 'Active'
    };
    
    const result = await addEmployeeAction(newEmployeeData);
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: "Employee Added", description: `${name} has been added to the employee list.` });
      onEmployeeAdded();
      setIsOpen(false);
    } else {
      toast({ title: "Error", description: result.error || "Failed to add employee.", variant: "destructive" });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>Enter the details for the new employee.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mobileNo">Mobile No</Label>
            <Input id="mobileNo" value={mobileNo} onChange={e => setMobileNo(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="designation">Designation</Label>
            <Input id="designation" value={designation} onChange={e => setDesignation(e.target.value)} required />
          </div>
           <div className="space-y-1">
            <Label htmlFor="salary">Salary (BDT)</Label>
            <Input id="salary" type="number" value={salary} onChange={e => setSalary(e.target.value)} required placeholder="e.g., 50000" min="0" />
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" type="date" value={dob} onChange={e => setDob(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="joiningDate">Joining Date</Label>
                <Input id="joiningDate" type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} required />
              </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : "Add Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

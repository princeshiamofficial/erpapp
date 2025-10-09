
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { Loader2, ChevronsUpDown, Check } from 'lucide-react';
import type { Employee, User } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';


interface AddEmployeeDialogProps {
  onEmployeeAdded: () => void;
  children: React.ReactNode;
  allUsers: User[];
}

export function AddEmployeeDialog({ onEmployeeAdded, children, allUsers }: AddEmployeeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [dob, setDob] = useState('');
  const [designation, setDesignation] = useState('');
  const [salary, setSalary] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
        setSelectedUserId(null);
        setName('');
        setEmail('');
        setNationalId('');
        setAccountNo('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedUserId) {
        const selectedUser = allUsers.find(u => u.id === selectedUserId);
        if (selectedUser) {
            setName(selectedUser.name);
            setEmail(selectedUser.email || '');
        }
    } else {
        setName('');
        setEmail('');
    }
  }, [selectedUserId, allUsers]);

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
      userId: selectedUserId,
      name, email, mobileNo,
      dob: new Date(dob).toISOString(),
      designation,
      salary: numericSalary,
      joiningDate: new Date(joiningDate).toISOString(),
      status: 'Active',
      nationalId: nationalId || undefined,
      accountNo: accountNo || undefined,
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
  
  const filteredUsersForDropdown = useMemo(() => {
    if (!userSearchQuery) return allUsers;
    return allUsers.filter(user =>
      user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(userSearchQuery.toLowerCase()))
    );
  }, [allUsers, userSearchQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>Select an existing user or fill in the details manually.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
           <div className="space-y-1">
             <Label htmlFor="select-user">Select Existing User (Optional)</Label>
             <Popover open={isUserPopoverOpen} onOpenChange={setIsUserPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isUserPopoverOpen}
                  className="w-full justify-between"
                  disabled={isSubmitting}
                >
                  <span className="truncate">{selectedUserId ? allUsers.find(u => u.id === selectedUserId)?.name : "Select a user..."}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                 <Command filter={() => 1}>
                    <CommandInput placeholder="Search user..." value={userSearchQuery} onValueChange={setUserSearchQuery} />
                    <CommandList>
                        <CommandEmpty>No users available.</CommandEmpty>
                        <CommandGroup>
                            {filteredUsersForDropdown.map(user => (
                                <CommandItem
                                    key={user.id}
                                    value={user.id}
                                    onSelect={(currentValue) => {
                                        setSelectedUserId(currentValue === selectedUserId ? null : currentValue);
                                        setIsUserPopoverOpen(false);
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", selectedUserId === user.id ? "opacity-100" : "opacity-0")} />
                                    {user.name} ({user.email})
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                 </Command>
              </PopoverContent>
             </Popover>
           </div>

          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required disabled={!!selectedUserId || isSubmitting} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!selectedUserId || isSubmitting} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mobileNo">Mobile No</Label>
            <Input
              id="mobileNo"
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
              disabled={isSubmitting}
            />
          </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="nationalId">ID No.</Label>
                <Input id="nationalId" value={nationalId} onChange={e => setNationalId(e.target.value)} disabled={isSubmitting} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="accountNo">Accounts No.</Label>
                <Input id="accountNo" value={accountNo} onChange={e => setAccountNo(e.target.value)} disabled={isSubmitting} />
              </div>
            </div>
          <div className="space-y-1">
            <Label htmlFor="designation">Designation</Label>
            <Input id="designation" value={designation} onChange={e => setDesignation(e.target.value)} required disabled={isSubmitting} />
          </div>
           <div className="space-y-1">
            <Label htmlFor="salary">Salary (BDT)</Label>
            <Input id="salary" type="number" value={salary} onChange={e => setSalary(e.target.value)} required placeholder="e.g., 50000" min="0" disabled={isSubmitting} />
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" type="date" value={dob} onChange={e => setDob(e.target.value)} required disabled={isSubmitting} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="joiningDate">Joining Date</Label>
                <Input id="joiningDate" type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} required disabled={isSubmitting} />
              </div>
          </div>
          <DialogFooter className="pt-4 border-t border-border/30">
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

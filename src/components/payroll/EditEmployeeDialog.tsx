

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
import { Loader2, User, Briefcase, Landmark, CalendarDays } from 'lucide-react';
import type { Employee } from '@/types';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const WEEKEND_OPTIONS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

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
    const [nationalId, setNationalId] = useState('');
    const [accountNo, setAccountNo] = useState('');
    const [providentFundStatus, setProvidentFundStatus] = useState<'Active' | 'Inactive'>('Active');
    const [weekendDays, setWeekendDays] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleWeekendDay = (day: string) =>
        setWeekendDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    const { toast } = useToast();

    useEffect(() => {
        if (employee && isOpen) {
            setName(employee.name);
            setEmail(employee.email || '');
            setMobileNo(employee.mobileNo);
            setDesignation(employee.designation);
            setStatus(employee.status);
            setSalary((employee.salary || '').toString());
            setNationalId(employee.nationalId || '');
            setAccountNo(employee.accountNo || '');
            setProvidentFundStatus(employee.providentFundStatus || 'Active');
            setWeekendDays(employee.weekendDays || []);
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
            nationalId: nationalId || undefined,
            accountNo: accountNo || undefined,
            providentFundStatus: providentFundStatus,
            weekendDays: weekendDays.length ? WEEKEND_OPTIONS.filter(d => weekendDays.includes(d)) : null,
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
            <DialogContent className="sm:max-w-3xl p-0 sm:p-0 gap-0 sm:gap-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 pr-12 sm:pr-12 border-b">
                    <DialogTitle>Edit Employee: {employee.name}</DialogTitle>
                    <DialogDescription>Update the details for this employee.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="max-h-[65vh] overflow-y-auto px-6 py-5 space-y-6">
                        <FormSection icon={User} title="Personal information">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <Label htmlFor="edit-dob">Date of Birth</Label>
                                    <Input id="edit-dob" type="date" value={dob} onChange={e => setDob(e.target.value)} required />
                                </div>
                            </div>
                        </FormSection>

                        <FormSection icon={Briefcase} title="Job and salary">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="edit-designation">Designation</Label>
                                    <Input id="edit-designation" value={designation} onChange={e => setDesignation(e.target.value)} required />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="edit-joiningDate">Joining Date</Label>
                                    <Input id="edit-joiningDate" type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} required />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="edit-salary">Salary (BDT)</Label>
                                    <Input id="edit-salary" type="number" value={salary} onChange={e => setSalary(e.target.value)} required placeholder="e.g., 50000" min="0" />
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
                                <div className="space-y-1 md:col-span-2">
                                    <Label htmlFor="pf-status-edit">Provident Fund</Label>
                                    <div className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3">
                                        <span className="text-sm text-muted-foreground">
                                            {providentFundStatus === 'Active' ? '7% deducted from salary' : 'Not deducted'}
                                        </span>
                                        <Switch
                                            id="pf-status-edit"
                                            checked={providentFundStatus === 'Active'}
                                            onCheckedChange={(checked) => setProvidentFundStatus(checked ? 'Active' : 'Inactive')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </FormSection>

                        <FormSection icon={Landmark} title="Identity and bank">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="edit-nationalId">ID No.</Label>
                                    <Input id="edit-nationalId" value={nationalId} onChange={e => setNationalId(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="edit-accountNo">Accounts No.</Label>
                                    <Input id="edit-accountNo" value={accountNo} onChange={e => setAccountNo(e.target.value)} />
                                </div>
                            </div>
                        </FormSection>

                        <FormSection icon={CalendarDays} title="Weekend">
                            <div className="flex flex-wrap justify-center gap-2">
                                {WEEKEND_OPTIONS.map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        aria-pressed={weekendDays.includes(day)}
                                        onClick={() => toggleWeekendDay(day)}
                                        className={cn(
                                            "min-w-[3.5rem] rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                                            weekendDays.includes(day)
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-input bg-background text-muted-foreground hover:bg-muted"
                                        )}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-2 text-center text-xs text-muted-foreground">
                                {weekendDays.length ? "This employee's own weekend, used in payroll." : "None selected: company weekend applies."}
                            </p>
                        </FormSection>
                    </div>
                    <DialogFooter className="px-6 py-4 border-t bg-muted/30">
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

function FormSection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon className="h-4 w-4 text-primary" />
                {title}
            </h3>
            {children}
        </section>
    );
}

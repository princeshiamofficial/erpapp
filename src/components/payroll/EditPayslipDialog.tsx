
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Employee, Payslip } from '@/types';
import { getDaysInMonth } from 'date-fns';
import { updatePayslipAction } from '@/app/(app)/payroll/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


// Moved formatCurrency here to avoid import issues
const formatCurrency = (value?: number | null): string => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

interface EditPayslipDialogProps {
  employee: Employee;
  onSave: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date; // Added prop
  existingPayslip: Payslip | undefined;
}

export function EditPayslipDialog({ employee, onSave, isOpen, onOpenChange, selectedDate, existingPayslip }: EditPayslipDialogProps) {
  const [present, setPresent] = useState('30');
  const [absent, setAbsent] = useState('0');
  const [late, setLate] = useState('0');
  const [fine, setFine] = useState('0');
  const [incentive, setIncentive] = useState('0');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid'>('Unpaid');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const monthYearId = useMemo(() => {
    return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedDate]);

  useEffect(() => {
    if (isOpen) {
      const payslipData = existingPayslip;
      setPresent(payslipData?.presentDays.toString() || '30');
      setAbsent(payslipData?.absentDays.toString() || '0');
      setLate(payslipData?.lateDays.toString() || '0');
      setFine(payslipData?.fine.toString() || '0');
      setIncentive(payslipData?.incentive.toString() || '0');
      setPaymentStatus(payslipData?.paymentStatus || 'Unpaid');
      setIsSubmitting(false);
    }
  }, [isOpen, employee, monthYearId, existingPayslip]);

  const providentFund = useMemo(() => {
    return (employee.salary || 0) * 0.07;
  }, [employee.salary]);

  const payableAmount = useMemo(() => {
    const baseSalary = employee.salary || 0;
    const incentiveNum = parseFloat(incentive) || 0;
    const fineNum = parseFloat(fine) || 0;
    
    // New calculation logic based on days
    const perDaySalary = baseSalary / 30;
    const presentDays = parseInt(present, 10) || 0;
    const lateDays = parseInt(late, 10) || 0;

    const lateDeduction = Math.floor(lateDays / 3) * perDaySalary;

    return (perDaySalary * presentDays) + incentiveNum - fineNum - providentFund - lateDeduction;
  }, [employee.salary, incentive, fine, providentFund, present, late, selectedDate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payslipData: Omit<Payslip, 'id' | 'updatedAt' | 'employeeId'> = {
        presentDays: parseInt(present, 10),
        absentDays: parseInt(absent, 10),
        lateDays: parseInt(late, 10),
        fine: parseFloat(fine),
        incentive: parseFloat(incentive),
        payableAmount: payableAmount,
        paymentStatus: paymentStatus,
    };

    const docId = `${monthYearId}-${employee.id}`;

    const result = await updatePayslipAction(docId, payslipData);
    setIsSubmitting(false);

    if (result.success) {
        toast({ title: "Payslip Updated", description: "Payslip details have been saved successfully." });
        onSave(); // This will trigger a re-fetch in the parent
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Payslip for {employee.name}</DialogTitle>
          <DialogDescription>
            Adjust the payroll details for this employee for the current period.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="present-days">Present</Label>
                    <Input id="present-days" type="number" value={present} onChange={e => setPresent(e.target.value)} required />
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="absent-days">Absent</Label>
                    <Input id="absent-days" type="number" value={absent} onChange={e => setAbsent(e.target.value)} required />
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="late-days">Late</Label>
                    <Input id="late-days" type="number" value={late} onChange={e => setLate(e.target.value)} required />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                 <div className="space-y-1">
                    <Label htmlFor="provident-fund">Provident Fund (7%)</Label>
                    <Input id="provident-fund" type="text" value={formatCurrency(providentFund)} readOnly disabled className="bg-muted/50" />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="fine">Fine</Label>
                    <Input id="fine" type="number" value={fine} onChange={e => setFine(e.target.value)} required />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="incentive">Incentive</Label>
                    <Input id="incentive" type="number" value={incentive} onChange={e => setIncentive(e.target.value)} required />
                </div>
            </div>
             <div className="space-y-1">
              <Label htmlFor="payment-status">Payment Status</Label>
              <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as 'Paid' | 'Unpaid')}>
                <SelectTrigger id="payment-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Payable Amount:</span>
                    <span>{formatCurrency(payableAmount)}</span>
                </div>
            </div>

            <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

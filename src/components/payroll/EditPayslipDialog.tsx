
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
import { getDaysInMonth, getDay, isSameMonth, isSameYear } from 'date-fns';
import { updatePayslipAction } from '@/app/(app)/payroll/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


// Moved formatCurrency here to avoid import issues
const formatCurrency = (value?: number | null): string => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

interface EditPayslipDialogProps {
  employee: Employee & { presentDays?: number; absentDays?: number; lateDays?: number; fine?: number; };
  onSave: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date; // Added prop
  weekendDays?: string[]; // Added prop
  existingPayslip?: Payslip;
}

const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function EditPayslipDialog({ employee, onSave, isOpen, onOpenChange, selectedDate, weekendDays = [], existingPayslip }: EditPayslipDialogProps) {
  const [present, setPresent] = useState('30');
  const [absent, setAbsent] = useState('0');
  const [late, setLate] = useState('0');
  const [fine, setFine] = useState('0');
  const [incentive, setIncentive] = useState('0');
  const [trainingFee, setTrainingFee] = useState('0');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid'>('Unpaid');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const monthYearId = useMemo(() => {
    return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedDate]);
  
  const totalWorkingDays = useMemo(() => {
      if (!weekendDays) return 30; // Fallback
      const daysInMonth = getDaysInMonth(selectedDate);
      const weekendDayIndexes = weekendDays.map(day => WEEK_DAYS.indexOf(day));
      let workingDays = 0;
      for (let i = 1; i <= daysInMonth; i++) {
          const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);
          if (!weekendDayIndexes.includes(getDay(currentDate))) {
              workingDays++;
          }
      }
      return workingDays;
  }, [selectedDate, weekendDays]);

  const perDaySalaryForFine = useMemo(() => {
    const baseSalary = employee.salary || 0;
    return baseSalary / 30; // Always divide by 30 for fine calculation
  }, [employee.salary]);

  const perDaySalaryForAbsence = useMemo(() => {
      const baseSalary = employee.salary || 0;
      return totalWorkingDays > 0 ? baseSalary / totalWorkingDays : 0;
  }, [employee.salary, totalWorkingDays]);
  
  const isNewEmployee = useMemo(() => {
    if (!employee?.joiningDate) return false;
    const joiningDate = new Date(employee.joiningDate);
    return isSameMonth(joiningDate, selectedDate) && isSameYear(joiningDate, selectedDate);
  }, [employee.joiningDate, selectedDate]);

  useEffect(() => {
    if (isOpen) {
      // Prioritize existing payslip data from the database if it exists
      if (existingPayslip) {
        setPresent(existingPayslip.presentDays.toString());
        setAbsent(existingPayslip.absentDays.toString());
        setLate(existingPayslip.lateDays.toString());
        setFine(existingPayslip.fine.toString());
        setIncentive(existingPayslip.incentive.toString());
        setTrainingFee(existingPayslip.trainingFee?.toString() || '0');
        setPaymentStatus(existingPayslip.paymentStatus);
      } else {
        // If no payslip, use calculated data for initialization
        const initialPresent = employee.presentDays?.toString() || totalWorkingDays.toString();
        const initialLate = employee.lateDays?.toString() || '0';
        const initialAbsent = employee.absentDays?.toString() || '0';
        
        setPresent(initialPresent);
        setAbsent(initialAbsent);
        setLate(initialLate);
        
        // Calculate initial fine based on late days
        const calculatedFine = Math.floor(parseInt(initialLate, 10) / 3) * perDaySalaryForFine;
        setFine(calculatedFine.toFixed(2));
        
        setIncentive('0');
        setTrainingFee('0');
        setPaymentStatus('Unpaid');
      }
      setIsSubmitting(false);
    }
  }, [isOpen, employee, existingPayslip, totalWorkingDays, perDaySalaryForFine]);

  useEffect(() => {
    const lateDaysNum = parseInt(late, 10);
    if (!isNaN(lateDaysNum) && lateDaysNum >= 0) {
      const calculatedFine = Math.floor(lateDaysNum / 3) * perDaySalaryForFine;
      setFine(calculatedFine.toFixed(2));
    }
  }, [late, perDaySalaryForFine]);

  const providentFund = useMemo(() => {
    return (employee.salary || 0) * 0.07;
  }, [employee.salary]);

  const payableAmount = useMemo(() => {
    const incentiveNum = parseFloat(incentive) || 0;
    const fineNum = parseFloat(fine) || 0;
    const presentDays = parseInt(present, 10) || 0;
    const trainingFeeNum = isNewEmployee ? (parseFloat(trainingFee) || 0) : 0;
    
    const salaryForDaysWorked = perDaySalaryForAbsence * presentDays;
    
    return (salaryForDaysWorked) + incentiveNum - fineNum - providentFund - trainingFeeNum;
  }, [incentive, fine, providentFund, present, perDaySalaryForAbsence, trainingFee, isNewEmployee]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payslipData: Omit<Payslip, 'id' | 'updatedAt' | 'employeeId'> = {
        presentDays: parseInt(present, 10),
        absentDays: parseInt(absent, 10),
        lateDays: parseInt(late, 10),
        fine: parseFloat(fine),
        incentive: parseFloat(incentive),
        trainingFee: isNewEmployee ? parseFloat(trainingFee) : undefined, // Only save if new employee
        payableAmount: payableAmount,
        paymentStatus: paymentStatus,
    };

    const docId = `${monthYearId}-${employee.employeeId}`;

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
             <div className="grid grid-cols-2 gap-4">
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
              {isNewEmployee && (
                <div className="space-y-1">
                    <Label htmlFor="training-fee">Training Fee</Label>
                    <Input id="training-fee" type="number" value={trainingFee} onChange={e => setTrainingFee(e.target.value)} placeholder="Enter training fee" />
                </div>
              )}
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

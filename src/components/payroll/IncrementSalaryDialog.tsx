
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
import { Loader2, TrendingUp } from 'lucide-react';
import type { Employee } from '@/types';
import { incrementEmployeeSalaryAction } from '@/app/(app)/payroll/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';


const formatCurrency = (value?: number | null): string => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

interface IncrementSalaryDialogProps {
  employee: Employee;
  onSalaryIncremented: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IncrementSalaryDialog({ employee, onSalaryIncremented, isOpen, onOpenChange }: IncrementSalaryDialogProps) {
    const [incrementAmount, setIncrementAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    
    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth()));
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));


    const currentSalary = employee.salary || 0;
    const increment = parseFloat(incrementAmount) || 0;
    const newSalary = currentSalary + increment;
    
    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear - 5; i <= currentYear + 1; i++) {
            years.push(i);
        }
        return years.reverse();
    }, []);

    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
        value: i.toString(),
        label: format(new Date(0, i), 'MMMM'),
    })), []);


    useEffect(() => {
        if (!isOpen) {
            setIncrementAmount('');
            setSelectedMonth(String(new Date().getMonth()));
            setSelectedYear(String(new Date().getFullYear()));
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (increment <= 0) {
            toast({ title: "Invalid Amount", description: "Increment amount must be a positive number.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        const incrementDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 1).toISOString();
        const result = await incrementEmployeeSalaryAction(employee.id, increment, incrementDate);
        setIsSubmitting(false);

        if (result.success) {
            toast({ title: "Salary Incremented", description: `${employee.name}'s salary has been updated to ${formatCurrency(newSalary)}.` });
            onSalaryIncremented();
            onOpenChange(false);
        } else {
            toast({ title: "Error", description: result.error || "Failed to increment salary.", variant: "destructive" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                        Increment Salary for {employee.name}
                    </DialogTitle>
                    <DialogDescription>
                        Enter the amount and select the month for the salary increase.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="py-4 space-y-4">
                    <div className="space-y-1">
                        <Label>Current Salary</Label>
                        <Input value={formatCurrency(currentSalary)} readOnly disabled className="bg-muted/50" />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="increment-month">Increment Month</Label>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                              <SelectTrigger id="increment-month"><SelectValue placeholder="Select Month" /></SelectTrigger>
                              <SelectContent>
                                  {months.map(month => (
                                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="increment-year">Increment Year</Label>
                             <Select value={selectedYear} onValueChange={setSelectedYear}>
                              <SelectTrigger id="increment-year"><SelectValue placeholder="Select Year" /></SelectTrigger>
                              <SelectContent>
                                  {availableYears.map(year => (
                                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="increment-amount">Increment Amount (BDT)</Label>
                        <Input
                            id="increment-amount"
                            type="number"
                            value={incrementAmount}
                            onChange={(e) => setIncrementAmount(e.target.value)}
                            required
                            placeholder="e.g., 5000"
                            min="1"
                        />
                    </div>
                     <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between items-center text-lg font-semibold">
                            <span>New Salary:</span>
                            <span>{formatCurrency(newSalary)}</span>
                        </div>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting || increment <= 0}>
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Applying...</> : "Apply Increment"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


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
import { Loader2, Wallet, Calendar as CalendarIcon, Percent, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Employee, Payslip, ProvidentFundRecord } from '@/types';
import { bulkUpdateProvidentFundAction } from '@/app/(app)/payroll/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, differenceInMonths, addMonths, startOfMonth, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const formatCurrency = (value?: number | null): string => {
    if (value === undefined || value === null) return '0';
    return new Intl.NumberFormat('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

interface EditPFDialogProps {
    employee: Employee;
    onSave: () => void;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    selectedDate: Date;
    existingPayslip?: Payslip;
    pfRecords: ProvidentFundRecord[];
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

export function EditPFDialog({ employee, onSave, isOpen, onOpenChange, selectedDate, existingPayslip, pfRecords }: EditPFDialogProps) {
    const [startMonth, setStartMonth] = useState(selectedDate.getMonth());
    const [startYear, setStartYear] = useState(selectedDate.getFullYear());
    const [endMonth, setEndMonth] = useState(selectedDate.getMonth());
    const [endYear, setEndYear] = useState(selectedDate.getFullYear());
    const [sharePercent, setSharePercent] = useState('10');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setStartMonth(selectedDate.getMonth());
            setStartYear(selectedDate.getFullYear());
            setEndMonth(selectedDate.getMonth());
            setEndYear(selectedDate.getFullYear());
        }
    }, [isOpen, selectedDate]);

    const selectedRange = useMemo(() => {
        const start = new Date(startYear, startMonth, 1);
        const end = new Date(endYear, endMonth, 1);

        if (start > end) return [];

        const months = [];
        let current = start;
        while (current <= end) {
            const monthStr = format(current, 'yyyy-MM');
            const existingRecord = pfRecords.find(r => r.employeeId === employee.employeeId && r.month === monthStr);

            // The existing record amount is the 7% deduction from salary
            const pfDeduction = existingRecord?.amount || 0;
            // Profit Share is now calculated based on the PF Deduction, not base salary
            const profitShare = pfDeduction * (parseFloat(sharePercent) || 0) / 100;

            months.push({
                date: new Date(current),
                monthStr,
                isPaid: existingRecord?.status === 'Paid',
                pfDeduction,
                profitShare,
                amount: pfDeduction + profitShare
            });
            current = addMonths(current, 1);
        }
        return months;
    }, [startMonth, startYear, endMonth, endYear, employee, sharePercent, pfRecords]);

    const totalHistoricalPF = useMemo(() => {
        return pfRecords
            .filter(r => r.employeeId === employee.employeeId && r.status === 'Paid')
            .reduce((sum, r) => sum + (r.amount || 0), 0);
    }, [pfRecords, employee.employeeId]);

    const selectableMonths = useMemo(() => {
        return selectedRange.filter(m => !m.isPaid && m.pfDeduction > 0);
    }, [selectedRange]);

    const totalPF = useMemo(() => {
        return selectableMonths.reduce((sum, m) => sum + m.amount, 0);
    }, [selectableMonths]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectableMonths.length === 0) {
            toast({ title: "No months to update", description: "All months in range are already paid or range is invalid.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const updates = selectableMonths.map(month => ({
                payslipId: `${month.monthStr}-${employee.employeeId}`,
                employeeId: employee.employeeId,
                employeeName: employee.name,
                month: month.monthStr,
                amount: month.amount,
                status: 'Paid' as const
            }));

            const result = await bulkUpdateProvidentFundAction(updates);
            if (result.success) {
                toast({ title: "PF Updated", description: `Successfully updated ${selectableMonths.length} month(s).` });
                onSave();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update some records.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        <DialogTitle>Management Provident Fund</DialogTitle>
                    </div>
                    <DialogDescription>
                        Configure PF range and share percentage for <span className="font-semibold text-gray-900">{employee.name}</span>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Start Month</Label>
                            <div className="flex gap-2">
                                <Select value={startMonth.toString()} onValueChange={v => setStartMonth(parseInt(v))}>
                                    <SelectTrigger className="h-10 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTHS.map((m, i) => <SelectItem key={m} value={i.toString()}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={startYear.toString()} onValueChange={v => setStartYear(parseInt(v))}>
                                    <SelectTrigger className="h-10 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">End Month</Label>
                            <div className="flex gap-2">
                                <Select value={endMonth.toString()} onValueChange={v => setEndMonth(parseInt(v))}>
                                    <SelectTrigger className="h-10 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTHS.map((m, i) => <SelectItem key={m} value={i.toString()}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={endYear.toString()} onValueChange={v => setEndYear(parseInt(v))}>
                                    <SelectTrigger className="h-10 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Profit Share Percentage (%)</Label>
                        <div className="relative">
                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="number"
                                value={sharePercent}
                                onChange={e => setSharePercent(e.target.value)}
                                className="pl-10 h-10 font-mono"
                                placeholder="10"
                            />
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden">
                        <div className="p-3 bg-gray-100/50 border-b border-gray-100 flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Summary</span>
                            <span className="text-[10px] font-medium text-gray-400">{selectableMonths.length} Months to process</span>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Total Accumulated Fund:</span>
                                <span className="font-bold text-gray-900">৳{formatCurrency(totalHistoricalPF)}</span>
                            </div>

                            <Separator className="my-2" />

                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Current PF Deduction (from salary):</span>
                                <span className="font-semibold text-gray-700">৳{formatCurrency(selectableMonths.reduce((sum, m) => sum + m.pfDeduction, 0))}</span>
                            </div>

                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Profit Share ({sharePercent}% of deduction):</span>
                                <span className="font-semibold text-primary">৳{formatCurrency(selectableMonths.reduce((sum, m) => sum + m.profitShare, 0))}</span>
                            </div>

                            <div className="flex justify-between text-xs border-t border-gray-100 pt-3">
                                <span className="text-muted-foreground">Selectable Months (Unpaid):</span>
                                <span className="font-semibold">{selectableMonths.length}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-baseline pt-1">
                                <span className="text-sm font-bold text-gray-700">Total PF to Collect:</span>
                                <div className="text-right">
                                    <span className="text-xl font-black text-primary">৳{formatCurrency(totalPF)}</span>
                                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">BDT</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Selected Months Detail</Label>
                        <div className="grid grid-cols-1 gap-1.5">
                            {selectableMonths.map((m, i) => (
                                <div key={i} className="flex justify-between items-center p-2 rounded-lg border text-xs transition-colors bg-white border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="h-3.5 w-3.5 rounded-full border-2 border-primary/30" />
                                        <span className="font-medium">{format(m.date, 'MMMM yyyy')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-gray-700">৳{formatCurrency(m.pfDeduction)}</span>
                                    </div>
                                </div>
                            ))}
                            {selectedRange.length === 0 && (
                                <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    <AlertCircle className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                                    <p className="text-[10px] text-gray-500 font-medium">Invalid date range selected</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="text-[10px] font-bold uppercase">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || selectableMonths.length === 0} className="text-[10px] font-bold uppercase shadow-lg shadow-primary/20 min-w-[120px]">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Mark {selectableMonths.length} {selectableMonths.length === 1 ? 'Month' : 'Months'} as Paid
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

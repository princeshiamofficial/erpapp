
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
import { Loader2, Minus, Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Barcode from 'react-barcode';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Employee, Payslip } from '@/types';
import { updatePayslipAction } from '@/app/(app)/payroll/actions';
import { calculatePayableAmount, LIVE_ATTENDANCE_FROM } from '@/lib/payroll-days';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const formatCurrency = (value?: number | null): string => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

interface EditPayslipDialogProps {
  employee: Employee & { presentDays?: number; absentDays?: number; lateDays?: number; fine?: number; };
  onSave: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  existingPayslip?: Payslip;
}

const FIXED_WORKING_DAYS = 30;

export function EditPayslipDialog({ employee, onSave, isOpen, onOpenChange, selectedDate, existingPayslip }: EditPayslipDialogProps) {
  const [present, setPresent] = useState('30');
  const [absent, setAbsent] = useState('0');
  const [late, setLate] = useState('0');
  const [fine, setFine] = useState('0');
  const [incentive, setIncentive] = useState('0');
  const [trainingFee, setTrainingFee] = useState('0');
  const [advance, setAdvance] = useState('0');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid'>('Unpaid');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const monthYearId = useMemo(() => {
    return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedDate]);
  const isLiveAttendanceMonth = monthYearId >= LIVE_ATTENDANCE_FROM;

  const perDaySalaryForFine = useMemo(() => {
    const baseSalary = employee.salary || 0;
    return baseSalary / FIXED_WORKING_DAYS;
  }, [employee.salary]);


  const isNewEmployee = useMemo(() => {
    if (!employee?.joiningDate) return false;
    const joiningDate = new Date(employee.joiningDate);
    const selectedMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    return joiningDate >= selectedMonthStart;
  }, [employee.joiningDate, selectedDate]);

  useEffect(() => {
    if (isOpen) {
      if (existingPayslip) {
        // The sheet row already holds live attendance days (or the frozen ones for a paid month).
        setPresent(String(employee.presentDays ?? existingPayslip.presentDays));
        setAbsent(String(employee.absentDays ?? existingPayslip.absentDays));
        setLate(String(employee.lateDays ?? existingPayslip.lateDays));
        setFine(existingPayslip.fine.toString());
        setIncentive(existingPayslip.incentive.toString());
        setTrainingFee(existingPayslip.trainingFee?.toString() || '0');
        setAdvance(existingPayslip.advance?.toString() || '0');
        setPaymentStatus(existingPayslip.paymentStatus);
      } else {
        const initialPresent = employee.presentDays?.toString() || FIXED_WORKING_DAYS.toString();
        const initialLate = employee.lateDays?.toString() || '0';
        const initialAbsent = String(employee.absentDays ?? Math.max(0, FIXED_WORKING_DAYS - parseInt(initialPresent, 10)));

        setPresent(initialPresent);
        setAbsent(initialAbsent);
        setLate(initialLate);

        const calculatedFine = Math.floor(parseInt(initialLate, 10) / 3) * perDaySalaryForFine;
        setFine(calculatedFine.toFixed(2));

        setIncentive(employee.incentive?.toString() || '0');
        setTrainingFee('0');
        setAdvance('0');
        setPaymentStatus('Unpaid');
      }
      setIsSubmitting(false);
    }
  }, [isOpen, employee, existingPayslip, perDaySalaryForFine]);

  useEffect(() => {
    const lateDaysNum = parseInt(late, 10);
    if (!isNaN(lateDaysNum) && lateDaysNum >= 0) {
      const calculatedFine = Math.floor(lateDaysNum / 3) * perDaySalaryForFine;
      setFine(calculatedFine.toFixed(2));
    }
  }, [late, perDaySalaryForFine]);

  const handlePresentChange = (value: string) => {
    const newPresent = parseInt(value, 10);
    if (!isNaN(newPresent)) {
      setPresent(newPresent.toString());
      if (newPresent >= 30) {
        setAbsent('0');
      } else {
        setAbsent((FIXED_WORKING_DAYS - newPresent).toString());
      }
    }
  };

  const handleAbsentChange = (value: string) => {
    const newAbsent = parseInt(value, 10);
    if (!isNaN(newAbsent)) { // Allow negative numbers for absent
      setAbsent(newAbsent.toString());
      const newPresent = FIXED_WORKING_DAYS - newAbsent;
      setPresent(newPresent.toString());
    }
  };

  const providentFund = useMemo(() => {
    if (employee.providentFundStatus === 'Active') {
      return (employee.salary || 0) * 0.07;
    }
    return 0;
  }, [employee.salary, employee.providentFundStatus]);

  const payableAmount = useMemo(() => {
    return calculatePayableAmount(employee.salary || 0, parseInt(present, 10) || 0, providentFund, {
      incentive: parseFloat(incentive) || 0,
      fine: parseFloat(fine) || 0,
      trainingFee: isNewEmployee ? (parseFloat(trainingFee) || 0) : 0,
      advance: parseFloat(advance) || 0,
    });
  }, [incentive, fine, providentFund, present, employee.salary, trainingFee, isNewEmployee, advance]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payslipData: Omit<Payslip, 'id' | 'updatedAt' | 'employeeId'> = {
      presentDays: parseInt(present, 10),
      absentDays: parseInt(absent, 10),
      lateDays: parseInt(late, 10),
      fine: parseFloat(fine),
      incentive: parseFloat(incentive),
      trainingFee: isNewEmployee ? parseFloat(trainingFee) : undefined,
      advance: parseFloat(advance) || 0,
      providentFund: providentFund, // Save calculated PF amount
      payableAmount: payableAmount,
      paymentStatus: paymentStatus,
    };

    const docId = `${monthYearId}-${employee.employeeId}`;

    const result = await updatePayslipAction(docId, payslipData);
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: "Payslip Updated", description: "Payslip details have been saved successfully." });
      onSave();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const salaryForDays = ((employee.salary || 0) / FIXED_WORKING_DAYS) * (parseInt(present, 10) || 0);
  type BreakdownRow = { label: string; value: number; sign: '+' | '−' };
  const breakdown = ([
    { label: `Salary for ${parseInt(present, 10) || 0} days`, value: salaryForDays, sign: '+' },
    { label: 'Incentive', value: parseFloat(incentive) || 0, sign: '+' },
    { label: 'Fine', value: parseFloat(fine) || 0, sign: '−' },
    { label: 'Provident Fund (7%)', value: providentFund, sign: '−' },
    { label: 'Advance', value: parseFloat(advance) || 0, sign: '−' },
    ...(isNewEmployee ? [{ label: 'Training Fee', value: parseFloat(trainingFee) || 0, sign: '−' as const }] : []),
  ] as BreakdownRow[]);
  const initials = employee.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 sm:p-0 gap-0 sm:gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 pr-12 sm:pr-12 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11">
              <AvatarImage src={employee.avatarUrl || undefined} alt={employee.name} />
              <AvatarFallback className="font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-left">
              <DialogTitle className="truncate">Edit Payslip · {employee.name}</DialogTitle>
              <DialogDescription>
                {format(selectedDate, 'MMMM yyyy')} · Salary {formatCurrency(employee.salary || 0)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_17rem] gap-6 md:gap-0">
              <div className="space-y-6 md:pr-6">
                <PayslipSection title="Attendance" hint={isLiveAttendanceMonth ? 'From attendance' : undefined}>
                  {isLiveAttendanceMonth ? (
                    <div className="grid grid-cols-3 gap-3">
                      <StatTile label="Present" value={present} icon={CheckCircle2} tone="emerald" />
                      <StatTile label="Absent" value={absent} icon={XCircle} tone="red" />
                      <StatTile label="Late" value={late} icon={Clock} tone="amber" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="present-days">Present</Label>
                        <div className="flex items-center">
                          <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-r-none" onClick={() => handlePresentChange(String(parseInt(present, 10) - 1))}><Minus className="h-4 w-4" /></Button>
                          <Input id="present-days" type="number" value={present} onChange={e => handlePresentChange(e.target.value)} required className="text-center rounded-none" />
                          <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-l-none" onClick={() => handlePresentChange(String(parseInt(present, 10) + 1))}><Plus className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="absent-days">Absent</Label>
                        <div className="flex items-center">
                          <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-r-none" onClick={() => handleAbsentChange(String(parseInt(absent, 10) - 1))}><Minus className="h-4 w-4" /></Button>
                          <Input id="absent-days" type="number" value={absent} onChange={e => handleAbsentChange(e.target.value)} required className="text-center rounded-none" />
                          <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-l-none" onClick={() => handleAbsentChange(String(parseInt(absent, 10) + 1))}><Plus className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="late-days">Late</Label>
                        <Input id="late-days" type="number" value={late} onChange={e => setLate(e.target.value)} required />
                      </div>
                    </div>
                  )}
                </PayslipSection>

                <PayslipSection title="Adjustments">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="fine">Fine</Label>
                      <Input id="fine" type="number" value={fine} onChange={e => setFine(e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="incentive">Incentive</Label>
                      <Input id="incentive" type="number" value={incentive} onChange={e => setIncentive(e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="advance">Advance</Label>
                      <Input id="advance" type="number" value={advance} onChange={e => setAdvance(e.target.value)} placeholder="Enter advance amount" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="provident-fund">Provident Fund (7%)</Label>
                      <Input id="provident-fund" type="text" value={formatCurrency(providentFund)} readOnly disabled className="bg-muted/50" />
                    </div>
                    {isNewEmployee && (
                      <div className="space-y-1">
                        <Label htmlFor="training-fee">Training Fee</Label>
                        <Input id="training-fee" type="number" value={trainingFee} onChange={e => setTrainingFee(e.target.value)} placeholder="Enter training fee" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label htmlFor="payment-status">Payment Status</Label>
                      <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as 'Paid' | 'Unpaid')}>
                        <SelectTrigger id="payment-status" className="bg-background">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Unpaid">Unpaid</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PayslipSection>
              </div>

              <div className="flex flex-col gap-4 pt-2 md:pt-0 md:pl-6">
                <div className="drop-shadow-md">
                  <div className="rounded-t-lg bg-card px-4 pt-4 pb-3 text-sm">
                    <div className="text-center">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em]">Payslip</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{format(selectedDate, 'MMMM yyyy')}</p>
                    </div>
                    <div className="my-3 border-t border-dashed" />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Base Salary</span>
                      <span className="font-semibold tabular-nums">{formatCurrency(employee.salary || 0)}</span>
                    </div>
                    <div className="my-3 border-t border-dashed" />
                    <dl className="space-y-2">
                      {breakdown.map(row => (
                        <div key={row.label} className="flex items-center justify-between gap-3">
                          <dt className="text-muted-foreground">{row.label}</dt>
                          <dd className={cn(
                            "font-medium tabular-nums",
                            row.sign === '−' && row.value > 0 && "text-red-600 dark:text-red-400",
                            row.sign === '+' && row.value > 0 && row.label === 'Incentive' && "text-emerald-600 dark:text-emerald-400"
                          )}>
                            {row.value > 0 && row.label !== breakdown[0].label ? `${row.sign} ` : ''}{formatCurrency(row.value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <div className="my-3 border-t border-dashed" />
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider">Payable</span>
                      <span className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(payableAmount)}</span>
                    </div>
                    <div className="mt-3 flex justify-center text-foreground">
                      <Barcode
                        value={`${monthYearId}-${employee.nationalId || employee.employeeId}`}
                        format="CODE128"
                        width={1.2}
                        height={36}
                        fontSize={11}
                        margin={0}
                        background="transparent"
                        lineColor="currentColor"
                      />
                    </div>
                  </div>
                  <div
                    aria-hidden="true"
                    className="h-2.5"
                    style={{ background: 'radial-gradient(circle at 5px 100%, transparent 5px, hsl(var(--card)) 5.5px) 0 0 / 10px 10px repeat-x' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
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

function PayslipSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

const TILE_TONES = {
  emerald: "text-emerald-600 dark:text-emerald-400",
  red: "text-red-600 dark:text-red-400",
  amber: "text-amber-600 dark:text-amber-400",
};

function StatTile({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ElementType; tone: keyof typeof TILE_TONES }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 shadow-md dark:bg-card">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Icon className={cn("h-4 w-4", TILE_TONES[tone])} />
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}

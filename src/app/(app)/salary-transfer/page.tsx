
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getEmployees } from '@/lib/employee-service';
import { getSalarySheetForMonth } from '@/app/(app)/payroll/actions';
import type { Employee, Payslip, AttendanceRecord } from '@/types';
import { format, subMonths, getDaysInMonth, getDay, parseISO, isSameMonth, isAfter, startOfMonth } from 'date-fns';
import { Printer, Download } from 'lucide-react';
import Image from 'next/image';
import { getWeekendSettings } from '@/lib/weekend-service';
import { getAttendanceForMonth } from '@/lib/attendance-service';
import Papa from 'papaparse';

const formatCurrency = (value?: number | null): string => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SalaryTransferPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salarySheetData, setSalarySheetData] = useState<Payslip[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [weekendDays, setWeekendDays] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(subMonths(new Date(), 1));

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const monthStr = format(selectedDate, 'yyyy-MM');
      const [fetchedEmployees, fetchedSalarySheet, fetchedAttendance, fetchedWeekendSettings] = await Promise.all([
        getEmployees(),
        getSalarySheetForMonth(monthStr),
        getAttendanceForMonth(selectedDate),
        getWeekendSettings(),
      ]);
      setEmployees(fetchedEmployees);
      setSalarySheetData(fetchedSalarySheet);
      setAttendanceData(fetchedAttendance);
      setWeekendDays(fetchedWeekendSettings.days);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ title: "Error", description: "Could not load data for salary transfer.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const unpaidEmployeesData = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === 'Active');
    const daysInMonth = getDaysInMonth(selectedDate);
    const weekendDayIndexes = (weekendDays || []).map(day => WEEK_DAYS.indexOf(day));
    let totalWorkingDays = 0;
    for (let i = 1; i <= daysInMonth; i++) {
        const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);
        if (!weekendDayIndexes.includes(getDay(currentDate))) {
            totalWorkingDays++;
        }
    }

    return activeEmployees
      .map(employee => {
        const monthYearId = format(selectedDate, 'yyyy-MM');
        const payslip = salarySheetData.find(p => p.employeeId === employee.employeeId && p.id.startsWith(monthYearId));
        
        let payableAmount;

        if (payslip) {
            if (payslip.paymentStatus === 'Unpaid' && payslip.payableAmount > 0) {
                payableAmount = payslip.payableAmount;
            } else {
                return null;
            }
        } else {
            const userAttendanceInRange = attendanceData.filter(att => 
                att.employeeId === employee.userId && isSameMonth(parseISO(att.date), selectedDate)
            );
            
            const presentDays = userAttendanceInRange.length;
            const lateDays = userAttendanceInRange.filter(att => att.status === 'Late').length;
            
            const relevantHistory = (employee.salaryHistory || [])
                .filter(h => !isAfter(startOfMonth(new Date(h.date)), selectedDate))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const effectiveSalary = relevantHistory.length > 0 ? relevantHistory[0].newSalary : employee.salary || 0;
            
            const perDaySalaryForFine = effectiveSalary / 30;
            const automaticFine = Math.floor(lateDays / 3) * perDaySalaryForFine;
            
            const perDaySalaryForAbsence = totalWorkingDays > 0 ? effectiveSalary / totalWorkingDays : 0;
            const salaryForDaysWorked = perDaySalaryForAbsence * presentDays;
            const providentFund = effectiveSalary * 0.07;
            
            payableAmount = salaryForDaysWorked - automaticFine - providentFund;
        }

        if (payableAmount > 0) {
            return {
                ...employee,
                payableAmount,
            };
        }

        return null;
      })
      .filter((e): e is Employee & { payableAmount: number } => e !== null);
  }, [employees, salarySheetData, attendanceData, weekendDays, selectedDate]);

  const totalPayableAmount = useMemo(() => {
    return unpaidEmployeesData.reduce((total, data) => total + (data.payableAmount || 0), 0);
  }, [unpaidEmployeesData]);

  const handlePrint = () => {
    window.print();
  };
  
  const handleExport = () => {
    if (unpaidEmployeesData.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no unpaid salaries to export.",
        variant: "destructive",
      });
      return;
    }
    const dataToExport = unpaidEmployeesData.map((emp, index) => ({
      'Sl. No.': index + 1,
      'ID No.': emp.nationalId || 'N/A',
      'Name of the Employees': emp.name,
      'Designation': emp.designation,
      'Accounts No.': emp.accountNo || 'N/A',
      'Amount': Math.floor(emp.payableAmount),
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `salary_transfer_${format(selectedDate, 'MMM_yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 printable-area bg-transparent p-4 sm:p-6 lg:p-8">
      <div className="flex justify-end gap-2 no-print">
        <Button onClick={handleExport} variant="outline" disabled={isLoading}>
          <Download className="mr-2 h-4 w-4" /> Export as CSV
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
      </div>
      <Card className="print:border-0 print:shadow-none print:bg-transparent">
        <CardHeader className="text-center print:text-black">
          <CardTitle className="text-xl font-bold pt-2">COMPANY NAME: COLOR HUT</CardTitle>
          <CardDescription className="text-red-500 font-semibold">House No. 14, Road No. A, Block A, Sontek Area, South Kajla, Jatrabari, Dhaka - 1236</CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
           <div className="border-y border-gray-300 py-2 my-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-bold">Salary Transfer To Bank</h3>
                <p>Salary Month : <span className="text-red-600 font-semibold">{format(selectedDate, 'MMM-yy')}</span></p>
              </div>
              <div className="px-2 mt-1">
                <p>Bank Name : <span className="text-red-600 font-semibold">UNITED COMM. BANK (A/C 0872101000007053)</span></p>
              </div>
           </div>

           <div className="overflow-x-auto">
            <Table className="w-full border-collapse border border-gray-300">
              <TableHeader>
                <TableRow className="bg-green-200/50 print:bg-green-200">
                  <TableHead className="border border-gray-300 text-black font-semibold p-2">Sl. No.</TableHead>
                  <TableHead className="border border-gray-300 text-black font-semibold p-2">ID No.</TableHead>
                  <TableHead className="border border-gray-300 text-black font-semibold p-2">Name of the Employees</TableHead>
                  <TableHead className="border border-gray-300 text-black font-semibold p-2">Designation</TableHead>
                  <TableHead className="border border-gray-300 text-black font-semibold p-2">Accounts No.</TableHead>
                  <TableHead className="border border-gray-300 text-black font-semibold text-right p-2">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={`skel-row-${i}`} className="h-10">
                      <TableCell className="border border-gray-300 p-2"><Skeleton className="h-4 w-10" /></TableCell>
                      <TableCell className="border border-gray-300 p-2"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="border border-gray-300 p-2"><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell className="border border-gray-300 p-2"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="border border-gray-300 p-2"><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell className="border border-gray-300 text-right p-2"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : unpaidEmployeesData.length > 0 ? (
                  unpaidEmployeesData.map((employee, index) => (
                    <TableRow key={employee.id}>
                      <TableCell className="border border-gray-300 p-2">{index + 1}</TableCell>
                      <TableCell className="border border-gray-300 p-2">{employee.nationalId || 'N/A'}</TableCell>
                      <TableCell className="border border-gray-300 p-2">{employee.name}</TableCell>
                      <TableCell className="border border-gray-300 p-2">{employee.designation}</TableCell>
                      <TableCell className="border border-gray-300 p-2">{employee.accountNo || 'N/A'}</TableCell>
                      <TableCell className="border border-gray-300 text-right p-2">{formatCurrency(employee.payableAmount)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground border border-gray-300 p-2">
                      No unpaid salaries found for this month.
                    </TableCell>
                  </TableRow>
                )}
                 {Array.from({ length: Math.max(0, 10 - unpaidEmployeesData.length) }).map((_, i) => (
                  <TableRow key={`empty-row-${i}`} className="h-10">
                      <TableCell className="border border-gray-300 p-2">&nbsp;</TableCell>
                      <TableCell className="border border-gray-300 p-2"></TableCell>
                      <TableCell className="border border-gray-300 p-2"></TableCell>
                      <TableCell className="border border-gray-300 p-2"></TableCell>
                      <TableCell className="border border-gray-300 p-2"></TableCell>
                      <TableCell className="border border-gray-300 p-2"></TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="font-bold border border-gray-300 text-right p-2">Grand Total:</TableCell>
                  <TableCell className="text-right font-bold border border-gray-300 p-2">{formatCurrency(totalPayableAmount)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            </div>
        </CardContent>
      </Card>
      <style jsx global>{`
        @media print {
          @page {
            margin-top: 1in;
            margin-bottom: 1in;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .printable-area {
            padding: 0 !important;
            margin: 0 !important;
            border: none;
            box-shadow: none;
            background-color: transparent !important;
          }
          .no-print {
            display: none;
          }
          th, td {
            white-space: nowrap;
          }
        }
      `}</style>
    </div>
  );
}

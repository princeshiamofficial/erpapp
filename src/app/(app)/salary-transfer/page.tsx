
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getEmployees } from '@/lib/employee-service';
import { getSalarySheetForMonth } from '@/app/(app)/payroll/actions';
import type { Employee, Payslip } from '@/types';
import { format, subMonths } from 'date-fns';
import { Printer } from 'lucide-react';
import Image from 'next/image';

const formatCurrency = (value?: number | null): string => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

export default function SalaryTransferPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salarySheetData, setSalarySheetData] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(subMonths(new Date(), 1));

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const monthStr = format(selectedDate, 'yyyy-MM');
      const [fetchedEmployees, fetchedSalarySheet] = await Promise.all([
        getEmployees(),
        getSalarySheetForMonth(monthStr),
      ]);
      setEmployees(fetchedEmployees);
      setSalarySheetData(fetchedSalarySheet);
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
    return employees
      .map(employee => {
        const monthYearId = format(selectedDate, 'yyyy-MM');
        const payslip = salarySheetData.find(p => p.employeeId === employee.employeeId && p.id.startsWith(monthYearId));
        // Show employees with an unpaid payslip for the month
        if (payslip && payslip.paymentStatus === 'Unpaid') {
          return {
            ...employee,
            payableAmount: payslip.payableAmount,
          };
        }
        return null;
      })
      .filter((e): e is Employee & { payableAmount: number } => e !== null);
  }, [employees, salarySheetData, selectedDate]);

  const totalPayableAmount = useMemo(() => {
    return unpaidEmployeesData.reduce((total, data) => total + (data.payableAmount || 0), 0);
  }, [unpaidEmployeesData]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 printable-area">
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
                <p>Bank Name : <span className="text-red-600 font-semibold">UNITED COMM. BANK (A/C No)</span></p>
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
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .printable-area {
            padding: 0 !important;
            margin: 0 !important;
            border: none;
            box-shadow: none;
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

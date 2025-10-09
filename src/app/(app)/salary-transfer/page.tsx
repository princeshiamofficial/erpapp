
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getEmployees } from '@/lib/employee-service';
import { getSalarySheetForMonth } from '@/app/(app)/payroll/actions';
import type { Employee, Payslip } from '@/types';
import { format, subMonths } from 'date-fns';
import { Printer } from 'lucide-react';

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
  
  const paidEmployeesData = useMemo(() => {
    return employees
      .map(employee => {
        const monthYearId = format(selectedDate, 'yyyy-MM');
        const payslip = salarySheetData.find(p => p.employeeId === employee.employeeId && p.id.startsWith(monthYearId));
        if (payslip && payslip.paymentStatus === 'Paid') {
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
    return paidEmployeesData.reduce((total, data) => total + (data.payableAmount || 0), 0);
  }, [paidEmployeesData]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 printable-area p-4 sm:p-6 lg:p-8">
      <Card className="shadow-lg print:shadow-none print:border-none print:bg-white">
        <CardHeader className="text-center print:text-black">
          <CardTitle className="text-2xl font-bold text-red-600">Company Name</CardTitle>
          <CardDescription className="text-red-500">Address</CardDescription>
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
                  <TableHead className="border border-gray-300 text-black font-semibold">Sl. No.</TableHead>
                  <TableHead className="border border-gray-300 text-black font-semibold">ID No.</TableHead>
                  <TableHead className="border border-gray-300 text-black font-semibold">Name of the Employees</TableHead>
                  <TableHead className="border border-gray-300 text-black font-semibold">Designation</TableHead>
                  <TableHead className="border border-gray-300 text-black font-semibold">Accounts No.</TableHead>
                  <TableHead className="border border-gray-300 text-black font-semibold text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={`skel-row-${i}`} className="h-10">
                      <TableCell className="border border-gray-300"><Skeleton className="h-4 w-10" /></TableCell>
                      <TableCell className="border border-gray-300"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="border border-gray-300"><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell className="border border-gray-300"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="border border-gray-300"><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell className="border border-gray-300 text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : paidEmployeesData.length > 0 ? (
                  paidEmployeesData.map((employee, index) => (
                    <TableRow key={employee.id}>
                      <TableCell className="border border-gray-300">{index + 1}</TableCell>
                      <TableCell className="border border-gray-300">{employee.employeeId}</TableCell>
                      <TableCell className="border border-gray-300">{employee.name}</TableCell>
                      <TableCell className="border border-gray-300">{employee.designation}</TableCell>
                      <TableCell className="border border-gray-300">{/* Account No. Placeholder */}</TableCell>
                      <TableCell className="border border-gray-300 text-right">{formatCurrency(employee.payableAmount)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground border border-gray-300">
                      No paid salaries found for this month.
                    </TableCell>
                  </TableRow>
                )}
                 {Array.from({ length: Math.max(0, 10 - paidEmployeesData.length) }).map((_, i) => (
                  <TableRow key={`empty-row-${i}`} className="h-10">
                      <TableCell className="border border-gray-300">&nbsp;</TableCell>
                      <TableCell className="border border-gray-300"></TableCell>
                      <TableCell className="border border-gray-300"></TableCell>
                      <TableCell className="border border-gray-300"></TableCell>
                      <TableCell className="border border-gray-300"></TableCell>
                      <TableCell className="border border-gray-300"></TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="font-bold border border-gray-300 text-right">Grand Total:</TableCell>
                  <TableCell className="text-right font-bold border border-gray-300">{formatCurrency(totalPayableAmount)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            </div>
            <div className="flex justify-end mt-6 no-print">
              <Button onClick={handlePrint} variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
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

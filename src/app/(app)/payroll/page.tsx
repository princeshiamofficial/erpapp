
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Plus, ArrowUpDown, Eye, Pencil, Trash2, Loader2, MoreVertical, TrendingUp, Star, Calendar, Clock, BarChartHorizontal, UserRoundX } from 'lucide-react';
import type { Employee, User } from '@/types';
import { getEmployees } from '@/lib/employee-service';
import { getUsers } from '@/lib/user-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, isAfter, getDaysInMonth, subMonths, isSameMonth, getDate, endOfMonth } from 'date-fns';
import { deleteEmployeeAction } from './actions';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const AddEmployeeDialog = dynamic(() => import('@/components/payroll/AddEmployeeDialog').then(mod => mod.AddEmployeeDialog));
const EditEmployeeDialog = dynamic(() => import('@/components/payroll/EditEmployeeDialog').then(mod => mod.EditEmployeeDialog));
const DeleteEmployeeDialog = dynamic(() => import('@/components/payroll/DeleteEmployeeDialog').then(mod => mod.DeleteEmployeeDialog));
const EditPayslipDialog = dynamic(() => import('@/components/payroll/EditPayslipDialog').then(mod => mod.EditPayslipDialog));


const ITEMS_PER_PAGE = 25;

const formatCurrency = (value?: number | null): string => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};


export default function PayrollPage() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("salary_sheet");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceDateFilter, setAttendanceDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPerformanceTabVisible, setIsPerformanceTabVisible] = useState(false);

  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [payslipToEdit, setPayslipToEdit] = useState<Employee | null>(null);

  const [selectedDate, setSelectedDate] = useState(subMonths(new Date(), 1));

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedEmployees, fetchedUsers] = await Promise.all([
        getEmployees(),
        getUsers()
      ]);
      setEmployees(fetchedEmployees);
      setAllUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch employees or users:", error);
      toast({ title: "Error", description: "Could not load page data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
     if (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN')) {
      fetchData();
    } else if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router, fetchData]);

  const filteredEmployees = useMemo(() => {
    let results = employees;

    if (activeTab === 'salary_sheet') {
      const endOfSelectedMonth = endOfMonth(selectedDate);
      results = results.filter(employee => {
        try {
          const joiningDate = new Date(employee.joiningDate);
          // Employee is eligible if their joining date is on or before the last day of the selected month.
          return !isAfter(joiningDate, endOfSelectedMonth);
        } catch (e) {
          return false;
        }
      });
    }

    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      results = results.filter(employee =>
        employee.name.toLowerCase().includes(lowercasedFilter) ||
        (employee.email && employee.email.toLowerCase().includes(lowercasedFilter)) ||
        employee.employeeId.toLowerCase().includes(lowercasedFilter) ||
        employee.designation.toLowerCase().includes(lowercasedFilter)
      );
    }
    return results;
  }, [employees, searchTerm, activeTab, selectedDate]);

  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredEmployees.slice(startIndex, endIndex);
  }, [filteredEmployees, currentPage]);
  
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, selectedDate, activeTab]);

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    setIsDeleting(true);
    const result = await deleteEmployeeAction(employeeToDelete.id);
    if (result.success) {
      toast({ title: "Employee Deleted" });
      fetchData();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsDeleting(false);
    setEmployeeToDelete(null);
  };


  const renderPagination = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; 
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);

      if (currentPage < 3) endPage = maxPagesToShow;
      else if (currentPage > totalPages - 2) startPage = totalPages - maxPagesToShow + 1;
      
      if (startPage > 1) {
        pageNumbers.push(1);
        if (startPage > 2) pageNumbers.push('...');
      }
      for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    return pageNumbers.map((page, index) => (
        <PaginationItem key={index}>
        {page === '...' ? <PaginationEllipsis />
        : <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(page as number);}} className={cn(currentPage === page && 'bg-primary text-primary-foreground hover:bg-primary/90')}>
            {page}
          </PaginationLink>
        }
        </PaginationItem>
    ));
  };
  
  const usersNotYetEmployees = useMemo(() => {
    const employeeUserIds = new Set(employees.map(e => e.userId));
    return allUsers.filter(u => !employeeUserIds.has(u.id));
  }, [employees, allUsers]);
  
  const { totalPaid, totalUnpaid } = useMemo(() => {
    const monthYearId = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    return paginatedEmployees.reduce((acc, employee) => {
      const payslip = employee.payslips?.[monthYearId];
      let payable = 0;
      if (payslip) {
          payable = payslip.payableAmount;
      } else {
          const daysInMonth = getDaysInMonth(selectedDate);
          const perDaySalary = (employee.salary || 0) / (daysInMonth > 0 ? daysInMonth : 30);
          const presentDays = 30;
          const incentive = 0;
          const fine = 0;
          const lateDays = 0;
          const providentFund = (employee.salary || 0) * 0.07;
          const lateDeduction = Math.floor(lateDays / 3) * perDaySalary;
          payable = (perDaySalary * presentDays) + incentive - fine - providentFund - lateDeduction;
      }

      if (payslip?.paymentStatus === 'Paid') {
          acc.totalPaid += payable;
      } else {
          acc.totalUnpaid += payable;
      }

      return acc;
    }, { totalPaid: 0, totalUnpaid: 0 });
  }, [paginatedEmployees, selectedDate]);

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(parseInt(monthIndex, 10));
    setSelectedDate(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(parseInt(year, 10));
    setSelectedDate(newDate);
  };

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

  const employeeListContent = (
    <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
      <CardHeader className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-xl font-bold text-gray-800">Employee list</CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Employee List" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-200 rounded-full h-10 w-full"/>
            </div>
            <Button variant="outline" className="h-10 rounded-full border-gray-200 bg-white"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
            <AddEmployeeDialog 
              onEmployeeAdded={fetchData}
              allUsers={usersNotYetEmployees}
            >
              <Button className="h-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="mr-2 h-4 w-4" /> Add Employee</Button>
            </AddEmployeeDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="space-y-3">
          <div className="grid grid-cols-[30px_1fr_1.5fr_1.5fr_1fr_1fr_1fr_1fr_1fr_80px_80px] gap-4 px-4 py-3 bg-gray-50 rounded-lg text-xs font-semibold text-gray-500">
            <span>SL</span>
            <span className="flex items-center gap-1 cursor-pointer"><ArrowUpDown className="h-3 w-3" />Employee ID</span>
            <span>Name of Employee</span>
            <span>Email</span>
            <span>Mobile NO</span>
            <span>Date of Birth</span>
            <span>Designation</span>
            <span>Salary</span>
            <span className="flex items-center gap-1 cursor-pointer"><ArrowUpDown className="h-3 w-3" />Joining Date</span>
            <span>Status</span>
            <span className="text-center">Action</span>
          </div>

          {isLoading ? (
            Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
              <div key={index} className="grid grid-cols-[30px_1fr_1.5fr_1.5fr_1fr_1fr_1fr_1fr_1fr_80px_80px] items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <Skeleton className="h-4 w-4" /><Skeleton className="h-4 w-12" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-16 rounded-full" />
                <div className="flex justify-center items-center gap-2"><Skeleton className="h-6 w-6" /><Skeleton className="h-6 w-6" /><Skeleton className="h-6 w-6" /></div>
              </div>
            ))
          ) : paginatedEmployees.length > 0 ? (
            paginatedEmployees.map((employee, index) => (
              <div key={employee.id} className="grid grid-cols-[30px_1fr_1.5fr_1.5fr_1fr_1fr_1fr_1fr_1fr_80px_80px] items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100 text-sm text-gray-700">
                <span className="text-gray-500">{String((currentPage - 1) * ITEMS_PER_PAGE + index + 1).padStart(2, '0')}</span>
                <span>{employee.employeeId}</span><span className="font-medium text-gray-800">{employee.name}</span>
                <span className="truncate">{employee.email}</span><span>{employee.mobileNo}</span>
                <span>{format(new Date(employee.dob), 'yyyy-MM-dd')}</span><span>{employee.designation}</span>
                <span className="font-medium text-gray-800">{formatCurrency(employee.salary)}</span>
                <span>{format(new Date(employee.joiningDate), 'yyyy-MM-dd')}</span>
                <span><Badge className={cn(employee.status === 'Active' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200', 'border')}>{employee.status}</Badge></span>
                <span className="flex justify-center items-center">
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <span className="sr-only">Open menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="cursor-pointer">
                        <Eye className="mr-2 h-4 w-4" />
                        <span>View</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setEmployeeToEdit(employee)} className="cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setEmployeeToDelete(employee)} className="cursor-pointer text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </span>
              </div>
            ))
          ) : (
             <div className="text-center py-16 text-gray-500">No employees found.</div>
          )}
        </div>
        {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
                 <Pagination><PaginationContent>
                    <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} aria-disabled={currentPage === 1} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                    {renderPagination()}
                    <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                </PaginationContent></Pagination>
            </div>
        )}
      </CardContent>
    </Card>
  );

  const employeePerformanceContent = (
    <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
      <CardHeader className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-xl font-bold text-gray-800">Employee Performance</CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-200 rounded-full h-10 w-full"/>
            </div>
            <Button variant="outline" className="h-10 rounded-full border-gray-200 bg-white"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="space-y-3">
            <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 bg-gray-50 rounded-lg text-xs font-semibold text-gray-500">
                <span>Employee</span>
                <span>Designation</span>
                <span className="text-center">Completed Orders</span>
                <span className="text-center">Efficiency Score</span>
                <span className="text-center">Revenue Generated</span>
                <span className="text-center">Rating</span>
            </div>
            {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_1fr] items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-24" /></div>
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-12 mx-auto" />
                        <div className="w-full"><Skeleton className="h-2 w-full rounded-full" /></div>
                        <Skeleton className="h-4 w-16 mx-auto" />
                        <Skeleton className="h-4 w-12 mx-auto" />
                    </div>
                ))
            ) : paginatedEmployees.length > 0 ? (
                paginatedEmployees.map((employee) => (
                    <div key={employee.id} className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_1fr] items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100 text-sm text-gray-700">
                        <div className="flex items-center gap-3">
                            {/* Avatar placeholder */}
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0"></div>
                            <span className="font-medium text-gray-800">{employee.name}</span>
                        </div>
                        <span>{employee.designation}</span>
                        <span className="text-center font-medium">120</span> {/* Placeholder Data */}
                        <div className="flex items-center gap-2">
                           <Progress value={85} className="h-2" indicatorClassName="bg-green-500"/>
                           <span className="text-xs font-semibold">85%</span>
                        </div>
                        <span className="text-center font-medium">{formatCurrency(250000)}</span> {/* Placeholder Data */}
                        <div className="flex justify-center items-center gap-1 text-yellow-500">
                          <Star className="h-4 w-4 fill-current"/>
                          <span className="font-bold text-sm">4.8</span>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-16 text-gray-500">No performance data available.</div>
            )}
        </div>
      </CardContent>
    </Card>
  );

  const salarySheetContent = (
    <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
      <CardHeader className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-xl font-bold text-gray-800">Salary Sheet for {format(selectedDate, 'MMMM yyyy')}</CardTitle>
           <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-200 rounded-full h-10 w-full"/>
            </div>
            <Select value={selectedDate.getMonth().toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-full sm:w-[150px] h-10 rounded-full border-gray-200 bg-white">
                  <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                  {months.map(month => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
             <Select value={selectedDate.getFullYear().toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-full sm:w-[120px] h-10 rounded-full border-gray-200 bg-white">
                  <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                  {availableYears.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name of Employee</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Provident Fund</TableHead>
                <TableHead>Fine</TableHead>
                <TableHead>Incentive</TableHead>
                <TableHead>Payable Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-8 w-20 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedEmployees.length > 0 ? (
                paginatedEmployees.map((employee) => {
                  const monthYearId = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
                  const payslip = employee.payslips?.[monthYearId];
                  
                  const daysInMonth = getDaysInMonth(selectedDate);
                  const joiningDate = new Date(employee.joiningDate);
                  
                  let perDaySalary = 0;
                  let presentDays = 0;

                  if (isSameMonth(joiningDate, selectedDate) && joiningDate.getFullYear() === selectedDate.getFullYear()) {
                    // Prorated salary for the first month
                    const joiningDay = getDate(joiningDate);
                    const workableDays = daysInMonth - joiningDay + 1;
                    perDaySalary = (employee.salary || 0) / (daysInMonth > 0 ? daysInMonth : 30);
                    presentDays = payslip?.presentDays ?? workableDays;
                  } else {
                    // Full month salary
                    perDaySalary = (employee.salary || 0) / (daysInMonth > 0 ? daysInMonth : 30);
                    presentDays = payslip?.presentDays ?? 30;
                  }

                  const providentFund = (employee.salary || 0) * 0.07;
                  const lateDays = payslip?.lateDays ?? 0;
                  const incentive = payslip?.incentive ?? 0;
                  const fine = payslip?.fine ?? 0;
                  const absentDays = payslip?.absentDays ?? 0;
                  const paymentStatus = payslip?.paymentStatus ?? 'Unpaid';

                  const lateDeduction = Math.floor(lateDays / 3) * perDaySalary;
                  const payable = payslip?.payableAmount ?? (perDaySalary * presentDays) + incentive - fine - providentFund - lateDeduction;

                  return (
                    <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>{presentDays}</TableCell>
                        <TableCell>{absentDays}</TableCell>
                        <TableCell>{lateDays}</TableCell>
                        <TableCell>{formatCurrency(providentFund)}</TableCell>
                        <TableCell>{formatCurrency(fine)}</TableCell>
                        <TableCell>{formatCurrency(incentive)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(payable)}</TableCell>
                        <TableCell>
                          <Badge className={cn(paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{paymentStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="outline" size="sm" className="h-8" onClick={() => setPayslipToEdit(employee)}>
                            Edit payslip
                          </Button>
                        </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-48 text-center text-gray-500">
                    No salary sheet data available for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={10} className="text-right font-bold">
                        <div className="flex justify-end items-center gap-4">
                            <span>Total Paid: <span className="text-green-600">{formatCurrency(totalPaid)}</span></span>
                            <span>Total Unpaid: <span className="text-red-600">{formatCurrency(totalUnpaid)}</span></span>
                        </div>
                    </TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </div>
         {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
                 <Pagination><PaginationContent>
                    <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} aria-disabled={currentPage === 1} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                    {renderPagination()}
                    <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                </PaginationContent></Pagination>
            </div>
        )}
      </CardContent>
    </Card>
  );
  
  const attendeesReportContent = (
    <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
      <CardHeader className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-xl font-bold text-gray-800">Attendees Report</CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Filter by date..."
                className="pl-10 bg-gray-50 border-gray-200 rounded-full h-10 w-full"
                type="date"
                value={attendanceDateFilter}
                onChange={(e) => setAttendanceDateFilter(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-10 rounded-full border-gray-200 bg-white"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>In Time</TableHead>
                <TableHead>Out Time</TableHead>
                <TableHead>Hours Worked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><div className="flex items-center gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-20" /></div></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-48 text-gray-500">
                    <BarChartHorizontal className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    No attendance data recorded for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const leaveManagementContent = (
    <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
      <CardHeader className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-xl font-bold text-gray-800">Leave Management</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="text-center py-16 text-gray-500">
          <UserRoundX className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          Leave Management feature coming soon.
        </div>
      </CardContent>
    </Card>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'salary_sheet':
        return salarySheetContent;
      case 'employee_list':
        return employeeListContent;
      case 'employee_performance':
        return employeePerformanceContent;
      case 'attendees_report':
        return attendeesReportContent;
      case 'leave_management':
        return leaveManagementContent;
      default:
        return employeeListContent;
    }
  };

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN')) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <p>Access Denied. You must be an Administrator to view this page.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white p-1 rounded-full shadow-sm border border-gray-200">
          <TabsTrigger value="salary_sheet" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Salary Sheet</TabsTrigger>
          <TabsTrigger value="employee_list" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white" onDoubleClick={() => setIsPerformanceTabVisible(true)}>Employee List</TabsTrigger>
          {isPerformanceTabVisible && (
            <TabsTrigger value="employee_performance" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Employee Performance</TabsTrigger>
          )}
          <TabsTrigger value="attendees_report" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Attendees Report</TabsTrigger>
          <TabsTrigger value="leave_management" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Leave Management</TabsTrigger>
        </TabsList>
        <div className="mt-6">
            {renderActiveTab()}
        </div>
      </Tabs>
      {employeeToEdit && <EditEmployeeDialog isOpen={!!employeeToEdit} onOpenChange={(open) => !open && setEmployeeToEdit(null)} employee={employeeToEdit} onEmployeeUpdated={fetchData} />}
      {employeeToDelete && <DeleteEmployeeDialog isOpen={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)} employee={employeeToDelete} onConfirmDelete={handleDelete} isDeleting={isDeleting} />}
      {payslipToEdit && (
        <EditPayslipDialog
          isOpen={!!payslipToEdit}
          onOpenChange={(open) => !open && setPayslipToEdit(null)}
          employee={payslipToEdit}
          onSave={() => {
            fetchData(); // Refetch data after saving
            setPayslipToEdit(null);
          }}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}

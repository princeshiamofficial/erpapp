
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Search, Filter, Plus, ArrowUpDown, Eye, Pencil, Trash2, Loader2, MoreVertical, TrendingUp, Star, Calendar, Clock, BarChartHorizontal, UserRoundX, History, AlertTriangle, Landmark, Settings } from 'lucide-react';
import type { Employee, User, SalaryIncrement, Payslip, AttendanceRecord } from '@/types';
import { getEmployees } from '@/lib/employee-service';
import { getUsers } from '@/lib/user-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, isAfter, getDaysInMonth, subMonths, isSameMonth, getDate, endOfMonth, startOfMonth, parse, parseISO, isWithinInterval, endOfDay, getDay } from 'date-fns';
import { deleteEmployeeAction, deleteSalaryIncrementAction, getSalarySheetForMonth } from './actions';
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
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getWeekendSettings } from '@/lib/weekend-service';
import { getAttendanceForMonth } from '@/lib/attendance-service';
import { saveWeekendSettingsAction } from '@/app/(app)/hrm/attendance/actions';
import { DateRangePicker2 } from '@/components/dashboard/date-range-picker2';
import type { DateRange } from "react-day-picker";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';


const AddEmployeeDialog = dynamic(() => import('@/components/payroll/AddEmployeeDialog').then(mod => mod.AddEmployeeDialog));
const EditEmployeeDialog = dynamic(() => import('@/components/payroll/EditEmployeeDialog').then(mod => mod.EditEmployeeDialog));
const DeleteEmployeeDialog = dynamic(() => import('@/components/payroll/DeleteEmployeeDialog').then(mod => mod.DeleteEmployeeDialog));
const EditPayslipDialog = dynamic(() => import('@/components/payroll/EditPayslipDialog').then(mod => mod.EditPayslipDialog));
const IncrementSalaryDialog = dynamic(() => import('@/components/payroll/IncrementSalaryDialog').then(mod => mod.IncrementSalaryDialog));
const ManageLeaveDialog = dynamic(() => import('@/components/payroll/ManageLeaveDialog').then(mod => mod.ManageLeaveDialog));


const ITEMS_PER_PAGE = 25;

const formatCurrency = (value?: number | null): string => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};


const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];


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
  const [employeeToIncrement, setEmployeeToIncrement] = useState<Employee | null>(null);

  const [incrementToDelete, setIncrementToDelete] = useState<{ employeeId: string, increment: SalaryIncrement } | null>(null);
  const [isDeletingIncrement, setIsDeletingIncrement] = useState(false);

  const [leaveToManage, setLeaveToManage] = useState<Employee | null>(null);
  const [visibleFunds, setVisibleFunds] = useState<Record<string, boolean>>({});


  const [selectedDate, setSelectedDate] = useState(new Date());

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [weekendDays, setWeekendDays] = useState<string[]>([]);
  const [salarySheetData, setSalarySheetData] = useState<Payslip[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const monthStr = format(selectedDate, 'yyyy-MM');
      const [
        fetchedEmployees, 
        fetchedUsers,
        fetchedAttendance,
        fetchedWeekendSettings,
        fetchedSalarySheet,
      ] = await Promise.all([
        getEmployees(),
        getUsers(),
        getAttendanceForMonth(selectedDate),
        getWeekendSettings(),
        getSalarySheetForMonth(monthStr)
      ]);
      setEmployees(fetchedEmployees);
      setAllUsers(fetchedUsers);
      setAttendanceData(fetchedAttendance);
      setWeekendDays(fetchedWeekendSettings.days);
      setSalarySheetData(fetchedSalarySheet);
    } catch (error) {
      console.error("Failed to fetch page data:", error);
      toast({ title: "Error", description: "Could not load page data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, selectedDate]);
  
  useEffect(() => {
    if (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN')) {
      fetchData();
    } else if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router, fetchData]);

  const filteredEmployees = useMemo(() => {
    let results = employees;

    if (activeTab === 'salary_sheet' || activeTab === 'fund_wallet') {
      const selectedMonthStart = startOfMonth(selectedDate);
      
      results = results.filter(employee => {
        try {
          const joiningDate = new Date(employee.joiningDate);
          if (employee.status === 'Active') {
            return !isAfter(startOfMonth(joiningDate), selectedMonthStart);
          }
          
          if (employee.status === 'Inactive') {
            const paidSlips = salarySheetData.filter(p => p.employeeId === employee.id && p.paymentStatus === 'Paid');

            if (paidSlips.length === 0) {
              return !isAfter(startOfMonth(joiningDate), selectedMonthStart);
            }
            
            const lastPaidMonthStr = paidSlips.sort((a, b) => b.id.localeCompare(a.id))[0].id;
            const lastPaidMonth = parse(lastPaidMonthStr, 'yyyy-MM', new Date());

            return !isAfter(selectedMonthStart, lastPaidMonth);
          }

          return false;

        } catch (e) {
          console.error(`Error processing filter for employee ${employee.id}`, e);
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
  }, [employees, searchTerm, activeTab, selectedDate, salarySheetData]);

  const allIncrementHistory = useMemo(() => {
    return employees.flatMap(employee => 
        (employee.salaryHistory || []).map(history => ({
            ...history,
            employeeName: employee.name,
            employeeId: employee.id
        }))
    ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [employees]);


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
  
  const handleConfirmDeleteIncrement = async () => {
    if (!incrementToDelete) return;
    setIsDeletingIncrement(true);
    const result = await deleteSalaryIncrementAction(incrementToDelete.employeeId, incrementToDelete.increment.date);
    if (result.success) {
      toast({ title: "Increment Reverted", description: "The salary increment has been deleted." });
      fetchData();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsDeletingIncrement(false);
    setIncrementToDelete(null);
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
  
  const salarySheetCalculatedData = useMemo(() => {
    const monthYearId = format(selectedDate, 'yyyy-MM');
    const startDate = startOfMonth(selectedDate);
    const endDate = endOfMonth(selectedDate);

    const today = new Date();
    const isCurrentMonth = isSameMonth(selectedDate, today);
    const loopEndDate = isCurrentMonth ? today.getDate() : getDaysInMonth(selectedDate);

    let totalWorkingDays = 0;
    const weekendDayIndexes = weekendDays.map(day => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(day));
    
    for (let i = 1; i <= loopEndDate; i++) {
        const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), i);
        const dayOfWeek = getDay(currentDate);
        if (!weekendDayIndexes.includes(dayOfWeek)) {
            totalWorkingDays++;
        }
    }
    
    return paginatedEmployees.map(employee => {
      const payslip = salarySheetData.find(p => p.employeeId === employee.id && p.id === monthYearId);
      const userAttendanceInRange = attendanceData.filter(att => 
          att.employeeId === employee.userId && isWithinInterval(parseISO(att.date), { start: startDate, end: endDate })
      );
      
      const presentDays = payslip?.presentDays ?? userAttendanceInRange.length;
      const lateDays = payslip?.lateDays ?? userAttendanceInRange.filter(att => att.status === 'Late').length;
      const absentDays = payslip?.absentDays ?? Math.max(0, totalWorkingDays - presentDays);
      
      const fine = payslip?.fine ?? 0;
      const incentive = payslip?.incentive ?? 0;
      const paymentStatus = payslip?.paymentStatus ?? 'Unpaid';

      const relevantHistory = (employee.salaryHistory || [])
          .filter(h => !isAfter(startOfMonth(new Date(h.date)), selectedDate))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const effectiveSalary = relevantHistory.length > 0 ? relevantHistory[0].newSalary : employee.salary || 0;

      const perDaySalary = effectiveSalary / 30; // Always calculate based on 30 days
      const providentFund = effectiveSalary * 0.07;
      const lateDeduction = Math.floor(lateDays / 3) * perDaySalary;
      const payableAmount = payslip?.payableAmount ?? (perDaySalary * presentDays) + incentive - fine - providentFund - lateDeduction;

      return {
        ...employee,
        presentDays,
        absentDays,
        lateDays,
        providentFund,
        fine,
        incentive,
        payableAmount,
        paymentStatus
      };
    });
  }, [paginatedEmployees, selectedDate, attendanceData, weekendDays, salarySheetData]);


  const { totalPaid, totalUnpaid, totalPayableAmount } = useMemo(() => {
    const totals = salarySheetCalculatedData.reduce((acc, data) => {
      acc.totalPayableAmount += data.payableAmount;
      if (data.paymentStatus === 'Paid') {
          acc.totalPaid += data.payableAmount;
      } else {
          acc.totalUnpaid += data.payableAmount;
      }
      return acc;
    }, { totalPaid: 0, totalUnpaid: 0, totalPayableAmount: 0 });
    
    return totals;
  }, [salarySheetCalculatedData]);
  
  const totalProvidentFund = useMemo(() => {
    return salarySheetCalculatedData.reduce((total, data) => total + data.providentFund, 0);
  }, [salarySheetCalculatedData]);


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
  
  const toggleFundVisibility = (employeeId: string) => {
    setVisibleFunds(prev => ({ ...prev, [employeeId]: !prev[employeeId] }));
  };
  
    const handleWeekendChange = (day: string, checked: boolean | 'indeterminate') => {
        setWeekendDays(prev => 
            checked ? [...prev, day] : prev.filter(d => d !== day)
        );
    };

    const handleSaveWeekends = async () => {
        const result = await saveWeekendSettingsAction(weekendDays);
        if (result.success) {
            toast({
                title: "Settings Saved",
                description: "Weekend days have been updated.",
            });
        } else {
             toast({
                title: "Error",
                description: result.error || "Failed to save weekend settings.",
                variant: "destructive",
            });
        }
    };


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
                      <DropdownMenuItem onSelect={() => setEmployeeToIncrement(employee)} className="cursor-pointer">
                        <TrendingUp className="mr-2 h-4 w-4"/>
                        <span>Increment Salary</span>
                      </DropdownMenuItem>
                       <DropdownMenuItem onSelect={() => setLeaveToManage(employee)} className="cursor-pointer">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Manage Leave</span>
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
              ) : salarySheetCalculatedData.length > 0 ? (
                salarySheetCalculatedData.map((data) => (
                    <TableRow key={data.id}>
                        <TableCell className="font-medium">{data.name}</TableCell>
                        <TableCell>{data.presentDays}</TableCell>
                        <TableCell>{data.absentDays}</TableCell>
                        <TableCell>{data.lateDays}</TableCell>
                        <TableCell>{formatCurrency(data.providentFund)}</TableCell>
                        <TableCell>{formatCurrency(data.fine)}</TableCell>
                        <TableCell>{formatCurrency(data.incentive)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(data.payableAmount)}</TableCell>
                        <TableCell>
                          <Badge className={cn(data.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{data.paymentStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="outline" size="sm" className="h-8" onClick={() => setPayslipToEdit(data)}>
                            Edit payslip
                          </Button>
                        </TableCell>
                    </TableRow>
                  ))
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
                    <TableCell colSpan={9} className="text-right font-bold">Total Payable</TableCell>
                    <TableCell className="font-bold text-right">{formatCurrency(totalPayableAmount)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
  
  const settingsContent = (
      <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
        <CardHeader className="p-6 border-b">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center"><Settings className="mr-2 h-5 w-5" />Settings</CardTitle>
             <CardDescription>Configure attendance and payroll settings.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
            <div className="space-y-4">
                <div>
                    <h3 className="font-semibold mb-2">Weekend Days</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {WEEK_DAYS.map(day => (
                            <div key={day} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`weekend-${day}`}
                                    checked={weekendDays.includes(day)}
                                    onCheckedChange={(checked) => handleWeekendChange(day, checked)}
                                />
                                <Label htmlFor={`weekend-${day}`} className="text-sm font-normal">
                                    {day}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
                 <Button onClick={handleSaveWeekends}>Save Weekend Settings</Button>
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
      case 'settings':
        return settingsContent;
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
          <TabsTrigger value="employee_list" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Employee List</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Settings</TabsTrigger>
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
            fetchData();
            setPayslipToEdit(null);
          }}
          selectedDate={selectedDate}
          existingPayslip={salarySheetData.find(p => p.employeeId === payslipToEdit.id && p.id === `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`)}
        />
      )}
    </div>
  );
}



"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
  PaginationPrevious,
  PaginationNext
} from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Plus, ArrowUpDown, Eye, Pencil, Trash2, Loader2, MoreVertical, TrendingUp, Calendar, Clock, BarChartHorizontal, UserRoundX, History, AlertTriangle, Landmark, Settings, Wallet, CheckCircle, Receipt, Landmark as ProvidentFundIcon, AlertCircle as FineIcon } from 'lucide-react';
import type { Employee, User, SalaryIncrement, Payslip, AttendanceRecord } from '@/types';
import { getEmployees } from '@/lib/employee-service';
import { getUsers } from '@/lib/user-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, isAfter, getDaysInMonth, subMonths, isSameMonth, getDate, endOfMonth, startOfMonth, parse, parseISO, getDay } from 'date-fns';
import { deleteEmployeeAction, deleteSalaryIncrementAction, getSalarySheetForMonth } from '@/app/(app)/payroll/actions';
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
import { getAttendanceForMonth } from '@/lib/attendance-service';
import { getWeekendSettings } from '@/lib/weekend-service';
import Image from 'next/image';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const AddEmployeeDialog = dynamic(() => import('@/components/payroll/AddEmployeeDialog').then(mod => mod.AddEmployeeDialog));
const EditEmployeeDialog = dynamic(() => import('@/components/payroll/EditEmployeeDialog').then(mod => mod.EditEmployeeDialog));
const DeleteEmployeeDialog = dynamic(() => import('@/components/payroll/DeleteEmployeeDialog').then(mod => mod.DeleteEmployeeDialog));
const EditPayslipDialog = dynamic(() => import('@/components/payroll/EditPayslipDialog').then(mod => mod.EditPayslipDialog));
const IncrementSalaryDialog = dynamic(() => import('@/components/payroll/IncrementSalaryDialog').then(mod => mod.IncrementSalaryDialog));
const ManageLeaveDialog = dynamic(() => import('@/components/payroll/ManageLeaveDialog').then(mod => mod.ManageLeaveDialog));


const ITEMS_PER_PAGE = 50;

const formatCurrency = (value?: number | null): string => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('Active');
  const [attendanceDateFilter, setAttendanceDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [payslipToEdit, setPayslipToEdit] = useState<(Employee & { presentDays?: number, absentDays?: number, lateDays?: number, fine?: number; }) | null>(null);
  const [existingPayslipData, setExistingPayslipData] = useState<Payslip | undefined>(undefined);
  const [employeeToIncrement, setEmployeeToIncrement] = useState<Employee | null>(null);

  const [incrementToDelete, setIncrementToDelete] = useState<{ employeeId: string, increment: SalaryIncrement } | null>(null);
  const [isDeletingIncrement, setIsDeletingIncrement] = useState(false);

  const [leaveToManage, setLeaveToManage] = useState<Employee | null>(null);
  const [historyToView, setHistoryToView] = useState<Employee | null>(null);


  const [selectedDate, setSelectedDate] = useState(subMonths(new Date(), 1));

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [salarySheetData, setSalarySheetData] = useState<Payslip[]>([]);
  const [weekendDays, setWeekendDays] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const monthStr = format(selectedDate, 'yyyy-MM');
      const [
        fetchedEmployees, 
        fetchedUsers,
        fetchedAttendance, 
        fetchedSalarySheet,
        fetchedWeekendSettings
      ] = await Promise.all([
        getEmployees(),
        getUsers(),
        getAttendanceForMonth(selectedDate), 
        getSalarySheetForMonth(monthStr),
        getWeekendSettings()
      ]);
      setEmployees(fetchedEmployees);
      setAllUsers(fetchedUsers);
      setAttendanceData(fetchedAttendance);
      setSalarySheetData(fetchedSalarySheet);
      setWeekendDays(fetchedWeekendSettings.days);
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

  const { filteredEmployees, salarySheetCalculatedData, totalUnpaidAmount, totalProvidentFund, totalFineAmount, totalPayableAmount } = useMemo(() => {
    let results = [...employees];
    
    if (statusFilter !== 'all') {
      results = results.filter(employee => employee.status === statusFilter);
    }

    if (activeTab === 'salary_sheet' || activeTab === 'summary') {
      const endOfSelectedMonth = endOfMonth(selectedDate);
      results = results.filter(employee => {
        try {
          const joiningDate = parseISO(employee.joiningDate);
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

    // Calculations
    const calculatedData = results.filter(e => e.status === 'Active').map(employee => {
      const monthYearId = format(selectedDate, 'yyyy-MM');
      const payslip = salarySheetData.find(p => p.employeeId === employee.employeeId && p.id.startsWith(monthYearId));
      
      const userAttendanceInRange = attendanceData.filter(att => 
          att.employeeId === employee.userId && isSameMonth(parseISO(att.date), selectedDate)
      );
      
      const presentDays = userAttendanceInRange.length;
      const lateDays = userAttendanceInRange.filter(att => att.status === 'Late').length;
      const onTimeDays = presentDays - lateDays;
      const absentDays = (30 - presentDays);

      if (payslip) {
        return {
          ...employee,
          presentDays: payslip.presentDays,
          absentDays: payslip.absentDays,
          lateDays: payslip.lateDays,
          onTimeDays,
          providentFund: (employee.salary || 0) * 0.07,
          fine: payslip.fine,
          incentive: payslip.incentive,
          payableAmount: payslip.payableAmount,
          paymentStatus: payslip.paymentStatus,
          trainingFee: payslip.trainingFee ?? 0,
          advance: payslip.advance ?? 0,
        };
      }
      
      const relevantHistory = (employee.salaryHistory || [])
          .filter(h => !isAfter(startOfMonth(new Date(h.date)), selectedDate))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const effectiveSalary = relevantHistory.length > 0 ? relevantHistory[0].newSalary : employee.salary || 0;

      const perDaySalaryForFine = effectiveSalary / 30; // Always divide by 30 for fine calculation
      const automaticFine = Math.floor(lateDays / 3) * perDaySalaryForFine;
      
      const perDaySalaryForAbsence = 30 > 0 ? effectiveSalary / 30 : 0;
      const salaryForDaysWorked = perDaySalaryForAbsence * presentDays;
      
      const providentFund = effectiveSalary * 0.07;
      
      const payableAmount = salaryForDaysWorked - automaticFine - providentFund;

      return {
        ...employee,
        presentDays,
        absentDays: Math.max(0, absentDays),
        lateDays,
        onTimeDays,
        providentFund,
        fine: automaticFine,
        incentive: 0,
        payableAmount: Math.max(0, payableAmount), // Ensure payable amount is not negative
        paymentStatus: 'Unpaid' as 'Paid' | 'Unpaid',
        trainingFee: 0,
        advance: 0,
      };
    });

    const unpaid = calculatedData.filter(data => data.paymentStatus === 'Unpaid').reduce((total, data) => total + data.payableAmount, 0);
    const providentFundTotal = calculatedData.reduce((total, data) => total + data.providentFund, 0);
    const fineTotal = calculatedData.reduce((total, data) => total + (data.fine || 0) + (data.advance || 0), 0);
    const payableTotal = calculatedData.reduce((total, data) => total + data.payableAmount, 0);

    return { 
      filteredEmployees: results,
      salarySheetCalculatedData: calculatedData,
      totalUnpaidAmount: unpaid,
      totalProvidentFund: providentFundTotal,
      totalFineAmount: fineTotal,
      totalPayableAmount: payableTotal,
    };

  }, [employees, searchTerm, statusFilter, activeTab, selectedDate, salarySheetData, attendanceData, weekendDays]);

  const totalPages = useMemo(() => {
    if (activeTab !== 'employee_list') return 1;
    return Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  },[filteredEmployees, activeTab]);

  const paginatedEmployees = useMemo(() => {
    if (activeTab !== 'employee_list') return salarySheetCalculatedData;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredEmployees.slice(startIndex, endIndex);
  }, [filteredEmployees, currentPage, activeTab, salarySheetCalculatedData]);
  
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, selectedDate, activeTab, statusFilter]);

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
    setIsDeleting(true);
    const result = await deleteSalaryIncrementAction(incrementToDelete.employeeId, incrementToDelete.increment.date);
    if (result.success) {
      toast({ title: "Increment Reverted", description: "The salary increment has been deleted." });
      fetchData();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsDeleting(false);
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
  
  const getInitials = (name: string): string => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
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
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'Active' | 'Inactive')}>
              <SelectTrigger className="w-full sm:w-[150px] h-10 rounded-full border-gray-200 bg-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
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
        <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SL</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Name of Employee</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Mobile NO</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Joining Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(ITEMS_PER_PAGE)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><div className="flex items-center gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-24" /></div></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-8 w-8 mx-auto rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedEmployees.length > 0 ? (
                   paginatedEmployees.map((employee, index) => {
                    const user = allUsers.find(u => u.id === (employee as Employee).userId);
                     return (
                      <TableRow key={employee.id}>
                          <TableCell className="text-gray-500">{String((currentPage - 1) * ITEMS_PER_PAGE + index + 1).padStart(2, '0')}</TableCell>
                          <TableCell>{(employee as Employee).nationalId || 'N/A'}</TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user?.avatarUrl || undefined} alt={employee.name} />
                                    <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                                </Avatar>
                                <span>{employee.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{(employee as Employee).designation}</TableCell>
                          <TableCell>{(employee as Employee).mobileNo}</TableCell>
                          <TableCell>{format(new Date((employee as Employee).dob), 'yyyy-MM-dd')}</TableCell>
                          <TableCell className="font-medium text-gray-800">
                            <spoiler-span>{formatCurrency((employee as Employee).salary)}</spoiler-span>
                          </TableCell>
                          <TableCell>{format(new Date((employee as Employee).joiningDate), 'yyyy-MM-dd')}</TableCell>
                          <TableCell><Badge className={cn((employee as Employee).status === 'Active' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200', 'border')}>{employee.status}</Badge></TableCell>
                          <TableCell className="text-center">
                               <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem className="cursor-pointer" onSelect={() => setHistoryToView(employee as Employee)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    <span>View</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => setEmployeeToEdit(employee as Employee)} className="cursor-pointer">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    <span>Edit</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => setEmployeeToIncrement(employee as Employee)} className="cursor-pointer">
                                    <TrendingUp className="mr-2 h-4 w-4"/>
                                    <span>Increment Salary</span>
                                  </DropdownMenuItem>
                                   <DropdownMenuItem onSelect={() => setLeaveToManage(employee as Employee)} className="cursor-pointer">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    <span>Manage Leave</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => setEmployeeToDelete(employee as Employee)} className="cursor-pointer text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                      </TableRow>
                   )})
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center h-48 text-gray-500">
                      <UserRoundX className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                       No employees found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
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
                <TableHead>SL</TableHead>
                <TableHead>Employee ID</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><div className="flex items-center gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-24" /></div></TableCell>
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
              ) : salarySheetCalculatedData && salarySheetCalculatedData.length > 0 ? (
                salarySheetCalculatedData.map((data, index) => {
                    const user = allUsers.find(u => u.id === data.userId);
                    return (
                    <TableRow key={data.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{data.nationalId}</TableCell>
                        <TableCell className="font-medium">
                           <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user?.avatarUrl || undefined} alt={data.name} />
                                    <AvatarFallback>{getInitials(data.name)}</AvatarFallback>
                                </Avatar>
                                <span>{data.name}</span>
                            </div>
                        </TableCell>
                        <TableCell>{data.presentDays}</TableCell>
                        <TableCell>{data.absentDays}</TableCell>
                        <TableCell>{data.lateDays}</TableCell>
                        <TableCell>{formatCurrency(data.providentFund)}</TableCell>
                        <TableCell>{formatCurrency(data.fine)}</TableCell>
                        <TableCell>{formatCurrency(data.incentive)}</TableCell>
                        <TableCell className="font-semibold">
                          <spoiler-span>{formatCurrency(data.payableAmount)}</spoiler-span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(data.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{data.paymentStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                           <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8" 
                              onClick={() => {
                                const monthYearId = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
                                const payslipForDialog = salarySheetData.find(p => p.employeeId === data.employeeId && p.id.startsWith(monthYearId));
                                setExistingPayslipData(payslipForDialog);
                                setPayslipToEdit(data);
                              }}
                           >
                            Edit payslip
                          </Button>
                        </TableCell>
                    </TableRow>
                    )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={12} className="h-48 text-center text-gray-500">
                    No salary sheet data available for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={11} className="text-right font-bold">Total Unpaid</TableCell>
                    <TableCell className="font-bold text-right"><spoiler-span>{formatCurrency(totalUnpaidAmount)}</spoiler-span></TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
  
  const summaryContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow bg-card p-4 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-700/20">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Payable</p>
              <p className="text-2xl font-bold text-foreground font-mono"><spoiler-span>{formatCurrency(totalPayableAmount)}</spoiler-span></p>
            </div>
          </div>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow bg-card p-4 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-700/20">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Unpaid</p>
              <p className="text-2xl font-bold text-destructive font-mono"><spoiler-span>{formatCurrency(totalUnpaidAmount)}</spoiler-span></p>
            </div>
          </div>
        </Card>
         <Card className="shadow-md hover:shadow-lg transition-shadow bg-card p-4 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-700/20">
              <FineIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Fines & Advances</p>
              <p className="text-2xl font-bold text-foreground font-mono"><spoiler-span>{formatCurrency(totalFineAmount)}</spoiler-span></p>
            </div>
          </div>
        </Card>
         <Card className="shadow-md hover:shadow-lg transition-shadow bg-card p-4 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-700/20">
              <ProvidentFundIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Provident Fund</p>
              <p className="text-2xl font-bold text-foreground font-mono"><spoiler-span>{formatCurrency(totalProvidentFund)}</spoiler-span></p>
            </div>
          </div>
        </Card>
    </div>
  );

  const attendeesReportContent = <p>Attendees Report Content</p>;
  const employeePerformanceContent = <p>Employee Performance Content</p>;

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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 min-h-screen">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white p-1 rounded-full shadow-sm border border-gray-200">
          <TabsTrigger value="salary_sheet" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Salary Sheet</TabsTrigger>
          <TabsTrigger value="employee_list" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Employee List</TabsTrigger>
          <TabsTrigger value="summary" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Summary</TabsTrigger>
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
          existingPayslip={existingPayslipData}
        />
      )}
       {employeeToIncrement && (
        <IncrementSalaryDialog
          isOpen={!!employeeToIncrement}
          onOpenChange={(open) => !open && setEmployeeToIncrement(null)}
          employee={employeeToIncrement}
          onSalaryIncremented={fetchData}
        />
      )}
       {leaveToManage && currentUser && (
        <ManageLeaveDialog
            isOpen={!!leaveToManage}
            onOpenChange={(open) => !open && setLeaveToManage(null)}
            employee={leaveToManage}
            currentUser={currentUser}
            onLeaveUpdated={fetchData}
        />
      )}
      {historyToView && (
        <Sheet open={!!historyToView} onOpenChange={(open) => !open && setHistoryToView(null)}>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>History for {historyToView.name}</SheetTitle>
              <SheetDescription>View salary increment and leave history.</SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-8rem)] py-4">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-md mb-2">Salary History</h4>
                  {historyToView.salaryHistory && historyToView.salaryHistory.length > 0 ? (
                     historyToView.salaryHistory.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((inc) => (
                      <div key={inc.date} className="text-sm p-2 border-b group relative">
                        <p>Increment on <span className="font-medium">{format(new Date(inc.date), 'd MMM, yyyy')}</span></p>
                        <p className="text-xs text-muted-foreground">
                          From {formatCurrency(inc.previousSalary)} to {formatCurrency(inc.newSalary)} (+{formatCurrency(inc.incrementAmount)})
                        </p>
                         <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => setIncrementToDelete({ employeeId: historyToView.id, increment: inc })}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No salary history.</p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-md mb-2">Leave History</h4>
                   {historyToView.leaveHistory && historyToView.leaveHistory.length > 0 ? (
                     historyToView.leaveHistory.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(leave => (
                      <div key={leave.id} className="text-sm p-2 border-b">
                        <p>{leave.days} day(s) on <span className="font-medium">{format(new Date(leave.date), 'd MMM, yyyy')}</span></p>
                        <p className="text-xs text-muted-foreground italic">Reason: {leave.reason}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No leave history.</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}
      
       {incrementToDelete && (
          <AlertDialog open={!!incrementToDelete} onOpenChange={() => setIncrementToDelete(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-6 w-6 text-destructive" />
                          Are you sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                          This will permanently delete the salary increment from <span className="font-semibold">{format(new Date(incrementToDelete.increment.date), 'MMMM yyyy')}</span>. The employee's salary will revert to its previous value. This action cannot be undone.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setIncrementToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleConfirmDeleteIncrement} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeleting}>
                          {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Reverting...</> : "Yes, Delete Increment"}
                      </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      )}
    </div>
  );
}

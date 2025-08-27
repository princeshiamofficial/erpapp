
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
import { Search, Filter, Plus, ArrowUpDown, Eye, Pencil, Trash2, Loader2, MoreVertical, TrendingUp, Star } from 'lucide-react';
import type { Employee, User } from '@/types';
import { getEmployees } from '@/lib/employee-service';
import { getUsers } from '@/lib/user-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
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

const AddEmployeeDialog = dynamic(() => import('@/components/payroll/AddEmployeeDialog').then(mod => mod.AddEmployeeDialog));
const EditEmployeeDialog = dynamic(() => import('@/components/payroll/EditEmployeeDialog').then(mod => mod.EditEmployeeDialog));
const DeleteEmployeeDialog = dynamic(() => import('@/components/payroll/DeleteEmployeeDialog').then(mod => mod.DeleteEmployeeDialog));

const ITEMS_PER_PAGE = 8;

const formatCurrency = (value?: number | null): string => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};


export default function PayrollPage() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("employee_list");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    if (!searchTerm) return employees;
    const lowercasedFilter = searchTerm.toLowerCase();
    return employees.filter(employee =>
      employee.name.toLowerCase().includes(lowercasedFilter) ||
      (employee.email && employee.email.toLowerCase().includes(lowercasedFilter)) ||
      employee.employeeId.toLowerCase().includes(lowercasedFilter) ||
      employee.designation.toLowerCase().includes(lowercasedFilter)
    );
  }, [employees, searchTerm]);

  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredEmployees.slice(startIndex, endIndex);
  }, [filteredEmployees, currentPage]);
  
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm]);

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

  const employeeListContent = (
    <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
      <CardHeader className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-xl font-bold text-gray-800">Employee list</CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Employee Position" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-200 rounded-full h-10 w-full"/>
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
  
  const placeholderContent = (title: string) => (
      <Card className="shadow-lg border-none rounded-2xl bg-white"><CardHeader><CardTitle>{title}</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center h-96 text-gray-500"><p>Content for {title} goes here.</p></CardContent>
      </Card>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'employee_list':
        return employeeListContent;
      case 'employee_performance':
        return employeePerformanceContent;
      case 'employee_position':
        return placeholderContent('Employee Position');
      default:
        return employeeListContent;
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white p-1 rounded-full shadow-sm border border-gray-200">
          <TabsTrigger value="employee_position" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Employee Position</TabsTrigger>
          <TabsTrigger value="employee_list" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Employee List</TabsTrigger>
          <TabsTrigger value="employee_performance" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Employee Performance</TabsTrigger>
        </TabsList>
        <div className="mt-6">
            {renderActiveTab()}
        </div>
      </Tabs>
      {employeeToEdit && <EditEmployeeDialog isOpen={!!employeeToEdit} onOpenChange={(open) => !open && setEmployeeToEdit(null)} employee={employeeToEdit} onEmployeeUpdated={fetchData} />}
      {employeeToDelete && <DeleteEmployeeDialog isOpen={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)} employee={employeeToDelete} onConfirmDelete={handleDelete} isDeleting={isDeleting} />}
    </div>
  );
}

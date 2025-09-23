
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Filter, BarChartHorizontal, Search, UserRoundX } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { getEmployees } from '@/lib/employee-service';
import type { Employee, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

const ManageLeaveDialog = dynamic(() => import('@/components/payroll/ManageLeaveDialog').then(mod => mod.ManageLeaveDialog));

const ITEMS_PER_PAGE = 25;

export default function AttendancePage() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("attendees_report");
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [attendanceDateFilter, setAttendanceDateFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [leaveToManage, setLeaveToManage] = useState<Employee | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
          const fetchedEmployees = await getEmployees();
          setEmployees(fetchedEmployees);
        } catch (error) {
          console.error("Failed to fetch employees:", error);
          toast({ title: "Error", description: "Could not load employee data.", variant: "destructive" });
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
        let results = employees.filter(employee => employee.status === 'Active');
    
        if (searchTerm) {
          const lowercasedFilter = searchTerm.toLowerCase();
          results = results.filter(employee =>
            employee.name.toLowerCase().includes(lowercasedFilter) ||
            employee.employeeId.toLowerCase().includes(lowercasedFilter) ||
            employee.designation.toLowerCase().includes(lowercasedFilter)
          );
        }
        return results;
    }, [employees, searchTerm]);

    const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
    const paginatedEmployees = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredEmployees.slice(startIndex, endIndex);
    }, [filteredEmployees, currentPage]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab]);

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


    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN')) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <p>Access Denied. You must be an Administrator to view this page.</p>
            </div>
        );
    }

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
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-48 text-gray-500">
                                <BarChartHorizontal className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                No attendance data recorded for the selected period.
                            </TableCell>
                        </TableRow>
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
             <div className="flex items-center gap-2 w-full sm:w-auto">
               <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-200 rounded-full h-10 w-full"/>
              </div>
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
                  <TableHead>Designation</TableHead>
                  <TableHead>Yearly Leave</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-8 w-20 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedEmployees.length > 0 ? (
                   paginatedEmployees.map((employee, index) => {
                     const yearlyLeave = employee.yearlyLeave || 12;
                     const leaveTaken = employee.leaveTaken || 0;
                     const availableLeave = yearlyLeave - leaveTaken;
                     return (
                      <TableRow key={employee.id}>
                          <TableCell className="text-gray-500">{String((currentPage - 1) * ITEMS_PER_PAGE + index + 1).padStart(2, '0')}</TableCell>
                          <TableCell>{employee.employeeId}</TableCell>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell>{employee.designation}</TableCell>
                          <TableCell>{yearlyLeave}</TableCell>
                          <TableCell className="font-semibold text-green-600">{availableLeave}</TableCell>
                          <TableCell className="text-center">
                            <Button variant="outline" size="sm" className="h-8" onClick={() => setLeaveToManage(employee)}>Manage</Button>
                          </TableCell>
                      </TableRow>
                   )})
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-48 text-gray-500">
                      <UserRoundX className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                       No employees to manage leave for.
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

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'attendees_report':
                return attendeesReportContent;
            case 'leave_management':
                return leaveManagementContent;
            default:
                return attendeesReportContent;
        }
    };

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white p-1 rounded-full shadow-sm border border-gray-200">
                    <TabsTrigger value="attendees_report" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Attendees Report</TabsTrigger>
                    <TabsTrigger value="leave_management" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Leave Management</TabsTrigger>
                </TabsList>
                <div className="mt-6">
                    {renderActiveTab()}
                </div>
            </Tabs>
             {leaveToManage && currentUser && (
                <ManageLeaveDialog
                    isOpen={!!leaveToManage}
                    onOpenChange={(open) => !open && setLeaveToManage(null)}
                    employee={leaveToManage}
                    currentUser={currentUser}
                    onLeaveUpdated={fetchData}
                />
            )}
        </div>
    );
}


"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Search, Filter, Plus, ArrowUpDown, Eye, Pencil, Trash2 } from 'lucide-react';
import type { User } from '@/types';
import { getUsers } from '@/lib/user-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 8;

// Mock data for missing fields
const mockData: { [key: string]: { dob: string, designation: string, joiningDate: string } } = {
  'admin@colorhut.dev': { dob: '1985-01-15', designation: 'IT Admin', joiningDate: '2010-06-04' },
  'crm@colorhut.dev': { dob: '1990-05-20', designation: 'Data Analysis', joiningDate: '2015-08-12' },
  'dr@colorhut.dev': { dob: '1992-11-30', designation: 'Software', joiningDate: '2018-03-01' },
  'vendor@colorhut.dev': { dob: '1988-07-22', designation: 'Product', joiningDate: '2020-01-10' },
};


export default function PayrollPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("employee_list");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsersData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({ title: "Error", description: "Could not load user data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const lowercasedFilter = searchTerm.toLowerCase();
    return users.filter(user =>
      user.name.toLowerCase().includes(lowercasedFilter) ||
      user.email.toLowerCase().includes(lowercasedFilter) ||
      user.id.toLowerCase().includes(lowercasedFilter) ||
      (mockData[user.email]?.designation.toLowerCase().includes(lowercasedFilter))
    );
  }, [users, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage]);
  
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm]);

  const renderPagination = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; 
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);

      if (currentPage < 3) {
        endPage = maxPagesToShow;
      } else if (currentPage > totalPages - 2) {
        startPage = totalPages - maxPagesToShow + 1;
      }
      
      if (startPage > 1) {
        pageNumbers.push(1);
        if (startPage > 2) {
          pageNumbers.push('...');
        }
      }
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pageNumbers.push('...');
        }
        pageNumbers.push(totalPages);
      }
    }
    return pageNumbers.map((page, index) => (
        <PaginationItem key={index}>
        {page === '...' ? (
            <PaginationEllipsis />
        ) : (
            <PaginationLink
              href="#"
              onClick={(e) => { e.preventDefault(); setCurrentPage(page as number);}}
              className={cn(currentPage === page && 'bg-green-500 text-white hover:bg-green-600 hover:text-white')}
            >
            {page}
            </PaginationLink>
        )}
        </PaginationItem>
    ));
  };

  const employeeListContent = (
    <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
      <CardHeader className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-xl font-bold text-gray-800">Employee list</CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Employee Position"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 rounded-full h-10 w-full"
              />
            </div>
            <Button variant="outline" className="h-10 rounded-full border-gray-200 bg-white">
              <Filter className="mr-2 h-4 w-4" /> Filter
            </Button>
            <Button className="h-10 rounded-full bg-green-500 hover:bg-green-600 text-white">
              <Plus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="space-y-3">
          {/* Custom Table Header */}
          <div className="grid grid-cols-[30px_80px_1.5fr_1.5fr_1fr_1fr_1fr_1fr_80px_80px] gap-4 px-4 py-3 bg-gray-50 rounded-lg text-xs font-semibold text-gray-500">
            <span>SL</span>
            <span className="flex items-center gap-1 cursor-pointer"><ArrowUpDown className="h-3 w-3" />Employee ID</span>
            <span>Name of Employee</span>
            <span>Email</span>
            <span>Mobile NO</span>
            <span>Date of Birth</span>
            <span>Designation</span>
            <span className="flex items-center gap-1 cursor-pointer"><ArrowUpDown className="h-3 w-3" />Joining Date</span>
            <span>Status</span>
            <span className="text-center">Action</span>
          </div>

          {/* Table Body */}
          {isLoading ? (
            Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
              <div key={index} className="grid grid-cols-[30px_80px_1.5fr_1.5fr_1fr_1fr_1fr_1fr_80px_80px] items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton className="h-4 w-12 rounded-sm" />
                <Skeleton className="h-4 w-24 rounded-sm" />
                <Skeleton className="h-4 w-32 rounded-sm" />
                <Skeleton className="h-4 w-20 rounded-sm" />
                <Skeleton className="h-4 w-20 rounded-sm" />
                <Skeleton className="h-4 w-16 rounded-sm" />
                <Skeleton className="h-4 w-20 rounded-sm" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <div className="flex justify-center items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-md" />
                  <Skeleton className="h-6 w-6 rounded-md" />
                  <Skeleton className="h-6 w-6 rounded-md" />
                </div>
              </div>
            ))
          ) : paginatedUsers.length > 0 ? (
            paginatedUsers.map((user, index) => {
              const extraData = mockData[user.email] || { dob: 'N/A', designation: 'N/A', joiningDate: null };
              return (
              <div key={user.id} className="grid grid-cols-[30px_80px_1.5fr_1.5fr_1fr_1fr_1fr_1fr_80px_80px] items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100 text-sm text-gray-700">
                <span className="text-gray-500">{String((currentPage - 1) * ITEMS_PER_PAGE + index + 1).padStart(2, '0')}</span>
                <span>{user.id.split('-').pop()}</span>
                <span className="font-medium text-gray-800">{user.name}</span>
                <span className="truncate">{user.email}</span>
                <span>{extraData.dob === 'N/A' ? '098-8765-9876' : '198-8765-9876'}</span>
                <span>{extraData.dob}</span>
                <span>{extraData.designation}</span>
                <span>{extraData.joiningDate ? new Date(extraData.joiningDate).toISOString().split('T')[0] : 'N/A'}</span>
                <span><Badge className="bg-green-100 text-green-700 hover:bg-green-200 border border-green-200">Active</Badge></span>
                <span className="flex justify-center items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:bg-blue-100"><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500 hover:bg-green-100"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-100"><Trash2 className="h-4 w-4" /></Button>
                </span>
              </div>
            )})
          ) : (
             <div className="text-center py-16 text-gray-500">No users found.</div>
          )}
        </div>
        {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
                 <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} aria-disabled={currentPage === 1} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}/>
                        </PaginationItem>
                        {renderPagination()}
                        <PaginationItem>
                            <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}/>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        )}
      </CardContent>
    </Card>
  );
  
  const placeholderContent = (title: string) => (
      <Card className="shadow-lg border-none rounded-2xl bg-white">
          <CardHeader>
              <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-96 text-gray-500">
            <p>Content for {title} goes here.</p>
          </CardContent>
      </Card>
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white p-1 rounded-full shadow-sm border border-gray-200">
          <TabsTrigger value="employee_position" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Employee Position</TabsTrigger>
          <TabsTrigger value="employee_list" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Employee List</TabsTrigger>
          <TabsTrigger value="employee_performance" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Employee Performance</TabsTrigger>
        </TabsList>
        <div className="mt-6">
            {activeTab === 'employee_list' ? employeeListContent : placeholderContent(activeTab.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))}
        </div>
      </Tabs>
    </div>
  );
}

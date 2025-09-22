
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Filter, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';
import { getUsers } from '@/lib/user-service';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

// Mock data for now
interface AttendanceRecord {
  id: string;
  date: string;
  employeeName: string;
  employeeId: string;
  status: 'Present' | 'Absent' | 'Leave';
  inTime?: string;
  outTime?: string;
  hoursWorked?: string;
}

export default function AttendancePage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await getUsers();
      setAllUsers(fetchedUsers);
      
      // In a real implementation, you would fetch attendance data here
      // For now, we'll use mock data.
      const mockData: AttendanceRecord[] = fetchedUsers.map((user, i) => ({
        id: `att-${i}`,
        date: new Date().toISOString(),
        employeeName: user.name,
        employeeId: user.id,
        status: i % 3 === 0 ? 'Absent' : (i % 3 === 1 ? 'Leave' : 'Present'),
        inTime: i % 3 === 2 ? '09:05 AM' : undefined,
        outTime: i % 3 === 2 ? '06:15 PM' : undefined,
        hoursWorked: i % 3 === 2 ? '9h 10m' : undefined,
      }));
      setAttendanceRecords(mockData);

    } catch (error) {
      toast({ title: "Error", description: "Could not load user data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (currentUser) {
        if (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN') {
            fetchData();
        } else {
            // Redirect non-admins as they shouldn't access this page.
            router.replace('/dashboard');
        }
    }
  }, [currentUser, fetchData, router]);


  const filteredRecords = useMemo(() => {
    if (!dateFilter) return attendanceRecords;
    return attendanceRecords.filter(record => {
      try {
        const recordDate = new Date(record.date).toISOString().split('T')[0];
        return recordDate === dateFilter;
      } catch {
        return false;
      }
    });
  }, [attendanceRecords, dateFilter]);

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN')) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <p>Access Denied.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary"/>
            Attendance Report
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            View daily attendance records for all employees.
          </p>
        </div>
      </div>

      <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-card-foreground text-xl">Daily Report</CardTitle>
                 <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Filter by date..."
                        className="pl-10 bg-gray-50 border-gray-200 rounded-full h-10 w-full"
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                      />
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>In Time</TableHead>
                  <TableHead>Out Time</TableHead>
                  <TableHead>Hours Worked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={`skel-att-${i}`}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="pl-6">{new Date(record.date).toLocaleDateString()}</TableCell>
                      <TableCell>{record.employeeName}</TableCell>
                      <TableCell>{record.status}</TableCell>
                      <TableCell>{record.inTime || 'N/A'}</TableCell>
                      <TableCell>{record.outTime || 'N/A'}</TableCell>
                      <TableCell>{record.hoursWorked || 'N/A'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                      No attendance records found for the selected date.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

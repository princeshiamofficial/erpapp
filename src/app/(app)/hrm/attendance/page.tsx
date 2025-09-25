

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Filter, BarChartHorizontal, Search, UserRoundX, MapPin, Settings, Wifi, PlusCircle, CalendarDays, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { getEmployees } from '@/lib/employee-service';
import type { Employee, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ManageLeaveDialog = dynamic(() => import('@/components/payroll/ManageLeaveDialog').then(mod => mod.ManageLeaveDialog));
const LocationMapDialog = dynamic(() => import('@/components/hrm/LocationMapDialog').then(mod => mod.LocationMapDialog), {
  ssr: false,
});
const AttendanceTypeDialog = dynamic(() => import('@/components/hrm/AttendanceTypeDialog').then(mod => mod.AttendanceTypeDialog));
const AddEditHolidayDialog = dynamic(() => import('@/components/hrm/AddEditHolidayDialog').then(mod => mod.AddEditHolidayDialog));
const AddEditOfficeTimeDialog = dynamic(() => import('@/components/hrm/AddEditOfficeTimeDialog').then(mod => mod.AddEditOfficeTimeDialog));


const ITEMS_PER_PAGE = 25;

const getInitials = (name: string) => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

// Mock Data for Attendance Report
const MOCK_ATTENDANCE_DATA = [
    { id: '1', date: '2024-07-28', employeeName: 'John Doe', employeeAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', status: 'On Time' as const, inTime: '09:01 AM', outTime: '06:05 PM', hoursWorked: '9h 4m', lateReason: '-', earlyOutReason: '-', location: 'Head Office', lat: 23.7077, lng: 90.4503 },
    { id: '2', date: '2024-07-28', employeeName: 'Jane Smith', employeeAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026705d', status: 'Late' as const, inTime: '09:32 AM', outTime: '06:15 PM', hoursWorked: '8h 43m', lateReason: 'Traffic Jam', earlyOutReason: '-', location: 'Head Office', lat: 23.7077, lng: 90.4503 },
    { id: '3', date: '2024-07-28', employeeName: 'Mike Johnson', employeeAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026706d', status: 'On Time' as const, inTime: '08:55 AM', outTime: '05:00 PM', hoursWorked: '8h 5m', lateReason: '-', earlyOutReason: 'Personal Emergency', location: 'Remote', lat: 23.8103, lng: 90.4125 },
    { id: '4', date: '2024-07-27', employeeName: 'John Doe', employeeAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', status: 'On Time' as const, inTime: '08:58 AM', outTime: '06:02 PM', hoursWorked: '9h 4m', lateReason: '-', earlyOutReason: '-', location: 'Head Office', lat: 23.7077, lng: 90.4503 },
    { id: '5', date: '2024-07-27', employeeName: 'Jane Smith', employeeAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026705d', status: 'Absent' as const, inTime: '-', outTime: '-', hoursWorked: '-', lateReason: '-', earlyOutReason: '-', location: '-', lat: null, lng: null },
];

const getStatusBadgeClass = (status: 'On Time' | 'Late' | 'Absent') => {
  switch (status) {
    case 'On Time':
      return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200';
    case 'Late':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200';
    case 'Absent':
      return 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200';
  }
};

const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];


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
    const [viewingLocation, setViewingLocation] = useState<{ lat: number, lng: number, employeeName: string, employeeAvatar?: string } | null>(null);
    const [selectedWeekends, setSelectedWeekends] = useState<string[]>(["Friday", "Saturday"]);
    const [isAttendanceTypeDialogOpen, setIsAttendanceTypeDialogOpen] = useState(false);
    
    // State for Holiday Dialog
    const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
    const [holidayToEdit, setHolidayToEdit] = useState(null); // Will hold holiday data for editing
    const [holidays, setHolidays] = useState([{id: '1', title: 'National Mourning Day', date: '19 Nov 2006'}]); // Mock data

    // State for Office Time Dialog
    const [isOfficeTimeDialogOpen, setIsOfficeTimeDialogOpen] = useState(false);
    const [officeTimeToEdit, setOfficeTimeToEdit] = useState(null);


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
          const fetchedEmployees = await getEmployees();
          setEmployees(fetchedEmployees);
          // In a real app, you would fetch holidays here too.
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
    
    const filteredAttendance = useMemo(() => {
        if (!attendanceDateFilter) return MOCK_ATTENDANCE_DATA;
        return MOCK_ATTENDANCE_DATA.filter(entry => entry.date === attendanceDateFilter);
    }, [attendanceDateFilter]);

    const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
    const paginatedEmployees = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredEmployees.slice(startIndex, endIndex);
    }, [filteredEmployees, currentPage]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab]);
    
    const handleWeekendChange = (day: string, checked: boolean | 'indeterminate') => {
        if (checked) {
            setSelectedWeekends(prev => [...prev, day]);
        } else {
            setSelectedWeekends(prev => prev.filter(d => d !== day));
        }
    };
    
    const handleSaveWeekends = () => {
        // Here you would typically call a server action to save the `selectedWeekends` state
        console.log("Saving weekends:", selectedWeekends);
        toast({
            title: "Settings Saved",
            description: "Weekend days have been updated.",
        });
    };

    const handleHolidaySaved = () => {
        // In a real app, you would refetch the holidays list
        toast({
            title: "Success",
            description: "Holiday list has been updated."
        });
        fetchData(); // Re-fetch all data, including holidays
        setIsHolidayDialogOpen(false);
        setHolidayToEdit(null);
    }
    
    const openAddHolidayDialog = () => {
        setHolidayToEdit(null);
        setIsHolidayDialogOpen(true);
    };

    const openEditHolidayDialog = (holiday: any) => {
        setHolidayToEdit(holiday);
        setIsHolidayDialogOpen(true);
    };

    const handleOfficeTimeSaved = () => {
      // Refetch office times data
      toast({ title: "Success", description: "Office time settings have been updated." });
      setIsOfficeTimeDialogOpen(false);
      setOfficeTimeToEdit(null);
    };

    const openAddOfficeTimeDialog = () => {
      setOfficeTimeToEdit(null);
      setIsOfficeTimeDialogOpen(true);
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
                </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
                <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        
                        <TableHead>Employee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>In Time</TableHead>
                        <TableHead>Out Time</TableHead>
                        <TableHead>Hours Worked</TableHead>
                        <TableHead>Late Reason</TableHead>
                        <TableHead>Early Out Reason</TableHead>
                        <TableHead>Location</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                         {isLoading ? (
                            [...Array(3)].map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredAttendance.length > 0 ? (
                            filteredAttendance.map(entry => (
                                <TableRow key={entry.id}>
                                    
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={entry.employeeAvatar} alt={entry.employeeName} />
                                                <AvatarFallback>{getInitials(entry.employeeName)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{entry.employeeName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn(getStatusBadgeClass(entry.status), 'border')}>
                                            {entry.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{entry.inTime}</TableCell>
                                    <TableCell>{entry.outTime}</TableCell>
                                    <TableCell>{entry.hoursWorked}</TableCell>
                                    <TableCell>{entry.lateReason}</TableCell>
                                    <TableCell>{entry.earlyOutReason}</TableCell>
                                    <TableCell>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            disabled={!entry.lat || !entry.lng}
                                            onClick={() => {
                                                if (entry.lat && entry.lng) {
                                                    setViewingLocation({ 
                                                        lat: entry.lat, 
                                                        lng: entry.lng,
                                                        employeeName: entry.employeeName,
                                                        employeeAvatar: entry.employeeAvatar
                                                    });
                                                }
                                            }}
                                        >
                                            <MapPin className="mr-2 h-4 w-4" />
                                            View Map
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={8} className="text-center h-48 text-gray-500">
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

    const settingsContent = (
      <div className="space-y-6">
        <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
          <CardHeader className="p-6 border-b">
              <CardTitle className="text-xl font-bold text-gray-800 flex items-center"><CalendarDays className="mr-2 h-5 w-5" />Weekend</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Days</TableHead>
                          {WEEK_DAYS.map(day => <TableHead key={day}>{day}</TableHead>)}
                          <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      <TableRow>
                          <TableCell className="font-medium">Weekend</TableCell>
                          {WEEK_DAYS.map(day => (
                              <TableCell key={day}>
                                  <Checkbox
                                      checked={selectedWeekends.includes(day)}
                                      onCheckedChange={(checked) => handleWeekendChange(day, checked)}
                                  />
                              </TableCell>
                          ))}
                          <TableCell className="text-right">
                              <Button size="sm" onClick={handleSaveWeekends}>Save</Button>
                          </TableCell>
                      </TableRow>
                  </TableBody>
              </Table>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-xl font-bold text-gray-800 flex items-center"><Wifi className="mr-2 h-5 w-5" />IP/Wifi</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button className="bg-black text-white hover:bg-gray-800" onClick={() => setIsAttendanceTypeDialogOpen(true)}>
                          Attendance Type
                        </Button>
                        <Button>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add IP/Wifi
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead>IP</TableHead>
                            <TableHead>Wifi Name</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell colSpan={4} className="text-center h-24 text-gray-500">
                                No IP/Wifi details is available
                            </TableCell>
                        </TableRow>
                    </TableBody>
                 </Table>
            </CardContent>
        </Card>
        
        <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-xl font-bold text-gray-800 flex items-center"><CalendarDays className="mr-2 h-5 w-5" />Holidays</CardTitle>
                    </div>
                    <Button onClick={openAddHolidayDialog}><PlusCircle className="mr-2 h-4 w-4" /> Add Holiday</Button>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Holiday Date</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {holidays.length > 0 ? holidays.map((holiday, index) => (
                           <TableRow key={holiday.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{holiday.title}</TableCell>
                            <TableCell>{holiday.date}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => openEditHolidayDialog(holiday)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center h-24 text-gray-500">
                                No holidays defined yet.
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                 </Table>
            </CardContent>
        </Card>

      </div>
    );
    
    const officeTimeContent = (
      <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
        <CardHeader className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle className="text-xl font-bold text-gray-800">Office Time Settings</CardTitle>
              <CardDescription>Manage office hours, shifts, and grace periods.</CardDescription>
            </div>
            <Button onClick={openAddOfficeTimeDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Time
            </Button>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Office Hour</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Grace Time</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell>Regular</TableCell>
                    <TableCell>09:00 AM</TableCell>
                    <TableCell>06:00 PM</TableCell>
                    <TableCell>15 minutes</TableCell>
                    <TableCell>Day</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
        </CardContent>
      </Card>
    );

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'leave_management':
                return leaveManagementContent;
            case 'settings':
                return settingsContent;
            case 'office_time':
                return officeTimeContent;
            default:
                return attendeesReportContent;
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
        <div className="min-h-screen">
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white p-1 rounded-full shadow-sm border border-gray-200">
                    <TabsTrigger value="attendees_report" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Attendees Report</TabsTrigger>
                    <TabsTrigger value="leave_management" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Leave Management</TabsTrigger>
                    <TabsTrigger value="settings" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Settings</TabsTrigger>
                    <TabsTrigger value="office_time" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Office Time</TabsTrigger>
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
            <LocationMapDialog 
                isOpen={!!viewingLocation}
                onOpenChange={() => setViewingLocation(null)}
                location={viewingLocation}
            />
             <AttendanceTypeDialog
                isOpen={isAttendanceTypeDialogOpen}
                onOpenChange={setIsAttendanceTypeDialogOpen}
             />
             <AddEditHolidayDialog
                isOpen={isHolidayDialogOpen}
                onOpenChange={setIsHolidayDialogOpen}
                onHolidaySaved={handleHolidaySaved}
                holiday={holidayToEdit}
             />
             <AddEditOfficeTimeDialog
                isOpen={isOfficeTimeDialogOpen}
                onOpenChange={setIsOfficeTimeDialogOpen}
                onOfficeTimeSaved={handleOfficeTimeSaved}
                officeTime={officeTimeToEdit}
             />
        </div>
    );
}

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Filter, BarChartHorizontal, Search, UserRoundX, MapPin, Settings, Wifi, PlusCircle, CalendarDays, MoreVertical, Edit, Trash2, ChevronsUpDown, Check, Download, Briefcase, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { getEmployees } from '@/lib/employee-service';
import type { Employee, User, OfficeTime, AttendanceRecord, UserRole, UserRoleDefinition } from '@/types';
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
import { getOfficeLocations } from '@/lib/office-location-service';
import { getOfficeTimes, deleteOfficeTime } from '@/lib/office-time-service';
import { getAttendanceForMonth } from '@/lib/attendance-service';
import { format, getDaysInMonth, getDay, isAfter, isBefore, startOfDay, subDays, differenceInDays, parseISO, isWithinInterval, endOfDay, startOfMonth, endOfMonth, getYear, isSameMonth, getMonth, isSameDay } from 'date-fns';
import { getUsers } from '@/lib/user-service';
import { getWeekendSettings } from '@/lib/weekend-service';
import { getRoles } from '@/lib/user-role-service';
import { saveWeekendSettingsAction } from './actions';
import { DateRangePicker2 } from '@/components/dashboard/date-range-picker2';
import type { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import Papa from 'papaparse';
import { Separator } from '@/components/ui/separator';


const ManageLeaveDialog = dynamic(() => import('@/components/payroll/ManageLeaveDialog').then(mod => mod.ManageLeaveDialog));
const LocationMapDialog = dynamic(() => import('@/components/hrm/LocationMapDialog').then(mod => mod.LocationMapDialog), {
    ssr: false,
});
const AttendanceTypeDialog = dynamic(() => import('@/components/hrm/AttendanceTypeDialog').then(mod => mod.AttendanceTypeDialog));
const AddEditHolidayDialog = dynamic(() => import('@/components/hrm/AddEditHolidayDialog').then(mod => mod.AddEditHolidayDialog));
const AddEditOfficeTimeDialog = dynamic(() => import('@/components/hrm/AddEditOfficeTimeDialog').then(mod => mod.AddEditOfficeTimeDialog));
const EditAttendanceDialog = dynamic(() => import('@/components/hrm/EditAttendanceDialog').then(mod => mod.EditAttendanceDialog));


const ITEMS_PER_PAGE = 25;

const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

const getStatusBadgeClass = (status: 'On Time' | 'Late' | 'Absent' | 'Weekend') => {
    switch (status) {
        case 'On Time':
            return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200';
        case 'Late':
            return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200';
        case 'Absent':
            return 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200';
        case 'Weekend':
            return 'bg-blue-50 text-blue-700 border-blue-100';
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
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [availableRoles, setAvailableRoles] = useState<UserRoleDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [attendanceDateFilter, setAttendanceDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [currentPage, setCurrentPage] = useState(1);
    const [leaveToManage, setLeaveToManage] = useState<Employee | null>(null);
    const [viewingLocation, setViewingLocation] = useState<{ lat: number, lng: number, employeeName: string, employeeAvatar?: string, type?: 'In' | 'Out' } | null>(null);
    const [selectedWeekends, setSelectedWeekends] = useState<string[]>([]);
    const [isAttendanceTypeDialogOpen, setIsAttendanceTypeDialogOpen] = useState(false);

    const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
    const [holidayToEdit, setHolidayToEdit] = useState(null);
    const [holidays, setHolidays] = useState([{ id: '1', title: 'National Mourning Day', date: '19 Nov 2006' }]);

    const [isOfficeTimeDialogOpen, setIsOfficeTimeDialogOpen] = useState(false);
    const [officeTimeToEdit, setOfficeTimeToEdit] = useState<OfficeTime | null>(null);
    const [officeTimes, setOfficeTimes] = useState<OfficeTime[]>([]);

    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);

    const [reportDateRange, setReportDateRange] = useState<DateRange | undefined>(() => {
        const now = new Date();
        return {
            from: startOfMonth(now),
            to: endOfDay(now),
        };
    });
    const [reportSearchTerm, setReportSearchTerm] = useState('');

    const [selectedUserId, setSelectedUserId] = useState<string>('all');
    const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false);

    const [attendanceMonth, setAttendanceMonth] = useState(String(new Date().getMonth()));
    const [attendanceYear, setAttendanceYear] = useState(String(new Date().getFullYear()));
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const [attendanceToEdit, setAttendanceToEdit] = useState<any | null>(null);
    const [isEditAttendanceDialogOpen, setIsEditAttendanceDialogOpen] = useState(false);

    const isAdmin = useMemo(() => currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN', [currentUser]);


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [
                fetchedEmployees,
                fetchedOfficeTimes,
                attendanceMonth1,
                attendanceMonth2,
                attendanceMonth3,
                fetchedUsers,
                fetchedWeekendSettings,
                fetchedRoles
            ] = await Promise.all([
                getEmployees(),
                getOfficeTimes(),
                getAttendanceForMonth(new Date()),
                getAttendanceForMonth(subDays(new Date(), 30)),
                getAttendanceForMonth(subDays(new Date(), 60)),
                getUsers(),
                getWeekendSettings(),
                getRoles()
            ]);

            const allAttendance = [
                ...(attendanceMonth1 || []),
                ...(attendanceMonth2 || []),
                ...(attendanceMonth3 || [])
            ];
            const uniqueAttendance = Array.from(new Map(allAttendance.map(item => [item.id, item])).values());

            setEmployees(fetchedEmployees);
            setOfficeTimes(fetchedOfficeTimes);
            setAttendanceData(uniqueAttendance);
            setAllUsers(fetchedUsers);
            setSelectedWeekends(fetchedWeekendSettings.days);
            setAvailableRoles(fetchedRoles);
        } catch (error) {
            console.error("Failed to fetch page data:", error);
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
        let results = employees.filter(employee => {
            if (employee.status !== 'Active') return false;
            try {
                const currentYear = new Date().getFullYear();
                const joiningYear = getYear(new Date(employee.joiningDate));
                return joiningYear <= currentYear;
            } catch {
                return false;
            }
        });

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

    const individualAttendanceHistoryData = useMemo(() => {
        if (!selectedUserId || selectedUserId === 'all') {
            return attendanceData
                .filter(entry => entry.date === attendanceDateFilter)
                .map(entry => ({
                    ...entry,
                    date: parseISO(entry.date)
                }))
                .sort((a, b) => b.date.getTime() - a.date.getTime());
        }

        const targetDate = new Date(parseInt(attendanceYear), parseInt(attendanceMonth));
        const daysInMonth = getDaysInMonth(targetDate);
        const dailyData: any[] = [];
        const weekendDayIndexes = selectedWeekends.map(day => WEEK_DAYS.indexOf(day));

        const selectedUser = allUsers.find(u => u.id === selectedUserId);
        const selectedUserName = selectedUser?.name;

        // Use a set to keep track of dates we already have data for in this month
        const processedDates = new Set<string>();

        // Strictly filter attendance data for the selected user ID only
        const userMonthRecords = attendanceData.filter(entry =>
            entry.employeeId &&
            String(entry.employeeId).trim() === String(selectedUserId).trim() &&
            isSameMonth(parseISO(entry.date), targetDate) &&
            getYear(parseISO(entry.date)) === targetDate.getFullYear()
        );

        userMonthRecords.forEach(record => {
            const dateStr = record.date;
            if (!processedDates.has(dateStr)) {
                dailyData.push({
                    ...record,
                    date: parseISO(record.date),
                    employeeId: selectedUserId,
                    employeeName: selectedUserName || record.employeeName
                });
                processedDates.add(dateStr);
            }
        });

        // Fill in missing days (Absent or Weekend) up to today
        const today = new Date();
        for (let i = 1; i <= daysInMonth; i++) {
            const currentDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), i);
            if (isAfter(currentDate, today) && !isSameDay(currentDate, today)) {
                continue;
            }

            const dateStr = format(currentDate, 'yyyy-MM-dd');
            if (processedDates.has(dateStr)) {
                continue;
            }

            const dayOfWeek = getDay(currentDate);
            const status = weekendDayIndexes.includes(dayOfWeek) ? 'Weekend' : 'Absent';

            dailyData.push({
                id: `${selectedUserId}_${dateStr}`,
                date: currentDate,
                status: status,
                employeeId: selectedUserId,
                employeeName: selectedUserName || 'Unknown',
                checkInTime: '',
            });
            processedDates.add(dateStr);
        }

        // Final sort to ensure sequential date order (Descending: latest first)
        return dailyData.sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());
    }, [attendanceData, attendanceMonth, attendanceYear, selectedUserId, selectedWeekends, allUsers, attendanceDateFilter]);


    const attendanceSummary = useMemo(() => {
        if (selectedUserId === 'all' || !selectedDate || !employees.length) {
            return null;
        }

        const selectedEmployee = employees.find(e => e.userId === selectedUserId);
        if (!selectedEmployee) return null;

        const targetDate = new Date(parseInt(attendanceYear), parseInt(attendanceMonth));
        const daysInMonth = getDaysInMonth(targetDate);
        const weekendDayIndexes = selectedWeekends.map(day => WEEK_DAYS.indexOf(day));

        let totalWorkingDays = 0;

        for (let i = 1; i <= daysInMonth; i++) {
            const currentDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), i);
            if (isAfter(currentDate, new Date())) {
                continue;
            }
            const dayOfWeek = getDay(currentDate);

            if (!weekendDayIndexes.includes(dayOfWeek)) {
                totalWorkingDays++;
            }
        }

        const presentDays = individualAttendanceHistoryData.filter(
            (entry) => entry.status === 'On Time' || entry.status === 'Late'
        ).length;

        const totalLeave = selectedEmployee.leaveHistory?.filter(leave =>
            isSameMonth(parseISO(leave.date), targetDate)
        ).reduce((sum, leave) => sum + leave.days, 0) || 0;

        const totalAbsent = totalWorkingDays - presentDays - totalLeave;

        const totalLate = individualAttendanceHistoryData.filter(entry => entry.status === 'Late').length;

        let totalMinutesWorked = 0;
        individualAttendanceHistoryData.forEach((entry: any) => {
            const hw = entry.hoursWorked;
            if (hw) {
                if (typeof hw === 'string' && hw.includes(':')) {
                    const parts = hw.split(':');
                    if (parts.length === 2) {
                        const hours = parseInt(parts[0], 10);
                        const minutes = parseInt(parts[1], 10);
                        if (!isNaN(hours) && !isNaN(minutes)) {
                            totalMinutesWorked += (hours * 60) + minutes;
                        }
                    }
                } else if (!isNaN(Number(hw))) {
                    totalMinutesWorked += Math.round(Number(hw) * 60);
                }
            }
        });
        const totalHours = Math.floor(totalMinutesWorked / 60);
        const remainingMinutes = totalMinutesWorked % 60;
        const totalWorkingHours = `${String(totalHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;

        return {
            totalPresent: presentDays,
            totalAbsent: Math.max(0, totalAbsent),
            totalLeave,
            totalLate,
            totalWorkingHours,
        };

    }, [selectedUserId, selectedDate, attendanceYear, attendanceMonth, employees, individualAttendanceHistoryData, selectedWeekends]);

    const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
    const paginatedEmployees = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredEmployees.slice(startIndex, endIndex);
    }, [filteredEmployees, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab]);

    const handleWeekendChange = (day: string, checked: boolean | "indeterminate") => {
        if (checked) {
            setSelectedWeekends(prev => [...prev, day]);
        } else {
            setSelectedWeekends(prev => prev.filter(d => d !== day));
        }
    };

    const handleSaveWeekends = async () => {
        const result = await saveWeekendSettingsAction(selectedWeekends);
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

    const handleHolidaySaved = () => {
        toast({
            title: "Success",
            description: "Holiday list has been updated."
        });
        fetchData();
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
        fetchData();
        setIsOfficeTimeDialogOpen(false);
        setOfficeTimeToEdit(null);
    };

    const openAddOfficeTimeDialog = () => {
        setOfficeTimeToEdit(null);
        setIsOfficeTimeDialogOpen(true);
    };

    const openEditOfficeTimeDialog = (officeTime: any) => {
        setOfficeTimeToEdit(officeTime);
        setIsOfficeTimeDialogOpen(true);
    };

    const handleDeleteOfficeTime = async (officeTime: OfficeTime) => {
        if (!confirm(`Are you sure you want to delete the office time "${officeTime.name}"?`)) return;

        const success = await deleteOfficeTime(officeTime.id);
        if (success) {
            toast({ title: "Success", description: "Office time has been deleted." });
            fetchData();
        } else {
            toast({ title: "Error", description: "Failed to delete office time.", variant: "destructive" });
        }
    };

    const attendanceReportData = useMemo(() => {
        if (!reportDateRange?.from) return [];
        const startDate = startOfDay(reportDateRange.from);
        const endDate = endOfDay(reportDateRange.to || reportDateRange.from);

        const weekendDayIndexes = selectedWeekends.map(day => WEEK_DAYS.indexOf(day));

        const activeEmployees = employees.filter(e => e.status === 'Active');

        // Logic for counting global weekend days in the selected range
        let totalWeekendsInRange = 0;
        const numDaysForWeekendCount = differenceInDays(endDate, startDate) + 1;
        for (let i = 0; i < numDaysForWeekendCount; i++) {
            const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
            if (weekendDayIndexes.includes(currentDate.getDay())) {
                totalWeekendsInRange++;
            }
        }

        const baseReport = activeEmployees.map(employee => {
            if (!employee.userId) return null;

            // Use stricter but safer ID filtering
            const userAttendanceInRange = attendanceData.filter(att =>
                att.employeeId &&
                String(att.employeeId).trim() === String(employee.userId).trim() &&
                isWithinInterval(parseISO(att.date), { start: startDate, end: endDate })
            );

            let totalWorkingDays = 0;
            const numDays = differenceInDays(endDate, startDate) + 1;
            for (let i = 0; i < numDays; i++) {
                const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
                if (!weekendDayIndexes.includes(currentDate.getDay())) {
                    totalWorkingDays++;
                }
            }

            const presentDays = userAttendanceInRange.length;
            const totalPresentDays = presentDays + totalWeekendsInRange;
            const ontimeCheckInDays = userAttendanceInRange.filter(att => att.status === 'On Time').length;
            const lateCheckInDays = userAttendanceInRange.filter(att => att.status === 'Late').length;

            const absentDays = totalWorkingDays - presentDays;

            const earlyCheckoutDays = userAttendanceInRange.filter(att => att.earlyOutReason).length;

            return {
                employeeId: employee.userId,
                nationalId: employee.nationalId,
                employeeName: employee.name,
                designation: employee.designation,
                presentDays,
                totalFridays: totalWeekendsInRange, // Keeping the key name as used in UI but using actual weekends count
                totalPresentDays,
                totalAbsentDays: Math.max(0, absentDays),
                ontimeCheckInDays,
                lateCheckInDays,
                earlyCheckoutDays
            };
        }).filter(Boolean);

        if (!reportSearchTerm) {
            return baseReport;
        }

        const lowercasedSearch = reportSearchTerm.toLowerCase();
        return baseReport.filter(item =>
            item && (
                item.employeeName.toLowerCase().includes(lowercasedSearch) ||
                item.designation.toLowerCase().includes(lowercasedSearch)
            )
        );

    }, [allUsers, employees, attendanceData, selectedWeekends, reportDateRange, reportSearchTerm]);

    const handleExportIndividualAttendance = () => {
        if (!individualAttendanceHistoryData || individualAttendanceHistoryData.length === 0) {
            toast({ title: "No Data to Export", description: "There is no attendance data for the selected employee and period." });
            return;
        }

        const employeeName = selectedUserId !== 'all' ? allUsers.find(u => u.id === selectedUserId)?.name : 'All_Employees';
        const dateRange = selectedUserId === 'all'
            ? attendanceDateFilter
            : `${format(new Date(parseInt(attendanceYear), parseInt(attendanceMonth)), 'MMMM_yyyy')}`;

        const filename = `Attendance_History_${employeeName}_${dateRange}.csv`;

        const dataToExport = individualAttendanceHistoryData.map((entry: any) => ({
            'Date': format(entry.date, 'yyyy-MM-dd'),
            'Day': format(entry.date, 'EEEE'),
            'Employee ID': employees.find(e => e.userId === entry.employeeId)?.employeeId || entry.employeeId,
            'Employee Name': entry.employeeName,
            'Status': entry.status,
            'In Time': entry.checkInTime ? format(new Date(entry.checkInTime), 'h:mm a') : 'N/A',
            'Out Time': (entry as any).checkOutTime ? format(new Date((entry as any).checkOutTime), 'h:mm a') : 'N/A',
            'Hours Worked': (entry as any).hoursWorked || 'N/A',
            'Location': (entry as any).location || 'N/A',
        }));

        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear - 5; i <= currentYear + 1; i++) {
            years.push(i);
        }
        return years.reverse();
    }, []);

    const monthsForFilter = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
        value: i.toString(),
        label: format(new Date(0, i), 'MMMM'),
    })), []);


    const nonBannedUsers = useMemo(() => allUsers.filter(u => !u.isBanned && u.role !== 'VENDOR'), [allUsers]);

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
                    : <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(page as number); }} className={cn(currentPage === page && 'bg-primary text-primary-foreground hover:bg-primary/90')}>
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

    const attendanceHistoryContent = (
        <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
            <CardHeader className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle className="text-xl font-bold text-gray-800">Attendance History</CardTitle>
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                        <Popover open={isUserPopoverOpen} onOpenChange={setIsUserPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={isUserPopoverOpen} className="w-full sm:w-[200px] justify-between h-10 rounded-full">
                                    {selectedUserId === 'all' ? 'All Employees' : nonBannedUsers.find(u => u.id === selectedUserId)?.name || 'Select Employee'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search employee..." />
                                    <CommandList>
                                        <CommandEmpty>No user found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem onSelect={() => { setSelectedUserId('all'); setIsUserPopoverOpen(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", selectedUserId === 'all' ? "opacity-100" : "opacity-0")} />
                                                All Employees
                                            </CommandItem>
                                            {nonBannedUsers.map((user) => (
                                                <CommandItem key={user.id} onSelect={() => { setSelectedUserId(user.id); setIsUserPopoverOpen(false); }}>
                                                    <Check className={cn("mr-2 h-4 w-4", selectedUserId === user.id ? "opacity-100" : "opacity-0")} />
                                                    {user.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {selectedUserId === 'all' ? (
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
                        ) : (
                            <div className="flex items-center gap-2">
                                <Select value={attendanceMonth} onValueChange={setAttendanceMonth}>
                                    <SelectTrigger className="w-full sm:w-[150px] h-10 rounded-full border-gray-200 bg-white">
                                        <SelectValue placeholder="Select Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {monthsForFilter.map(month => (
                                            <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={attendanceYear} onValueChange={setAttendanceYear}>
                                    <SelectTrigger className="w-full sm:w-[120px] h-10 rounded-full border-gray-200 bg-white">
                                        <SelectValue placeholder="Select Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableYears.map(year => (
                                            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {selectedUserId !== 'all' && (
                            <Button variant="outline" onClick={handleExportIndividualAttendance} className="h-10 rounded-full border-gray-200 bg-white">
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
                {selectedUserId !== 'all' && attendanceSummary && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                            <Card className="shadow-md hover:shadow-lg transition-shadow bg-card rounded-lg">
                                <CardContent className="p-4 flex items-center space-x-4">
                                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Present</p>
                                        <p className="text-2xl font-bold text-green-600">{attendanceSummary.totalPresent}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="shadow-md hover:shadow-lg transition-shadow bg-card rounded-lg">
                                <CardContent className="p-4 flex items-center space-x-4">
                                    <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
                                        <UserRoundX className="h-6 w-6 text-red-600 dark:text-red-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Absent</p>
                                        <p className="text-2xl font-bold text-red-600">{attendanceSummary.totalAbsent}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="shadow-md hover:shadow-lg transition-shadow bg-card rounded-lg">
                                <CardContent className="p-4 flex items-center space-x-4">
                                    <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/20">
                                        <Briefcase className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Leave</p>
                                        <p className="text-2xl font-bold text-indigo-600">{attendanceSummary.totalLeave}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="shadow-md hover:shadow-lg transition-shadow bg-card rounded-lg">
                                <CardContent className="p-4 flex items-center space-x-4">
                                    <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                                        <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Late</p>
                                        <p className="text-2xl font-bold text-yellow-600">{attendanceSummary.totalLate}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="shadow-md hover:shadow-lg transition-shadow bg-card rounded-lg">
                                <CardContent className="p-4 flex items-center space-x-4">
                                    <div className="p-3 rounded-full bg-sky-100 dark:bg-sky-900/20">
                                        <Clock className="h-6 w-6 text-sky-600 dark:text-sky-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Working Hours</p>
                                        <p className="text-2xl font-bold text-foreground">{attendanceSummary.totalWorkingHours}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <Separator className="my-6" />
                    </>
                )}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>SL</TableHead>
                                <TableHead>Date</TableHead>
                                {selectedUserId !== 'all' && <TableHead>Day</TableHead>}
                                <TableHead>Employee ID</TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>In Time</TableHead>
                                <TableHead>Out Time</TableHead>
                                <TableHead>Hours Worked</TableHead>
                                <TableHead>Location</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody key={`${selectedUserId}-${attendanceMonth}-${attendanceYear}`}>
                            {isLoading ? (
                                [...Array(3)].map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell colSpan={10}><Skeleton className="h-10 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : individualAttendanceHistoryData.length > 0 ? (
                                individualAttendanceHistoryData
                                    .filter(entry => selectedUserId === 'all' || String(entry.employeeId) === String(selectedUserId))
                                    .map((entry, index) => {
                                        const user = allUsers.find(u => u.id === entry.employeeId);
                                        const employee = employees.find(e => e.userId === entry.employeeId);
                                        const entryDate = entry.date;
                                        const isFriday = getDay(entryDate) === 5;
                                        return (
                                            <TableRow
                                                key={entry.id || index}
                                                className={cn(
                                                    "transition-colors",
                                                    isAdmin && "cursor-pointer hover:bg-muted/50",
                                                    isFriday && "bg-red-50 dark:bg-red-900/20"
                                                )}
                                                onDoubleClick={() => {
                                                    if (isAdmin) {
                                                        setAttendanceToEdit(entry);
                                                        setIsEditAttendanceDialogOpen(true);
                                                    }
                                                }}
                                            >
                                                <TableCell>{individualAttendanceHistoryData.length - index}</TableCell>
                                                <TableCell>{format(entryDate, 'dd-MMM-yyyy')}</TableCell>
                                                {selectedUserId !== 'all' && <TableCell>{format(entryDate, 'EEEE')}</TableCell>}
                                                <TableCell>{employee?.nationalId || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={user?.avatarUrl || undefined} alt={entry.employeeName} />
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
                                                <TableCell>{(entry as any).checkInTime ? format(new Date((entry as any).checkInTime), 'h:mm a') : '-'}</TableCell>
                                                <TableCell>{(entry as any).checkOutTime ? format(new Date((entry as any).checkOutTime), 'h:mm a') : '-'}</TableCell>
                                                <TableCell>{(entry as any).hoursWorked || '-'}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={!(entry as any).checkInLocation?.lat || !(entry as any).checkInLocation?.lng}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if ((entry as any).checkInLocation?.lat && (entry as any).checkInLocation?.lng) {
                                                                    setViewingLocation({
                                                                        lat: (entry as any).checkInLocation.lat,
                                                                        lng: (entry as any).checkInLocation.lng,
                                                                        employeeName: entry.employeeName,
                                                                        employeeAvatar: user?.avatarUrl || undefined,
                                                                        type: 'In'
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <MapPin className="mr-2 h-4 w-4" />
                                                            In
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={!(entry as any).checkOutLocation?.lat || !(entry as any).checkOutLocation?.lng}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if ((entry as any).checkOutLocation?.lat && (entry as any).checkOutLocation?.lng) {
                                                                    setViewingLocation({
                                                                        lat: (entry as any).checkOutLocation.lat,
                                                                        lng: (entry as any).checkOutLocation.lng,
                                                                        employeeName: entry.employeeName,
                                                                        employeeAvatar: user?.avatarUrl || undefined,
                                                                        type: 'Out'
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <MapPin className="mr-2 h-4 w-4" />
                                                            Out
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center h-48 text-gray-500">
                                        <BarChartHorizontal className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                        No attendance data recorded for the selected criteria.
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
                            <Input
                                placeholder="Search employee..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-gray-50 border-gray-200 rounded-full h-10 w-full"
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
                                <TableHead>SL</TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Name of Employee</TableHead>
                                <TableHead>Designation</TableHead>
                                <TableHead>Joining Date</TableHead>
                                <TableHead>Total Accrued</TableHead>
                                <TableHead>Leave Taken</TableHead>
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
                                        <TableCell><div className="flex items-center gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-24" /></div></TableCell>
                                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell className="text-center"><Skeleton className="h-8 w-20 mx-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : paginatedEmployees.length > 0 ? (
                                paginatedEmployees.map((employee, index) => {
                                    const user = allUsers.find(u => u.id === (employee as Employee).userId);
                                    const now = new Date();
                                    const joiningDate = new Date(employee.joiningDate);

                                    let totalLeaveAccrued = 0;
                                    if (isAfter(now, joiningDate)) {
                                        const joiningMonth = getMonth(joiningDate);
                                        const currentMonth = getMonth(now);
                                        const joiningYear = getYear(joiningDate);
                                        const currentYear = getYear(now);

                                        if (currentYear > joiningYear) {
                                            totalLeaveAccrued += (12 - (joiningMonth + 1));
                                            totalLeaveAccrued += (currentYear - joiningYear - 1) * 12;
                                            totalLeaveAccrued += currentMonth + 1;
                                        } else {
                                            totalLeaveAccrued += currentMonth - (joiningMonth + 1);
                                        }
                                    }

                                    const leaveTaken = (employee.leaveHistory || []).reduce((sum, leave) => sum + leave.days, 0);
                                    const availableLeave = totalLeaveAccrued - leaveTaken;

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
                                            <TableCell>{format(new Date(employee.joiningDate), 'dd MMM, yyyy')}</TableCell>
                                            <TableCell className="font-semibold text-blue-600">{totalLeaveAccrued}</TableCell>
                                            <TableCell className="font-semibold text-red-600">{leaveTaken}</TableCell>
                                            <TableCell className="font-semibold text-green-600">{availableLeave}</TableCell>
                                            <TableCell className="text-center">
                                                <Button variant="outline" size="sm" className="h-8" onClick={() => setLeaveToManage(employee as Employee)}>Manage</Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-48 text-gray-500">
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
                            <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} aria-disabled={currentPage === 1} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''} /></PaginationItem>
                            {renderPagination()}
                            <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''} /></PaginationItem>
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
                            <Button className="bg-black text-white hover:bg-gray-800" onClick={() => setIsAttendanceTypeDialogOpen(true)} disabled>
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
                            <TableHead>Applicable Roles</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                        ) : officeTimes.length > 0 ? (
                            officeTimes.map(time => (
                                <TableRow key={time.id}>
                                    <TableCell>{time.name}</TableCell>
                                    <TableCell>{time.startTime}</TableCell>
                                    <TableCell>{time.endTime}</TableCell>
                                    <TableCell>{time.graceTime} minutes</TableCell>
                                    <TableCell>{time.shift}</TableCell>
                                    <TableCell>
                                        {time.applicableRoles === 'all' ? (
                                            <Badge variant="secondary">All Roles</Badge>
                                        ) : (
                                            <div className="flex flex-wrap gap-1">
                                                {(time.applicableRoles || []).map(role => (
                                                    <Badge key={role} variant="outline">{role.replace(/_/g, ' ')}</Badge>
                                                ))}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => openEditOfficeTimeDialog(time)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteOfficeTime(time)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={7} className="text-center h-24 text-gray-500">No office time configurations found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );

    const attendanceReportContent = (
        <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
            <CardHeader className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold text-gray-800">Attendance Report</CardTitle>
                        <CardDescription>A full month summary of attendance.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-grow sm:flex-grow-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search..."
                                value={reportSearchTerm}
                                onChange={(e) => setReportSearchTerm(e.target.value)}
                                className="pl-10 bg-gray-50 border-gray-200 rounded-full h-10"
                            />
                        </div>
                        <DateRangePicker2
                            initialRange={reportDateRange}
                            onDateRangeChange={(range) => setReportDateRange(range)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-gray-800">
                            <TableRow className="hover:bg-gray-800">
                                <TableHead className="text-white">SL</TableHead>
                                <TableHead className="text-white">Employee ID</TableHead>
                                <TableHead className="text-white">Employee Name</TableHead>
                                <TableHead className="text-white">Designation</TableHead>
                                <TableHead className="text-white">Present</TableHead>
                                <TableHead className="text-white">Total Friday</TableHead>
                                <TableHead className="text-white">Total Present</TableHead>
                                <TableHead className="text-white">Total Absent</TableHead>
                                <TableHead className="text-white">Ontime CheckIn</TableHead>
                                <TableHead className="text-white">Late CheckIn</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={`skel-report-${i}`}>
                                        <TableCell colSpan={11}><Skeleton className="h-8 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : attendanceReportData.length > 0 ? (
                                (attendanceReportData as any[]).map((data, index) => {
                                    const user = allUsers.find(u => u.id === data.employeeId);
                                    return (
                                        <TableRow key={data.employeeId} className="odd:bg-white even:bg-gray-50">
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{data.nationalId || 'N/A'}</TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={user?.avatarUrl || undefined} alt={data.employeeName} />
                                                        <AvatarFallback>{getInitials(data.employeeName)}</AvatarFallback>
                                                    </Avatar>
                                                    <span>{data.employeeName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{data.designation}</TableCell>
                                            <TableCell>{data.presentDays}</TableCell>
                                            <TableCell>{data.totalFridays}</TableCell>
                                            <TableCell>{data.totalPresentDays}</TableCell>
                                            <TableCell>{data.totalAbsentDays}</TableCell>
                                            <TableCell>{data.ontimeCheckInDays}</TableCell>
                                            <TableCell>{data.lateCheckInDays}</TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center h-48 text-gray-500">
                                        <BarChartHorizontal className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                        No attendance summary data available for this period.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
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
            case 'attendance_report':
                return attendanceReportContent;
            case 'attendees_report':
                return attendanceHistoryContent;
            default:
                return attendanceHistoryContent;
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
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="sticky top-20 z-30 bg-white p-1 rounded-full shadow-sm border border-gray-200">
                    <TabsTrigger value="attendees_report" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Attendance History</TabsTrigger>
                    <TabsTrigger value="attendance_report" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Attendance Report</TabsTrigger>
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
                title={viewingLocation ? `Check ${viewingLocation.type} Location for ${viewingLocation.employeeName}` : ''}
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
                availableRoles={availableRoles}
            />
            <EditAttendanceDialog
                isOpen={isEditAttendanceDialogOpen}
                onOpenChange={setIsEditAttendanceDialogOpen}
                onAttendanceSaved={fetchData}
                attendance={attendanceToEdit}
            />
        </div>
    );
}

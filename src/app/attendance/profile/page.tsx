
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  ChevronRight,
  LogOut,
  Bell,
  User as UserIcon,
  Loader2,
  MapPin,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUp,
  CalendarClock,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO, isSameMonth, getDaysInMonth, startOfMonth, getDay, subMonths, addMonths, getYear } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getAttendanceForMonth } from '@/lib/attendance-service';
import type { AttendanceRecord } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

interface ProfileLinkProps {
  href: string;
  icon: React.ElementType;
  label: string;
  isExternal?: boolean;
}

const ProfileLink: React.FC<ProfileLinkProps> = ({ href, icon: Icon, label, isExternal }) => (
  <Link href={href} target={isExternal ? '_blank' : '_self'} rel={isExternal ? 'noopener noreferrer' : ''}>
    <div className="flex items-center p-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer">
      <Icon className="h-5 w-5 mr-4 text-muted-foreground" />
      <span className="flex-1 font-medium text-foreground">{label}</span>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </div>
  </Link>
);

interface StatCardProps {
    icon: React.ElementType;
    title: string;
    subtitle: string;
    value: string;
    isFaded?: boolean;
    isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, subtitle, value, isFaded, isLoading }) => {
    if (isLoading) {
        return (
            <Card className="bg-card shadow-sm">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-3 w-16 mt-1" />
                        </div>
                    </div>
                    <Skeleton className="h-8 w-24 mt-3" />
                </CardContent>
            </Card>
        );
    }
    return (
        <Card className={cn("bg-card shadow-sm transition-all", isFaded && "opacity-40")}>
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", 
                        isFaded ? "bg-gray-200 dark:bg-gray-700" : "bg-orange-100 dark:bg-orange-900"
                    )}>
                        <Icon className={cn("h-5 w-5", isFaded ? "text-gray-400 dark:text-gray-500" : "text-orange-600 dark:text-orange-300")} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">{title}</p>
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    </div>
                </div>
                <p className="text-3xl font-bold text-foreground mt-3">{value}</p>
            </CardContent>
        </Card>
    );
}

export default function ProfilePage() {
  const { currentUser, logout, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState('');
  const [locationAddress, setLocationAddress] = useState('Loading location...');
  
  const [monthlyRecords, setMonthlyRecords] = useState<AttendanceRecord[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setSelectedDate(new Date());
  }, []);

  const fetchAttendanceData = useCallback(async (month: Date) => {
    if (!currentUser) return;
    setIsDataLoading(true);
    try {
        const records = await getAttendanceForMonth(month);
        setMonthlyRecords(records.filter(r => r.employeeId === currentUser.id));
    } catch (error) {
        console.error("Failed to fetch attendance:", error);
    } finally {
        setIsDataLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isClient) {
      setCurrentDate(format(new Date(), "eeee, d MMMM yyyy"));
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            if (!response.ok) throw new Error('Failed to fetch address');
            const data = await response.json();
            setLocationAddress(data.display_name || `Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}`);
          } catch (error) {
            setLocationAddress("Could not determine address");
          }
        }, () => {
          setLocationAddress("Location permission denied");
        });
      } else {
        setLocationAddress("Geolocation not supported");
      }
    }
  }, [isClient]);

  useEffect(() => {
    if (currentUser && selectedDate) {
        fetchAttendanceData(selectedDate);
    }
  }, [currentUser, selectedDate, fetchAttendanceData]);


  useEffect(() => {
    if (!isAuthLoading && !currentUser) {
      router.replace('/attendance/login');
    }
  }, [currentUser, isAuthLoading, router]);

  const attendanceStats = useMemo(() => {
    if (!selectedDate) return { checkIn: '--:--', checkOut: '--:--', workedHours: '0,00', absenceDays: 0, attendedDays: 0 };
    const today = new Date();
    const recordsForSelectedMonth = monthlyRecords.filter(r => isSameMonth(parseISO(r.date), selectedDate));
    const todaysRecord = recordsForSelectedMonth.find(r => isSameMonth(parseISO(r.date), today) && new Date(r.date).getDate() === today.getDate());

    const checkIn = todaysRecord ? format(parseISO(todaysRecord.checkInTime), 'HH:mm') : '--:--';
    const checkOut = todaysRecord?.checkOutTime ? format(parseISO(todaysRecord.checkOutTime), 'HH:mm') : '--:--';

    let totalSeconds = 0;
    recordsForSelectedMonth.forEach(record => {
      if (record.hoursWorked) {
        const parts = record.hoursWorked.split(':').map(Number);
        if (parts.length === 2) {
          totalSeconds += parts[0] * 3600 + parts[1] * 60;
        }
      }
    });
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const workedHours = `${hours},${String(minutes).padStart(2, '0')}`;
    
    const monthStart = startOfMonth(selectedDate);
    const totalDaysInMonth = getDaysInMonth(selectedDate);
    let workingDays = 0;
    for (let i = 1; i <= totalDaysInMonth; i++) {
        const day = getDay(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i));
        if (day !== 5 && day !== 6) { // Not Friday or Saturday
            workingDays++;
        }
    }
    
    const attendedDays = recordsForSelectedMonth.length;
    const absenceDays = Math.max(0, workingDays - attendedDays);

    return { checkIn, checkOut, workedHours, absenceDays, attendedDays };
  }, [monthlyRecords, selectedDate]);

  const handleMonthChange = (monthIndex: string) => {
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setMonth(parseInt(monthIndex, 10));
      setSelectedDate(newDate);
    }
  };

  const handleYearChange = (year: string) => {
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setFullYear(parseInt(year, 10));
      setSelectedDate(newDate);
    }
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


  if (isAuthLoading || !currentUser || !selectedDate) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 space-y-6 pb-28">
        
        {/* User Info Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                <AvatarImage src={currentUser?.avatarUrl || undefined} alt={currentUser?.name} />
                <AvatarFallback className="text-2xl bg-muted">{getInitials(currentUser?.name)}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{currentUser?.name}</h1>
                <p className="text-md text-muted-foreground">{currentUser?.email}</p>
              </div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {/* Attendance Summary Section */}
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2">
                    <Select value={selectedDate.getMonth().toString()} onValueChange={handleMonthChange}>
                        <SelectTrigger className="w-full sm:w-[150px] h-9 rounded-md border-gray-200 bg-white">
                            <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(month => (
                                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedDate.getFullYear().toString()} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-full sm:w-[120px] h-9 rounded-md border-gray-200 bg-white">
                            <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <p className="text-sm text-muted-foreground text-right">{currentDate}</p>
            </div>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200/50 py-1.5 px-3 max-w-full">
              <MapPin className="h-4 w-4 mr-2"/>
              <span className="truncate">{locationAddress}</span>
            </Badge>
            <div className="grid grid-cols-2 gap-4">
                <StatCard icon={ArrowDownLeft} title="Check In" subtitle="Today" value={attendanceStats.checkIn} isLoading={isDataLoading} />
                <StatCard icon={ArrowUpRight} title="Check Out" subtitle="Today" value={attendanceStats.checkOut} isFaded={attendanceStats.checkOut === '--:--'} isLoading={isDataLoading} />
                <StatCard icon={ArrowUp} title="Absence" subtitle="This Month" value={`${attendanceStats.absenceDays} Days`} isLoading={isDataLoading}/>
                <StatCard icon={ArrowUp} title="Attended" subtitle="This Month" value={`${attendanceStats.attendedDays} Days`} isLoading={isDataLoading}/>
            </div>
        </div>

        {/* Account Section */}
        <Card className="bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <ProfileLink href="#" icon={Bell} label="Notifications" />
            <ProfileLink href="/attendance/history" icon={CalendarClock} label="Leave History" />
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
}

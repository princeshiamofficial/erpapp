
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Plus, Heart, Sun, Check, Loader2 } from 'lucide-react';
import { format, getDaysInMonth, getDay, startOfMonth, addMonths, subMonths, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar2 as Calendar } from '@/components/ui/calendar2';
import { useAuth } from '@/contexts/auth-context';
import type { AttendanceRecord } from '@/types';
import { getAttendanceForMonth } from '@/lib/attendance-service';
import { Skeleton } from '@/components/ui/skeleton';

const WEEK_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const CalendarDay = ({ day, data }: { day: number | null; data?: { status: 'leave' | 'present' | 'holiday' | 'selected' | 'today' | 'late' } }) => {
    if (!day) {
        return <div className="w-10 h-10"></div>;
    }

    const baseClasses = "w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 text-sm";
    const iconClasses = "h-5 w-5";

    const styles = {
        leave: {
            container: "border-2 border-dashed border-red-400 bg-red-50 text-red-500",
            icon: <Heart className={cn(iconClasses, "text-red-500")} />
        },
        present: {
            container: "bg-transparent text-foreground",
            icon: <Check className={cn(iconClasses, "text-blue-500")} />
        },
        late: { // New style for Late
            container: "bg-transparent text-foreground",
            icon: <Check className={cn(iconClasses, "text-yellow-500")} />
        },
        holiday: {
            container: "bg-yellow-100 text-yellow-600",
            icon: <Sun className={cn(iconClasses, "text-yellow-600")} />
        },
        selected: {
            container: "bg-blue-600 text-white font-bold shadow-lg",
            icon: null
        },
        today: {
            container: "bg-green-100 border-2 border-green-400 text-green-700 font-bold",
            icon: null
        },
        default: {
            container: "bg-gray-100 dark:bg-gray-800 text-muted-foreground",
            icon: null
        }
    };
    
    const styleKey = data?.status || 'default';
    const style = styles[styleKey as keyof typeof styles] || styles.default;

    return (
        <div className={cn(baseClasses, style.container)}>
            {style.icon ? style.icon : <span>{day}</span>}
        </div>
    );
};

export default function AttendanceHistoryPage() {
    const { currentUser, isLoading: isAuthLoading } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [monthlyRecords, setMonthlyRecords] = useState<AttendanceRecord[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const fetchAttendanceData = useCallback(async (month: Date) => {
      if (!currentUser) return;
      setIsLoadingData(true);
      try {
        const records = await getAttendanceForMonth(month);
        setMonthlyRecords(records.filter(r => r.employeeId === currentUser.id));
      } catch (error) {
        console.error("Failed to fetch attendance:", error);
      } finally {
        setIsLoadingData(false);
      }
    }, [currentUser]);

    useEffect(() => {
        if (!isAuthLoading && currentUser) {
            fetchAttendanceData(currentMonth);
        }
    }, [currentMonth, currentUser, isAuthLoading, fetchAttendanceData]);

    const calendarGrid = useMemo(() => {
        const firstDayOfMonth = startOfMonth(currentMonth);
        const totalDays = getDaysInMonth(currentMonth);
        const startDayOfWeek = (getDay(firstDayOfMonth) + 6) % 7; 

        const days = Array.from({ length: totalDays }, (_, i) => i + 1);
        const emptyStartCells = Array.from({ length: startDayOfWeek }, () => null);
        const allCells = [...emptyStartCells, ...days];

        return allCells.map(day => {
            if (!day) return { day: null, data: undefined };

            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const record = monthlyRecords.find(r => isSameDay(parseISO(r.date), date));
            
            let status: 'leave' | 'present' | 'holiday' | 'selected' | 'today' | 'late' | undefined;
            
            if (isToday(date)) status = 'today';
            
            if (record) {
                if (record.status === 'Late') status = 'late';
                else if (record.status === 'On Time') status = 'present';
            }
            // Add holiday/leave logic here if available in your data
            // Example:
            // if (isHoliday(date)) status = 'holiday';
            // if (isLeave(date)) status = 'leave';
            
            return { day, data: status ? { status } : undefined };
        });
    }, [currentMonth, monthlyRecords]);

    const { workedHours, totalBreaks, overTime } = useMemo(() => {
        let totalSeconds = 0;
        monthlyRecords.forEach(record => {
            if (record.hoursWorked) {
                const parts = record.hoursWorked.split(':').map(Number);
                if (parts.length === 2) {
                    totalSeconds += parts[0] * 3600 + parts[1] * 60;
                }
            }
        });
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        return {
            workedHours: `${hours},${String(minutes).padStart(2, '0')}`,
            totalBreaks: "0,00", // Placeholder
            overTime: "0,00" // Placeholder
        };
    }, [monthlyRecords]);
    
    if (isAuthLoading || !currentUser) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    return (
        <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
            <header className="relative h-48 w-full bg-gradient-to-br from-pink-300 via-purple-300 to-indigo-400 p-6 text-white text-center flex flex-col justify-end items-center">
                 <div className="absolute top-4 left-4">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" asChild>
                      <Link href="/attendance">
                        <ArrowLeft className="h-5 w-5" />
                      </Link>
                    </Button>
                </div>
                <p className="text-sm opacity-80">Monthly worked hours</p>
                <h1 className="text-5xl font-bold tracking-tighter">{workedHours} h</h1>
            </header>

            <main className="flex-1 -mt-8">
                <div className="bg-background rounded-t-3xl shadow-2xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <h2 className="text-lg font-bold text-foreground">{format(currentMonth, "MMMM yyyy")}</h2>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                    
                    {isLoadingData ? (
                        <div className="grid grid-cols-7 gap-2">
                           {Array.from({ length: 35 }).map((_, index) => (
                              <Skeleton key={index} className="w-10 h-10 rounded-full" />
                           ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-2">
                            {WEEK_DAYS.map(day => (
                                <div key={day} className="text-center text-xs font-semibold text-muted-foreground">{day}</div>
                            ))}
                            {calendarGrid.map((item, index) => (
                                <CalendarDay key={index} day={item.day} data={item.data} />
                            ))}
                        </div>
                    )}

                    <div className="text-center mt-4">
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                            Show more <ChevronDown className="ml-1 h-4 w-4" />
                        </Button>
                    </div>

                    <div className="mt-6 flex items-center justify-between rounded-lg bg-red-100 p-4 text-red-700">
                        <p className="font-semibold text-sm">2 attendance are missing</p>
                        <button className="h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center">
                            <Plus className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="mt-6 space-y-3">
                        <div className="flex justify-between items-center text-foreground">
                            <span className="font-medium">Worked hours</span>
                            <span className="font-bold text-lg">{workedHours} h</span>
                        </div>
                         <div className="flex justify-between items-center text-foreground">
                            <span className="font-medium">Breaks</span>
                            <span className="font-bold text-lg">{totalBreaks} h</span>
                        </div>
                         <div className="flex justify-between items-center text-foreground">
                            <span className="font-medium">Over time</span>
                            <span className="font-bold text-lg">{overTime} h</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

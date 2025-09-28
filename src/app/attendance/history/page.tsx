
"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Plus, Heart, Sun, Check, Loader2, ChevronRight, ChevronLeft as ChevronLeftIcon } from 'lucide-react'; // Renamed ChevronLeft to avoid conflict
import { format, getDaysInMonth, getDay, startOfMonth, addMonths, subMonths, isToday, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar2 as Calendar } from '@/components/ui/calendar2';
import { useAuth } from '@/contexts/auth-context';
import type { AttendanceRecord } from '@/types';
import { getAttendanceForMonth } from '@/lib/attendance-service';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend as RechartsLegend } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";


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

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, payload, index, isMobile }: any) => {
  const labelRadiusMultiplier = isMobile ? 1.4 : 1.25;
  const lineLength1 = isMobile ? 10 : 15;
  const lineLength2 = isMobile ? 12 : 22;

  const radius = innerRadius + (outerRadius - innerRadius) * labelRadiusMultiplier;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const sin = Math.sin(-midAngle * RADIAN);
  const cos = Math.cos(-midAngle * RADIAN);
  const sx = cx + (outerRadius + (isMobile ? 3 : 5)) * cos;
  const sy = cy + (outerRadius + (isMobile ? 3 : 5)) * sin;
  const mx = cx + (outerRadius + lineLength1) * cos;
  const my = cy + (outerRadius + lineLength1) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * lineLength2;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';
  
  let labelText = `${payload.name} ${payload.value} days`;
  if (payload.name === 'Working Days') {
    labelText = `${payload.value} Working Days`;
  }

  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={"#8884d8"} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={"#8884d8"} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * (isMobile ? 4 : 6)} y={ey} textAnchor={textAnchor} fill="#333" dy={'.35em'} fontSize={isMobile ? 10 : 12} fontWeight="bold">{labelText}</text>
    </g>
  );
};


export default function AttendanceHistoryPage() {
    const { currentUser, isLoading: isAuthLoading } = useAuth();
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [monthlyRecords, setMonthlyRecords] = useState<AttendanceRecord[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
    const [isClient, setIsClient] = useState(false);
    const [isMobileView, setIsMobileView] = useState(false);
    const [isAttendanceListVisible, setIsAttendanceListVisible] = useState(false);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);


    useEffect(() => {
        setIsClient(true);
        const checkMobile = () => {
            setIsMobileView(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

    const sortedRecords = useMemo(() => {
        // Filter records for the current month being viewed
        const recordsForMonth = monthlyRecords.filter(record => 
            isSameMonth(parseISO(record.date), currentMonth)
        );
        return recordsForMonth.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }, [monthlyRecords, currentMonth]);

    const calendarGrid = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const totalDays = getDaysInMonth(currentMonth);
        const startingDayOfWeek = (getDay(start) + 6) % 7; // Monday is 0
        const grid = [];

        // Add blank cells for days before the start of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            grid.push({ day: null });
        }

        // Add days of the month
        for (let i = 1; i <= totalDays; i++) {
            const date = new Date(start.getFullYear(), start.getMonth(), i);
            const record = sortedRecords.find(r => isSameDay(parseISO(r.date), date));
            let status: 'leave' | 'present' | 'holiday' | 'selected' | 'today' | 'late' | undefined;
            
            if (isToday(date)) status = 'today';
            
            if (record) {
                if (record.status === 'Late') status = 'late';
                else if (record.status) status = 'present';
            }
            
            if (selectedDay && isSameDay(date, selectedDay)) {
                status = 'selected';
            }

            grid.push({
                day: i,
                date: date,
                data: { status }
            });
        }
        return grid;
    }, [currentMonth, sortedRecords, selectedDay]);
    
    const chartData = useMemo(() => {
        const onTime = sortedRecords.filter(r => r.status === 'On Time').length;
        const late = sortedRecords.filter(r => r.status === 'Late').length;
        const absent = 4; // Mock data from image
        const totalWorkingDays = 30; // Mock data from image
        const remainingWorkingDays = totalWorkingDays - onTime - late - absent;

        return [
            { name: 'On Time', value: 15, color: '#a3be8c' },
            { name: 'Late', value: 3, color: '#ebcb8b' },
            { name: 'Absent', value: 4, color: '#d08770' },
            { name: 'Working Days', value: 30 - 15 - 3 - 4, color: '#4c566a' },
        ];
    }, [sortedRecords]);

    const handleLongPressStart = () => {
        longPressTimer.current = setTimeout(() => {
            setIsAttendanceListVisible(true);
        }, 500); // 500ms for a long press
    };

    const handleLongPressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };


    if (isAuthLoading || !currentUser) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    return (
        <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
            <header className="relative h-20 w-full bg-gradient-to-br from-pink-300 via-purple-300 to-indigo-400 p-4 text-white text-center flex flex-col justify-center items-center rounded-b-xl">
                 <div className="absolute top-1/2 -translate-y-1/2 left-4">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" asChild>
                      <Link href="/attendance">
                        <ArrowLeft className="h-5 w-5" />
                      </Link>
                    </Button>
                </div>
                <h1 className="text-xl font-bold">Attendance History</h1>
            </header>

            <main className="flex-1 p-4 sm:p-6">
                <div className="bg-background rounded-xl shadow-lg p-4 sm:p-6">
                    <div className="flex justify-between items-center mb-4">
                        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                            <ChevronLeftIcon className="h-5 w-5" />
                        </Button>
                        <h2 className="text-lg font-bold text-foreground">{format(currentMonth, "MMMM yyyy")}</h2>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground mb-3">
                      {WEEK_DAYS.map(day => <div key={day}>{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {calendarGrid.map((dayInfo, index) => (
                           <div key={index} onClick={() => dayInfo.date && setSelectedDay(dayInfo.date)}>
                             <CalendarDay day={dayInfo.day} data={dayInfo.data} />
                           </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center mt-6 mb-4">
                      <h3 className="font-semibold text-lg">Your Attendance</h3>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-primary"
                        onMouseDown={handleLongPressStart}
                        onMouseUp={handleLongPressEnd}
                        onTouchStart={handleLongPressStart}
                        onTouchEnd={handleLongPressEnd}
                      >
                        Show more
                      </Button>
                    </div>
                    
                    {isAttendanceListVisible && (
                        <div className="space-y-3">
                        {isLoadingData ? (
                            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
                        ) : sortedRecords.length > 0 ? (
                        sortedRecords.map(record => {
                            const isSelected = selectedDay && isSameDay(parseISO(record.date), selectedDay);
                            const checkInTime = record.checkInTime ? format(parseISO(record.checkInTime), 'p') : '-';
                            const checkOutTime = record.checkOutTime ? format(parseISO(record.checkOutTime), 'p') : '-';
                            const totalHours = record.hoursWorked || '-';
                            
                            return (
                                <Card key={record.id} className={cn("transition-all", isSelected && "ring-2 ring-primary bg-primary/5")}>
                                    <CardContent className="p-3 flex items-center gap-3">
                                        <div className="text-center w-12 flex-shrink-0">
                                            <p className="font-bold text-lg">{format(parseISO(record.date), 'dd')}</p>
                                            <p className="text-xs text-muted-foreground">{format(parseISO(record.date), 'EEE')}</p>
                                        </div>
                                        <div className="border-l pl-3 flex-1 grid grid-cols-3 items-center text-center text-sm">
                                            <div className="flex flex-col items-center justify-center">
                                                <Badge className={cn(
                                                    record.status === 'On Time' && 'bg-green-100 text-green-800',
                                                    record.status === 'Late' && 'bg-yellow-100 text-yellow-800',
                                                    record.status === 'Absent' && 'bg-red-100 text-red-800'
                                                )}>{record.status}</Badge>
                                            </div>
                                            <div className="flex flex-col items-center justify-center">
                                                <p className="font-semibold text-foreground">{checkInTime} - {checkOutTime}</p>
                                                <p className="text-xs text-muted-foreground">Check-in/out</p>
                                            </div>
                                            <div className="flex flex-col items-center justify-center">
                                                <p className="font-semibold text-foreground">{totalHours}h</p>
                                                <p className="text-xs text-muted-foreground">Working Hours</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })
                        ) : (
                        <p className="text-center text-muted-foreground py-8">No attendance records for this month.</p>
                        )}
                        </div>
                    )}
                    <div className="flex flex-col items-center justify-center h-[500px] w-full p-0">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(props) => renderCustomizedLabel({...props, isMobile: isMobileView})}
                            outerRadius={isMobileView ? 80 : 150}
                            innerRadius={isMobileView ? 60 : 120}
                            fill="#8884d8"
                            dataKey="value"
                            >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            </Pie>
                        </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </main>
        </div>
    );
}

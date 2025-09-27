
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar3 as Calendar } from '@/components/ui/calendar3'; // Using the new calendar
import { format, subDays, startOfMonth, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { getAttendanceForMonth } from '@/lib/attendance-service';
import type { AttendanceRecord } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';


type AttendanceStatus = 'On Time' | 'Late' | 'Absent' | 'On Leave' | 'Holiday' | 'Working';


const STATUS_STYLES: Record<AttendanceStatus, { bg: string; text: string; dot: string }> = {
  'On Time': { bg: 'bg-lime-100 dark:bg-lime-900/40', text: 'text-lime-700 dark:text-lime-300', dot: '#84cc16' },
  'Late': { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-400', dot: '#f59e0b' },
  'Absent': { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-400', dot: '#f97316' },
  'On Leave': { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-400', dot: '#8b5cf6' },
  'Holiday': { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-400', dot: '#f43f5e' },
  'Working': { bg: 'bg-gray-200 dark:bg-gray-700/40', text: 'text-gray-700 dark:text-gray-300', dot: '#a1a1aa' },
};


const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, payload }: any) => {
  const radius = outerRadius * 1.3;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const textAnchor = x > cx ? 'start' : 'end';
  
  const lineRadiusStart = outerRadius * 1.1;
  const lineRadiusEnd = outerRadius * 1.25;
  const sx = cx + lineRadiusStart * Math.cos(-midAngle * RADIAN);
  const sy = cy + lineRadiusStart * Math.sin(-midAngle * RADIAN);
  const ex = cx + lineRadiusEnd * Math.cos(-midAngle * RADIAN);
  const ey = cy + lineRadiusEnd * Math.sin(-midAngle * RADIAN);
  
  return (
    <g>
      <path d={`M${sx},${sy}L${ex},${ey}`} stroke="#9ca3af" fill="none" />
      <text x={x} y={y} fill="#6b7280" textAnchor={textAnchor} dominantBaseline="central" className="text-xs font-medium">
        {`${payload.name} ${payload.name !== '30 working days' ? `${payload.value} days` : ''}`}
      </text>
    </g>
  );
};


// Custom Day component to render status tags
const DayWithStatus = ({ date, selected, event }: { date: Date; selected: boolean | undefined, event: AttendanceRecord | undefined }) => {
    
    const checkInTime = event?.checkInTime ? format(parseISO(event.checkInTime), 'h:mm a') : '';

    return (
        <div className={cn(
            "relative flex flex-col items-center justify-between p-1 w-full h-full rounded-md transition-colors",
            selected && "bg-primary/10 ring-2 ring-primary"
        )}>
            <span className={cn(
                "text-xs font-medium",
                selected ? "text-primary font-semibold" : "text-muted-foreground"
            )}>
                {date.getDate()}
            </span>
            {event && (
                <div className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-full w-full text-center truncate",
                    STATUS_STYLES[event.status].bg,
                    STATUS_STYLES[event.status].text
                )}>
                    {checkInTime}
                </div>
            )}
        </div>
    );
};

const LegendItem = ({ color, label }: { color: string, label: string }) => (
    <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }}></div>
        <span className="text-xs text-muted-foreground">{label}</span>
    </div>
);


export default function AttendanceHistoryPage() {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date()); 
  const [monthlyRecords, setMonthlyRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const fetchAttendance = useCallback(async (month: Date) => {
    setIsLoadingData(true);
    try {
      const records = await getAttendanceForMonth(month);
      setMonthlyRecords(records);
    } catch (e) {
      console.error("Failed to fetch attendance:", e);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !currentUser) {
      router.replace('/attendance/login');
    } else if (currentUser) {
       fetchAttendance(currentMonth);
    }
  }, [currentUser, isAuthLoading, router, currentMonth, fetchAttendance]);

  const userAttendanceEvents = useMemo(() => {
    if (!currentUser) return [];
    return monthlyRecords.filter(record => record.employeeId === currentUser.id);
  }, [monthlyRecords, currentUser]);

  const chartData = useMemo(() => {
    const summary = userAttendanceEvents.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {} as Record<AttendanceStatus, number>);

    return [
      { name: 'On Time', value: summary['On Time'] || 0, fill: STATUS_STYLES['On Time'].dot },
      { name: 'Late', value: summary['Late'] || 0, fill: STATUS_STYLES['Late'].dot },
      { name: 'Absent', value: summary['Absent'] || 0, fill: STATUS_STYLES['Absent'].dot },
    ];
  }, [userAttendanceEvents]);

  if (isAuthLoading || !currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-black p-4 pb-28">
        <style>{`
            body {
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none;  /* Internet Explorer 10+ */
            }
            body::-webkit-scrollbar {
                display: none; /* Safari and Chrome */
            }
        `}</style>
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-10 w-10" asChild>
                <Link href="/attendance">
                    <ArrowLeft className="h-5 w-5"/>
                </Link>
            </Button>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold text-foreground w-32 text-center">{format(currentMonth, 'MMMM')}</h1>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>
            <div className="w-10"></div>
        </div>
        
        {isLoadingData ? (
          <Skeleton className="w-full h-[400px] rounded-lg" />
        ) : (
          <Calendar
              mode="single"
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              selected={selectedDay}
              onSelect={setSelectedDay}
              className="w-full p-0 bg-transparent"
              components={{
                  Day: (props) => {
                      const eventForDay = userAttendanceEvents.find(e => isSameDay(parseISO(e.date), props.date));
                      return (
                          <DayWithStatus 
                              date={props.date} 
                              selected={props.selected}
                              event={eventForDay}
                          />
                      );
                  },
              }}
          />
        )}
        
        {isLoadingData ? (
           <Skeleton className="w-full h-64 rounded-lg" />
        ) : (
          <div className="relative h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie 
                          data={chartData} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={50} 
                          outerRadius={70} 
                          paddingAngle={2} 
                          dataKey="value"
                          labelLine={false}
                          label={renderCustomizedLabel}
                      >
                          {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />
                          ))}
                      </Pie>
                  </PieChart>
              </ResponsiveContainer>
          </div>
        )}

      </div>
    </div>
  );
}

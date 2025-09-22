
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar2 as Calendar } from '@/components/ui/calendar2';
import { format, subDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, ArrowLeft, X, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Mock data for demonstration
const MOCK_ATTENDANCE_DATA = [
  { date: new Date(), status: 'Present', inTime: '09:02 AM', outTime: '06:05 PM', totalHours: '9h 3m' },
  { date: subDays(new Date(), 1), status: 'Present', inTime: '08:58 AM', outTime: '06:01 PM', totalHours: '9h 3m' },
  { date: subDays(new Date(), 2), status: 'Partial', inTime: '10:30 AM', outTime: '04:00 PM', totalHours: '5h 30m' },
  { date: subDays(new Date(), 3), status: 'Present', inTime: '09:00 AM', outTime: '06:00 PM', totalHours: '9h 0m' },
  { date: subDays(new Date(), 4), status: 'Absent', inTime: '--:--', outTime: '--:--', totalHours: '0h 0m' },
  { date: subDays(new Date(), 8), status: 'Present', inTime: '09:10 AM', outTime: '06:15 PM', totalHours: '9h 5m' },
];

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'Present': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    case 'Partial': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    case 'Absent': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    default: return 'bg-gray-100 dark:bg-gray-800 text-gray-500';
  }
};

const DayWithAttendance = ({ date, dayEvents }: { date: Date; dayEvents: (typeof MOCK_ATTENDANCE_DATA) }) => {
    const isCurrentDay = isSameDay(date, new Date());
    const event = dayEvents.find(e => isSameDay(e.date, date));

    let statusIndicatorClass = '';
    if (event) {
        switch (event.status) {
            case 'Present': statusIndicatorClass = 'bg-green-500'; break;
            case 'Partial': statusIndicatorClass = 'bg-yellow-500'; break;
            case 'Absent': statusIndicatorClass = 'bg-red-500'; break;
            default: break;
        }
    }
    
    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "relative flex flex-col items-center justify-center p-1 w-full h-[100px] rounded-md transition-colors border border-border/30 shadow-sm",
                        event && "cursor-pointer hover:bg-accent/50",
                        isCurrentDay && "bg-primary/10 border-primary/50"
                    )}>
                        <span className={cn(
                            "text-xs font-medium mb-1",
                            isCurrentDay ? "text-primary font-semibold" : "text-muted-foreground"
                        )}>
                            {date.getDate()}
                        </span>
                        {event && (
                            <div className="flex-grow w-full mt-1 flex flex-col items-center justify-center text-center">
                                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", getStatusStyles(event.status))}>{event.status}</span>
                                <span className="text-[11px] text-muted-foreground mt-1">{event.inTime}</span>
                                <span className="text-[10px] text-muted-foreground">-</span>
                                <span className="text-[11px] text-muted-foreground">{event.outTime}</span>
                            </div>
                        )}
                        {event && <div className={cn("absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full", statusIndicatorClass)}></div>}
                    </div>
                </TooltipTrigger>
                {event && (
                    <TooltipContent>
                        <p className="font-semibold">{format(event.date, "PPP")}</p>
                        <p>Status: {event.status}</p>
                        <p>Total Hours: {event.totalHours}</p>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
};

export default function AttendanceHistoryPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 pb-28">
         <style>{`
            body {
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none;  /* Internet Explorer 10+ */
            }
            body::-webkit-scrollbar {
                display: none; /* Safari and Chrome */
            }
        `}</style>
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2" asChild>
                <Link href="/attendance">
                    <ArrowLeft className="h-5 w-5"/>
                </Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Attendance History</h1>
        </div>

        <Card className="bg-white dark:bg-gray-800/50 shadow-xl border-border/30 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary"/>
              My Records
            </CardTitle>
            <CardDescription>A complete log of your attendance for the selected month.</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
                mode="single"
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                className="w-full p-0"
                components={{
                    Day: (props) => (
                        <DayWithAttendance 
                            date={props.date} 
                            dayEvents={MOCK_ATTENDANCE_DATA}
                        />
                    ),
                }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

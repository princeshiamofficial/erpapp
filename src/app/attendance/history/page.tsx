
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, subDays, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar, Clock, CheckCircle2, AlertCircle, ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Mock data for demonstration
const MOCK_ATTENDANCE_DATA = [
  { date: subDays(new Date(), 1), status: 'Present', inTime: '09:02 AM', outTime: '06:05 PM', totalHours: '9h 3m' },
  { date: subDays(new Date(), 2), status: 'Present', inTime: '08:58 AM', outTime: '06:01 PM', totalHours: '9h 3m' },
  { date: subDays(new Date(), 3), status: 'Partial', inTime: '10:30 AM', outTime: '04:00 PM', totalHours: '5h 30m' },
  { date: subDays(new Date(), 4), status: 'Present', inTime: '09:00 AM', outTime: '06:00 PM', totalHours: '9h 0m' },
  { date: subDays(new Date(), 5), status: 'Absent', inTime: '--:--', outTime: '--:--', totalHours: '0h 0m' },
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

export default function AttendanceHistoryPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const calendarDays = Array.from({ length: 30 }).map((_, i) => subDays(new Date(), i)).reverse();

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 pb-28">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2" asChild>
                <Link href="/attendance/home">
                    <ArrowLeft className="h-5 w-5"/>
                </Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Attendance History</h1>
        </div>

        <Card className="bg-white dark:bg-gray-800 shadow-md">
          <CardHeader>
            <CardTitle>My Records</CardTitle>
            <CardDescription>A complete log of your attendance.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Calendar Strip */}
            <div className="mb-6">
              <ScrollArea className="w-full whitespace-nowrap rounded-md custom-scrollbar-hidden">
                <div className="flex space-x-3 pb-4">
                  {calendarDays.map(day => {
                    const record = MOCK_ATTENDANCE_DATA.find(d => format(d.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
                    const isSelected = format(selectedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
                    return (
                      <button
                        key={day.toString()}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 h-20 w-16 rounded-lg border-2 transition-all",
                          isSelected ? 'border-primary bg-primary/10' : 'border-transparent bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700',
                          record && getStatusStyles(record.status)
                        )}
                      >
                        <span className={cn("text-xs font-medium", isSelected ? 'text-primary' : 'text-gray-500 dark:text-gray-400')}>{format(day, 'EEE')}</span>
                        <span className={cn("text-lg font-bold mt-1", isSelected ? 'text-primary' : 'text-gray-800 dark:text-gray-200')}>{format(day, 'd')}</span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
            
            {/* Record List */}
            <div className="space-y-3">
              {MOCK_ATTENDANCE_DATA.map((record, index) => (
                 <Card key={index} className="flex items-center p-4">
                    <div className="mr-4">
                      {record.status === 'Present' && <CheckCircle2 className="h-8 w-8 text-green-500" />}
                      {record.status === 'Partial' && <AlertCircle className="h-8 w-8 text-yellow-500" />}
                      {record.status === 'Absent' && <X className="h-8 w-8 text-red-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{format(record.date, 'eeee, MMMM d')}</p>
                      <p className={cn("text-sm font-medium", getStatusStyles(record.status))}>{record.status}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">{record.inTime} - {record.outTime}</p>
                      <p className="font-semibold">{record.totalHours}</p>
                    </div>
                 </Card>
              ))}
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

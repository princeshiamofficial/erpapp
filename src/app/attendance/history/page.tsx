
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar3 as Calendar } from '@/components/ui/calendar3'; // Using the new calendar
import { format, subDays, startOfMonth, addMonths, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

type AttendanceStatus = 'On Time' | 'Late' | 'Absent' | 'On Leave' | 'Holiday' | 'Working';

interface MockAttendanceEvent {
    date: Date;
    status: AttendanceStatus;
}

// More comprehensive mock data based on the image
const MOCK_ATTENDANCE_DATA: MockAttendanceEvent[] = [
  { date: new Date(2024, 8, 1), status: 'Late' },
  { date: new Date(2024, 8, 2), status: 'On Time' },
  { date: new Date(2024, 8, 3), status: 'On Time' },
  { date: new Date(2024, 8, 4), status: 'On Time' },
  { date: new Date(2024, 8, 5), status: 'Absent' },
  { date: new Date(2024, 8, 6), status: 'On Time' },
  { date: new Date(2024, 8, 7), status: 'On Time' },
  { date: new Date(2024, 8, 8), status: 'Late' },
  { date: new Date(2024, 8, 9), status: 'On Time' },
  { date: new Date(2024, 8, 10), status: 'Late' },
  { date: new Date(2024, 8, 11), status: 'On Time' },
  { date: new Date(2024, 8, 12), status: 'Absent' },
  { date: new Date(2024, 8, 13), status: 'On Time' },
  { date: new Date(2024, 8, 14), status: 'On Time' },
  { date: new Date(2024, 8, 15), status: 'On Time' },
  { date: new Date(2024, 8, 16), status: 'On Time' },
  { date: new Date(2024, 8, 17), status: 'On Time' },
  { date: new Date(2024, 8, 18), status: 'Absent' },
  { date: new Date(2024, 8, 19), status: 'Absent' },
  { date: new Date(2024, 8, 20), status: 'On Time' },
  { date: new Date(2024, 8, 21), status: 'On Time' },
  { date: new Date(2024, 8, 22), status: 'On Time' }, // Selected day
];


const STATUS_STYLES: Record<AttendanceStatus, { bg: string; text: string; dot: string }> = {
  'On Time': { bg: 'bg-lime-100 dark:bg-lime-900/40', text: 'text-lime-700 dark:text-lime-300', dot: '#84cc16' },
  'Late': { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-400', dot: '#f59e0b' },
  'Absent': { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-400', dot: '#f97316' },
  'On Leave': { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-400', dot: '#8b5cf6' },
  'Holiday': { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-400', dot: '#f43f5e' },
  'Working': { bg: 'bg-gray-200 dark:bg-gray-700/40', text: 'text-gray-700 dark:text-gray-300', dot: '#a1a1aa' },
};


const chartData = [
  { name: 'On Time', value: 10, fill: '#A3CC39' },
  { name: 'Late', value: 10, fill: '#F2C94C' },
  { name: 'Working days', value: 10, fill: '#4F4F4F' },
  { name: 'Absent', value: 10, fill: '#F2994A' },
];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
  const radius = outerRadius + 25; // Move labels further out
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const textAnchor = x > cx ? 'start' : 'end';

  // Only show the label for "Working days" and position it at the bottom
  if (payload.name === 'Working days') {
    return (
       <text x={cx} y={cy + outerRadius + 40} textAnchor="middle" dominantBaseline="central" className="text-sm font-semibold fill-gray-600 dark:fill-gray-400">
        {`30 working days`}
      </text>
    );
  }
  
  return (
    <text x={x} y={y} fill="#6b7280" textAnchor={textAnchor} dominantBaseline="central" className="text-xs font-medium">
      {`${payload.name} 10 days`}
    </text>
  );
};


// Custom Day component to render status tags
const DayWithStatus = ({ date, selected }: { date: Date; selected: boolean | undefined }) => {
    const event = MOCK_ATTENDANCE_DATA.find(e => format(e.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
    
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
                    {event.status}
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
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date(2024, 8, 22));
  const [currentMonth, setCurrentMonth] = useState(new Date(2024, 8, 1)); // September 2024 for mock data

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

        <Calendar
            mode="single"
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            selected={selectedDay}
            onSelect={setSelectedDay}
            className="w-full p-0 bg-transparent"
            components={{
                Day: (props) => (
                    <DayWithStatus 
                        date={props.date} 
                        selected={props.selected}
                    />
                ),
            }}
        />

        <div className="relative h-56 w-full">
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
                        labelLine={true}
                        label={renderCustomizedLabel}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}


"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Plus } from 'lucide-react';
import { format, getDaysInMonth, getDay, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { Heart, Sun, Check } from 'lucide-react';

const WEEK_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const CalendarDay = ({ day, data }: { day: number | null; data?: { status: 'leave' | 'present' | 'holiday' | 'selected' | 'today' } }) => {
    if (!day) {
        return <div className="w-10 h-10"></div>;
    }

    const baseClasses = "w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200";
    const iconClasses = "h-4 w-4";

    const styles = {
        leave: {
            container: "border-2 border-dashed border-red-400 bg-red-50 text-red-500",
            icon: <Heart className={cn(iconClasses, "text-red-500")} />
        },
        present: {
            container: "bg-transparent text-foreground",
            icon: <Check className={cn(iconClasses, "text-blue-500")} />
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
            container: "bg-green-100 border-2 border-green-400 text-green-700",
            icon: null
        },
        default: {
            container: "bg-gray-100 dark:bg-gray-800 text-muted-foreground",
            icon: null
        }
    };
    
    const style = data ? styles[data.status] : styles.default;

    return (
        <div className={cn(baseClasses, style.container)}>
            {style.icon ? style.icon : <span>{day}</span>}
        </div>
    );
};


export default function AttendanceHistoryPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const calendarGrid = useMemo(() => {
        const firstDayOfMonth = startOfMonth(currentMonth);
        const totalDays = getDaysInMonth(currentMonth);
        // getDay returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday. We adjust to have Monday as 0.
        const startDayOfWeek = (getDay(firstDayOfMonth) + 6) % 7; 

        const days = Array.from({ length: totalDays }, (_, i) => i + 1);
        const emptyStartCells = Array.from({ length: startDayOfWeek }, () => null);
        const allCells = [...emptyStartCells, ...days];

        // This is where you would map your actual data to the day
        const mockData: { [key: number]: { status: 'leave' | 'present' | 'holiday' | 'selected' | 'today' } } = {
            3: { status: 'leave' }, 4: { status: 'leave' }, 5: { status: 'leave' }, 6: { status: 'leave' },
            7: { status: 'present' },
            10: { status: 'leave' }, 11: { status: 'leave' },
            12: { status: 'present' },
            13: { status: 'selected' },
            17: { status: 'today' },
            20: { status: 'holiday' }, 21: { status: 'holiday' },
        };

        return allCells.map((day, index) => ({
            day,
            data: day ? mockData[day] : undefined
        }));
    }, [currentMonth]);

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
                <h1 className="text-5xl font-bold tracking-tighter">172,50 h</h1>
            </header>

            <main className="flex-1 -mt-8">
                <div className="bg-background rounded-t-3xl shadow-2xl p-6">
                    <h2 className="text-lg font-bold text-foreground mb-4">{format(currentMonth, "MMMM yyyy")} Overview</h2>
                    
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {WEEK_DAYS.map(day => (
                            <div key={day} className="text-center text-xs font-semibold text-muted-foreground">{day}</div>
                        ))}
                        {calendarGrid.map((item, index) => (
                            <CalendarDay key={index} day={item.day} data={item.data} />
                        ))}
                    </div>

                    <div className="text-center mt-4">
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                            Show more <ChevronDown className="ml-1 h-4 w-4" />
                        </Button>
                    </div>

                    {/* Attendance Missing Banner */}
                    <div className="mt-6 flex items-center justify-between rounded-lg bg-red-100 p-4 text-red-700">
                        <p className="font-semibold text-sm">2 attendance are missing</p>
                        <button className="h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center">
                            <Plus className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Stats List */}
                    <div className="mt-6 space-y-3">
                        <div className="flex justify-between items-center text-foreground">
                            <span className="font-medium">Worked hours</span>
                            <span className="font-bold text-lg">172,50 h</span>
                        </div>
                         <div className="flex justify-between items-center text-foreground">
                            <span className="font-medium">Breaks</span>
                            <span className="font-bold text-lg">12,00 h</span>
                        </div>
                         <div className="flex justify-between items-center text-foreground">
                            <span className="font-medium">Over time</span>
                            <span className="font-bold text-lg">3,40 h</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}




"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { DailyRoutine, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getRoutinesAction, toggleRoutineTaskAction } from './actions';
import { format, addDays, startOfWeek, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

const routineHeaders = [
    { title: "Weakup (Sleep)", time: "5:00 AM", id: "wakeup", color: "bg-green-100 dark:bg-green-900/30" },
    { title: "Namaz (Fazar)", time: "5:00 AM to 5:45 AM", id: "namaz_fazar", color: "bg-green-100 dark:bg-green-900/30" },
    { title: "Morning Walk", time: "6:00 AM to 7:00 AM", id: "morning_walk", color: "bg-blue-100 dark:bg-blue-900/30" },
    { title: "Quarn Telwat", time: "7:00 AM to 7:30 AM", id: "quran_tilawat", color: "bg-yellow-100 dark:bg-yellow-900/30" },
    { title: "Morning Working", time: "7:30 AM to 8:30 AM", id: "morning_working", color: "bg-gray-200 dark:bg-gray-700/30" },
    { title: "Breakfast", time: "8:30 AM to 9:00 AM", id: "breakfast", color: "bg-green-100 dark:bg-green-900/30" },
    { title: "Office Work (Morning Part)", time: "9:00 AM to 1:00 PM", id: "office_work_morning", color: "bg-green-100 dark:bg-green-900/30" },
    { title: "Namaz (Zohor)", time: "1:00 PM to 1:30 PM", id: "namaz_zohor", color: "bg-green-100 dark:bg-green-900/30" },
    { title: "Lunch", time: "1:30 PM to 2:00 PM", id: "lunch", color: "bg-yellow-100 dark:bg-yellow-900/30" },
    { title: "Office Work (Evening Part)", time: "1:30 PM to 2:00 PM", id: "office_work_evening_1", color: "bg-green-100 dark:bg-green-900/30" },
    { title: "Namaz (Asar)", time: "4:15 PM to 4:45 PM", id: "namaz_asar", color: "bg-green-100 dark:bg-green-900/30" },
    { title: "Evening Business Office Work", time: "5:00 PM to 5:45 PM", id: "evening_business", color: "bg-gray-200 dark:bg-gray-700/30" },
    { title: "Namaz (Magrib)", time: "5:45 PM to 6:15 PM", id: "namaz_magrib", color: "bg-green-100 dark:bg-green-900/30" },
    { title: "Night Business Office Work", time: "6:15 PM to 8:30 PM", id: "night_business_1", color: "bg-gray-800 text-white" },
    { title: "Namaz (Esha)", time: "8:30 PM to 9:00 PM", id: "namaz_esha", color: "bg-yellow-100 dark:bg-yellow-900/30" },
    { title: "Night Business Office Work", time: "9:00 PM to 10:00 PM", id: "night_business_2", color: "bg-gray-800 text-white" },
    { title: "Dinner", time: "10:15 PM to 10:45 PM", id: "dinner", color: "bg-gray-200 dark:bg-gray-700/30" },
    { title: "Learning", time: "10:45 PM to 11:30 PM", id: "learning", color: "bg-blue-100 dark:bg-blue-900/30" },
    { title: "Sleeping", time: "11:30 PM to 4:30 PM", id: "sleeping", color: "bg-gray-800 text-white" },
    { title: "Remarks", time: "", id: "remarks", color: "bg-gray-400/50 dark:bg-gray-600/50" },
];


export default function MyDailyRoutinePage() {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [routinesData, setRoutinesData] = useState<Record<string, DailyRoutine>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const fetchedRoutines = await getRoutinesAction(currentUser.id);
      const routinesMap = fetchedRoutines.reduce((acc, routine) => {
        acc[routine.id] = routine;
        return acc;
      }, {} as Record<string, DailyRoutine>);
      setRoutinesData(routinesMap);
    } catch (error) {
      console.error("Error fetching routines:", error);
      toast({ title: "Error", description: "Could not load your daily routines.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (!isAuthLoading && currentUser) {
      fetchData();
    } else if (!isAuthLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isAuthLoading, router, fetchData]);

  const handleToggleTask = async (date: Date, taskId: string) => {
    if (!currentUser) return;

    const dateKey = format(date, 'yyyy-MM-dd');
    const originalState = { ...routinesData };

    // Optimistic UI update
    setRoutinesData(prev => {
        const newRoutines = { ...prev };
        const dayRoutine = newRoutines[dateKey] || { id: dateKey, userId: currentUser.id, completedTasks: [], updatedAt: new Date().toISOString() };
        const taskIndex = dayRoutine.completedTasks.indexOf(taskId);
        if (taskIndex > -1) {
            dayRoutine.completedTasks = dayRoutine.completedTasks.filter(t => t !== taskId);
        } else {
            dayRoutine.completedTasks = [...dayRoutine.completedTasks, taskId];
        }
        newRoutines[dateKey] = dayRoutine;
        return newRoutines;
    });

    const result = await toggleRoutineTaskAction(currentUser.id, dateKey, taskId);

    if (!result.success) {
        toast({ title: "Update Failed", description: result.error, variant: "destructive" });
        setRoutinesData(originalState); // Revert on failure
    } else {
      // We can optionally refresh from server to be sure, but optimistic is usually enough for this UI
      // fetchData(); 
    }
  };
  
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);


  if (isAuthLoading || !currentUser) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  return (
    <div className="space-y-4 p-1 sm:p-4">
       <div className="flex justify-between items-center bg-card p-2 rounded-md">
        <Button onClick={() => setCurrentWeekStart(subDays(currentWeekStart, 7))} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Previous Week
        </Button>
        <h2 className="text-lg font-semibold text-center">
          {format(currentWeekStart, "MMMM d")} - {format(addDays(currentWeekStart, 6), "MMMM d, yyyy")}
        </h2>
        <Button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))} variant="outline">
          Next Week <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

       <div className="overflow-x-auto bg-card p-2 rounded-lg shadow-sm">
        <table className="w-full border-collapse">
            <thead>
                <tr>
                    <th className="border p-1 align-top bg-orange-200 dark:bg-orange-800/50 w-32 min-w-[128px]">
                        Date with Day
                    </th>
                    {routineHeaders.map(header => (
                        <th key={header.id} className={cn("border p-1 text-center font-semibold text-sm", header.color)}>
                            <div className="flex flex-col h-full justify-between min-h-[5rem]">
                                <span>{header.title}</span>
                                <span className="font-normal text-xs">{header.time}</span>
                            </div>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {weekDays.map(date => {
                    const dateKey = format(date, 'yyyy-MM-dd');
                    const dayRoutine = routinesData[dateKey];
                    return (
                        <tr key={dateKey} className="hover:bg-muted/30">
                            <td className="border p-2 text-center bg-orange-200 dark:bg-orange-800/50">
                                <p className="font-semibold text-sm">{format(date, 'dd/MM/yy')}</p>
                                <p className="text-xs">{format(date, 'EEEE')}</p>
                            </td>
                            {routineHeaders.map(header => (
                                <td key={`${dateKey}-${header.id}`} className="border p-2 text-center align-middle">
                                    {header.id !== 'remarks' ? (
                                        <Checkbox
                                            checked={dayRoutine?.completedTasks.includes(header.id)}
                                            onCheckedChange={() => handleToggleTask(date, header.id)}
                                            aria-label={`Mark ${header.title} as completed for ${format(date, 'PPP')}`}
                                            className="h-5 w-5"
                                        />
                                    ) : (
                                        <div className="w-full h-full min-w-[100px]"></div> // Placeholder for remarks input
                                    )}
                                </td>
                            ))}
                        </tr>
                    )
                })}
            </tbody>
        </table>
       </div>
    </div>
  );
}

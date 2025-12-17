
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ArrowRight, PlusCircle, Edit, Trash2, ClipboardList, Printer } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { DailyRoutine, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getRoutinesAction, toggleRoutineTaskAction, getRoutineHeadersAction, deleteRoutineAction } from './actions';
import { format, addDays, startOfWeek, subDays, parse, differenceInMinutes, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { AddEditRoutineDialog } from '@/components/daily-routine/AddEditRoutineDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from '@/components/ui/card';
import { getContrastTextColor } from '@/lib/status-service';


// Helper function to format time string to AM/PM
const formatTime12Hour = (timeStr?: string): string => {
  if (!timeStr) return '';
  const parts = timeStr.split(' to ');
  return parts.map(part => {
    if (!part.includes(':')) return part; // Return as is if not a valid time format
    try {
      const [hours, minutes] = part.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return format(date, "hh:mm a");
    } catch (e) {
      return part; // Return original part on parsing error
    }
  }).join(' to ');
};


export default function MyDailyRoutinePage() {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [routinesData, setRoutinesData] = useState<Record<string, DailyRoutine>>({});
  const [routineHeaders, setRoutineHeaders] = useState<DailyRoutine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [routineToEdit, setRoutineToEdit] = useState<DailyRoutine | null>(null);
  const [routineToDelete, setRoutineToDelete] = useState<DailyRoutine | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [fetchedRoutines, fetchedHeaders] = await Promise.all([
        getRoutinesAction(currentUser.id),
        getRoutineHeadersAction(currentUser.id)
      ]);
      
      const routinesMap = fetchedRoutines.reduce((acc, routine) => {
        acc[routine.id] = routine; // The ID of a daily record is its date string 'YYYY-MM-DD'
        return acc;
      }, {} as Record<string, DailyRoutine>);
      setRoutinesData(routinesMap);
      
      setRoutineHeaders(fetchedHeaders);

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
    const dayRoutine = originalState[dateKey];
    
    let isCurrentlyChecked = false;
    if (dayRoutine?.completedTasks) {
        if (typeof dayRoutine.completedTasks === 'object' && dayRoutine.completedTasks[taskId]) {
            isCurrentlyChecked = true;
        } else if (Array.isArray(dayRoutine.completedTasks) && dayRoutine.completedTasks.includes(taskId)) {
            isCurrentlyChecked = true;
        }
    }

    if (isCurrentlyChecked && typeof dayRoutine.completedTasks === 'object' && dayRoutine.completedTasks[taskId]) {
      const checkedTimestamp = parseISO(dayRoutine.completedTasks[taskId]);
      const minutesSinceChecked = differenceInMinutes(new Date(), checkedTimestamp);
      
      if (minutesSinceChecked > 20) {
        // Silently block the action
        return;
      }
    }

    // Optimistic UI update
    setRoutinesData(prev => {
        const newRoutines = { ...prev };
        const currentDayRoutine = newRoutines[dateKey] || { id: dateKey, userId: currentUser.id, completedTasks: {}, updatedAt: new Date().toISOString() };
        
        let updatedTasks: Record<string, string>;

        if (typeof currentDayRoutine.completedTasks === 'object' && currentDayRoutine.completedTasks !== null) {
            updatedTasks = { ...currentDayRoutine.completedTasks };
        } else if (Array.isArray(currentDayRoutine.completedTasks)) {
            // Convert legacy array to new object format
            updatedTasks = currentDayRoutine.completedTasks.reduce((acc, id) => {
                acc[id] = new Date().toISOString(); // Assign a placeholder timestamp
                return acc;
            }, {} as Record<string, string>);
        } else {
            updatedTasks = {};
        }

        if (updatedTasks[taskId]) {
            delete updatedTasks[taskId]; // Uncheck
        } else {
            updatedTasks[taskId] = new Date().toISOString(); // Check
        }
        
        newRoutines[dateKey] = { ...currentDayRoutine, completedTasks: updatedTasks };
        return newRoutines;
    });

    const result = await toggleRoutineTaskAction(currentUser.id, dateKey, taskId);

    if (!result.success) {
        toast({ title: "Update Failed", description: result.error, variant: "destructive" });
        setRoutinesData(originalState); // Revert on failure
    }
  };
  
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = [];
    for (let i = 0; i <= differenceInMinutes(end, start) / (60 * 24); i++) {
        days.push(addDays(start, i));
    }
    return days;
  }, [currentMonth]);

  const handleRoutineSaved = () => {
    toast({ title: "Success", description: "Your routine list has been updated." });
    fetchData(); // Refetch all data to ensure consistency
    setIsAddEditDialogOpen(false);
    setRoutineToEdit(null);
  };
  
  const openAddDialog = () => {
    setRoutineToEdit(null);
    setIsAddEditDialogOpen(true);
  };

  const openEditDialog = (routine: DailyRoutine) => {
    setRoutineToEdit(routine);
    setIsAddEditDialogOpen(true);
  };

  const confirmDeleteRoutine = async () => {
    if (!routineToDelete || !currentUser) return;
    setIsDeleting(true);
    const result = await deleteRoutineAction(routineToDelete.id, currentUser.id);
    if (result.success) {
      toast({ title: "Routine Deleted", description: `"${routineToDelete.title}" has been removed.` });
      fetchData();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsDeleting(false);
    setRoutineToDelete(null);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isAuthLoading || !currentUser) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  return (
    <>
      <div className="space-y-4 p-1 sm:p-4 printable-area">
        <div className="flex justify-between items-center bg-card p-2 rounded-md no-print">
          <Button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Previous Month
          </Button>
          <h2 className="text-lg font-semibold text-center">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2"/> Print
            </Button>
            <Button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} variant="outline">
              Next Month <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="overflow-x-auto bg-card p-2 rounded-lg shadow-sm">
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : routineHeaders.length > 0 ? (
          <div className="h-[calc(100vh-12rem)] overflow-auto custom-scrollbar border rounded-lg">
            <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                    <tr>
                        <th className="sticky left-0 z-20 border p-2 align-top bg-orange-200 dark:bg-orange-800/50 w-32 min-w-[128px]">
                            <p className="font-semibold text-sm">Date With Day</p>
                        </th>
                        {routineHeaders.map(header => {
                           const textColor = getContrastTextColor(header.color || '#f3f4f6');
                           return (
                            <th key={header.id} className="border p-1 text-center font-semibold text-sm group relative" style={{ backgroundColor: header.color || '#f3f4f6' }}>
                                <div className="flex flex-col items-center justify-center gap-1 h-full min-h-[5rem] px-1">
                                    <span style={{ color: textColor }} className="text-center">{header.title}</span>
                                    <span className="font-normal text-xs text-center" style={{ color: textColor, opacity: 0.8 }}>({formatTime12Hour(header.time)})</span>
                                </div>
                                <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                                  <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/20" onClick={() => openEditDialog(header)}><Edit className="h-3 w-3" style={{ color: textColor }}/></Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/20" onClick={() => setRoutineToDelete(header)}><Trash2 className="h-3 w-3" style={{ color: textColor }}/></Button>
                                </div>
                            </th>
                           )
                        })}
                        <th className="border p-2 align-top bg-muted/50 w-24 min-w-[96px] no-print">
                          <Button size="sm" className="w-full h-full" onClick={openAddDialog}>
                            <PlusCircle className="h-4 w-4 mr-1 sm:mr-2"/>
                            <span className="hidden sm:inline">New</span>
                          </Button>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {monthDays.map(date => {
                        const dateKey = format(date, 'yyyy-MM-dd');
                        const dayRoutine = routinesData[dateKey];
                        return (
                            <tr key={dateKey} className="hover:bg-muted/30">
                                <td className="sticky left-0 border p-2 text-center bg-orange-200 dark:bg-orange-800/50 z-10">
                                    <p className="font-semibold text-sm">{format(date, 'dd/MM/yy')}</p>
                                    <p className="text-xs">{format(date, 'EEEE')}</p>
                                </td>
                                {routineHeaders.map(header => {
                                    let isChecked = false;
                                    if (dayRoutine?.completedTasks) {
                                        if (typeof dayRoutine.completedTasks === 'object' && dayRoutine.completedTasks[header.id]) {
                                            isChecked = true;
                                        } else if (Array.isArray(dayRoutine.completedTasks) && dayRoutine.completedTasks.includes(header.id)) {
                                            isChecked = true;
                                        }
                                    }
                                    return (
                                        <td key={`${dateKey}-${header.id}`} className="border p-2 text-center align-middle">
                                            <Checkbox
                                                checked={isChecked}
                                                onCheckedChange={() => handleToggleTask(date, header.id)}
                                                aria-label={`Mark ${header.title} as completed for ${format(date, 'PPP')}`}
                                                className="h-5 w-5"
                                            />
                                        </td>
                                    )
                                })}
                                <td className="border p-2 no-print"></td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
          </div>
        ) : (
          <Card className="md:col-span-2 lg:col-span-3">
             <CardContent className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground">
               <ClipboardList className="h-12 w-12 mb-4 opacity-50" />
               <p className="text-lg font-semibold">No routines yet!</p>
               <p className="text-sm">Click "Add New" to get started.</p>
                <Button onClick={openAddDialog} size="sm" className="mt-4">
                  <PlusCircle className="h-4 w-4 mr-2"/> Add Routine
                </Button>
             </CardContent>
           </Card>
        )}
      </div>
      <AddEditRoutineDialog
        isOpen={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        onRoutineSaved={handleRoutineSaved}
        routine={routineToEdit}
        currentUser={currentUser}
      />
      {routineToDelete && (
        <AlertDialog open={!!routineToDelete} onOpenChange={() => setRoutineToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the routine "<span className="font-semibold">{routineToDelete.title}</span>". This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRoutineToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteRoutine} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Deleting...</> : 'Delete Routine'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
       <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0.5cm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .printable-area {
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            font-size: 10px; /* Smaller font for print */
          }
          th, td {
            padding: 2px 4px;
          }
          th.no-print, td.no-print {
            display: none;
          }
          button {
            display: none;
          }
          /* Force checkbox appearance for printing */
          [data-state="checked"] {
            background-color: hsl(var(--primary)) !important;
            border-color: hsl(var(--primary)) !important;
          }
          [data-state="checked"] svg {
            color: hsl(var(--primary-foreground)) !important;
          }
          [type="checkbox"] {
            border-color: hsl(var(--primary)) !important;
            color: hsl(var(--primary)) !important; /* For the checkmark */
          }
        }
      `}</style>
    </>
  );
}

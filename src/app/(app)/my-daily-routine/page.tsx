
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ArrowRight, PlusCircle, Edit, Trash2, ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { DailyRoutine, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getRoutinesAction, toggleRoutineTaskAction, getRoutineHeadersAction, deleteRoutineAction } from './actions';
import { format, addDays, startOfWeek, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { AddEditRoutineDialog } from '@/components/daily-routine/AddEditRoutineDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from '@/components/ui/card';


export default function MyDailyRoutinePage() {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [routinesData, setRoutinesData] = useState<Record<string, DailyRoutine>>({});
  const [routineHeaders, setRoutineHeaders] = useState<DailyRoutine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday

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
        acc[routine.id] = routine;
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

    // Optimistic UI update
    setRoutinesData(prev => {
        const newRoutines = { ...prev };
        const dayRoutine = newRoutines[dateKey] || { id: dateKey, userId: currentUser.id, completedTasks: [], updatedAt: new Date().toISOString() };
        const taskIndex = (dayRoutine.completedTasks || []).indexOf(taskId);
        if (taskIndex > -1) {
            dayRoutine.completedTasks = (dayRoutine.completedTasks || []).filter(t => t !== taskId);
        } else {
            dayRoutine.completedTasks = [...(dayRoutine.completedTasks || []), taskId];
        }
        newRoutines[dateKey] = dayRoutine;
        return newRoutines;
    });

    const result = await toggleRoutineTaskAction(currentUser.id, dateKey, taskId);

    if (!result.success) {
        toast({ title: "Update Failed", description: result.error, variant: "destructive" });
        setRoutinesData(originalState); // Revert on failure
    }
  };
  
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const handleRoutineSaved = (savedRoutine: DailyRoutine, isEdit: boolean) => {
    toast({ title: `Routine ${isEdit ? 'Updated' : 'Added'}`, description: `"${savedRoutine.title}" has been saved.` });
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


  if (isAuthLoading || !currentUser) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  return (
    <>
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

        {isLoading ? (
          <div className="overflow-x-auto bg-card p-2 rounded-lg shadow-sm">
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : routineHeaders.length > 0 ? (
          <div className="overflow-x-auto bg-card p-2 rounded-lg shadow-sm">
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className="border p-1 align-top bg-orange-200 dark:bg-orange-800/50 w-32 min-w-[128px]">
                          <Button onClick={openAddDialog} size="sm" className="w-full">
                            <PlusCircle className="h-4 w-4 mr-2"/> Add Routine
                          </Button>
                        </th>
                        {routineHeaders.map(header => (
                            <th key={header.id} className="border p-1 text-center font-semibold text-sm group relative" style={{ backgroundColor: header.color }}>
                                <div className="flex flex-col h-full justify-between min-h-[5rem]">
                                    <span className="text-white">{header.title}</span>
                                    <span className="font-normal text-xs text-white/80">{header.time}</span>
                                </div>
                                <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => openEditDialog(header)}><Edit className="h-3 w-3"/></Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => setRoutineToDelete(header)}><Trash2 className="h-3 w-3"/></Button>
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
                                                checked={(dayRoutine?.completedTasks || []).includes(header.id)}
                                                onCheckedChange={() => handleToggleTask(date, header.id)}
                                                aria-label={`Mark ${header.title} as completed for ${format(date, 'PPP')}`}
                                                className="h-5 w-5"
                                            />
                                        ) : (
                                            <div className="w-full h-full min-w-[100px]"></div>
                                        )}
                                    </td>
                                ))}
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
               <p className="text-sm">Click "Add Routine" to get started.</p>
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
    </>
  );
}

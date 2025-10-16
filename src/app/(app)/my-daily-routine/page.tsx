
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2, Trash2, Edit, CheckCircle, MoreVertical, ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { DailyRoutine, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { getRoutinesAction, deleteRoutineAction, updateRoutineAction } from './actions';

const AddEditRoutineDialog = dynamic(() => import('@/components/daily-routine/AddEditRoutineDialog').then(mod => mod.AddEditRoutineDialog));

export default function MyDailyRoutinePage() {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [routines, setRoutines] = useState<DailyRoutine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [routineToEdit, setRoutineToEdit] = useState<DailyRoutine | null>(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  
  const [routineToDelete, setRoutineToDelete] = useState<DailyRoutine | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const fetchedRoutines = await getRoutinesAction(currentUser.id);
      setRoutines(fetchedRoutines);
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

  const sortedRoutines = useMemo(() => {
    return [...routines].sort((a, b) => {
        try {
            const timeA = parse(a.time, 'HH:mm', new Date());
            const timeB = parse(b.time, 'HH:mm', new Date());
            return timeA.getTime() - timeB.getTime();
        } catch(e) {
            return 0;
        }
    });
  }, [routines]);

  const handleRoutineSaved = (savedRoutine: DailyRoutine, isEdit: boolean) => {
    toast({ title: `Routine ${isEdit ? 'Updated' : 'Created'}`, description: `Your routine "${savedRoutine.title}" has been saved.` });
    fetchData();
    setIsAddEditOpen(false);
    setRoutineToEdit(null);
  };

  const handleOpenAddDialog = () => {
    setRoutineToEdit(null);
    setIsAddEditOpen(true);
  };
  
  const handleOpenEditDialog = (routine: DailyRoutine) => {
    setRoutineToEdit(routine);
    setIsAddEditOpen(true);
  };
  
  const handleDeleteRequest = (routine: DailyRoutine) => {
    setRoutineToDelete(routine);
  };

  const handleConfirmDelete = async () => {
    if (!routineToDelete || !currentUser) return;
    setIsDeleting(true);
    const result = await deleteRoutineAction(routineToDelete.id, currentUser.id);
    setIsDeleting(false);
    setRoutineToDelete(null);

    if (result.success) {
      toast({ title: "Routine Deleted", description: "The routine has been successfully removed." });
      fetchData();
    } else {
      toast({ title: "Error", description: result.error || "Could not delete the routine.", variant: "destructive" });
    }
  };
  
  const toggleComplete = async (routine: DailyRoutine) => {
    if (!currentUser) return;

    // Optimistic UI update
    setRoutines(prev => prev.map(r => r.id === routine.id ? { ...r, isCompleted: !r.isCompleted } : r));
    
    const result = await updateRoutineAction(routine.id, { isCompleted: !routine.isCompleted }, currentUser.id);

    if (!result.success) {
        // Revert UI on failure
        setRoutines(prev => prev.map(r => r.id === routine.id ? { ...r, isCompleted: routine.isCompleted } : r));
        toast({ title: "Error", description: result.error || "Could not update routine status.", variant: "destructive" });
    }
  };


  if (isAuthLoading || !currentUser) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div className="space-y-6 p-1 sm:p-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
          <div><h1 className="page-title">My Daily Routine</h1><p className="page-description">Manage and track your personal daily tasks and habits.</p></div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button size="lg" onClick={handleOpenAddDialog} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-10 shadow-md">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add Routine
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="shadow-lg border bg-card rounded-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-8 w-8" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-10 w-full mt-2" />
                </CardContent>
              </Card>
            ))
          ) : sortedRoutines.length > 0 ? (
            sortedRoutines.map(routine => (
              <Card key={routine.id} className={cn("shadow-lg border bg-card rounded-lg transition-all", routine.isCompleted && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-bold">{routine.title}</CardTitle>
                   <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleOpenEditDialog(routine)} className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4"/>Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDeleteRequest(routine)} className="cursor-pointer text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4"/>Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-mono text-primary font-semibold">{format(parse(routine.time, 'HH:mm', new Date()), 'h:mm a')}</p>
                  <p className="text-sm text-muted-foreground min-h-[40px] mt-2">{routine.description}</p>
                   <Button 
                    className="w-full mt-4" 
                    variant={routine.isCompleted ? "secondary" : "default"}
                    onClick={() => toggleComplete(routine)}
                   >
                    <CheckCircle className="mr-2 h-4 w-4"/>
                    {routine.isCompleted ? 'Mark as Incomplete' : 'Mark as Complete'}
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
             <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground">
                <ClipboardList className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-semibold">No routines yet!</p>
                <p className="text-sm">Click "Add Routine" to get started.</p>
              </CardContent>
             </Card>
          )}
        </div>
      </div>
      
      {isAddEditOpen && (
        <AddEditRoutineDialog
            isOpen={isAddEditOpen}
            onOpenChange={setIsAddEditOpen}
            onRoutineSaved={handleRoutineSaved}
            routine={routineToEdit}
            currentUser={currentUser}
        />
      )}
      
      {routineToDelete && (
        <AlertDialog open={!!routineToDelete} onOpenChange={() => setRoutineToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the routine: "<span className="font-semibold">{routineToDelete.title}</span>". This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRoutineToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeleting}>
                {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

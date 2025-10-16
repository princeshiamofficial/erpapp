
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import type { DailyRoutine, User } from '@/types';
import { Loader2 } from 'lucide-react';
import { addRoutineAction, updateRoutineAction } from '@/app/(app)/my-daily-routine/actions';

interface AddEditRoutineDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRoutineSaved: (savedRoutine: DailyRoutine, isEdit: boolean) => void;
  routine?: DailyRoutine | null;
  currentUser: User;
}

export function AddEditRoutineDialog({ isOpen, onOpenChange, onRoutineSaved, routine, currentUser }: AddEditRoutineDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState('#f3f4f6');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!routine;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && routine) {
        setTitle(routine.title || '');
        setDescription(routine.description || '');
        // Split the time string into start and end times
        const timeParts = routine.time?.split(' to ') || ['', ''];
        setStartTime(timeParts[0] || '');
        setEndTime(timeParts[1] || '');
        setColor(routine.color || '#f3f4f6');
      } else {
        setTitle('');
        setDescription('');
        setStartTime('');
        setEndTime('');
        setColor('#f3f4f6');
      }
    }
  }, [isOpen, routine, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime) {
      toast({ title: "Validation Error", description: "Title and Start Time are required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const formattedTime = endTime ? `${startTime} to ${endTime}` : startTime;

    let result;
    if (isEditMode && routine) {
      const updates: Partial<Omit<DailyRoutine, 'id' | 'userId'>> = {
        title: title.trim(),
        description: description.trim() || undefined,
        time: formattedTime,
        color,
      };
      result = await updateRoutineAction(routine.id, updates, currentUser.id);
      if (result.success) {
        onRoutineSaved({ ...routine, ...updates } as DailyRoutine, true);
      }
    } else {
      const routineData: Omit<DailyRoutine, 'id' | 'createdAt' | 'updatedAt' | 'completedTasks'> = {
        userId: currentUser.id,
        title: title.trim(),
        description: description.trim() || undefined,
        time: formattedTime,
        color,
      };
      result = await addRoutineAction(routineData);
      if (result.success && result.routine) {
        onRoutineSaved(result.routine, false);
      }
    }
    
    setIsSubmitting(false);

    if (!result.success) {
      toast({ title: "Error", description: result.error || "Could not save routine.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Add'} Daily Routine</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this routine.' : 'Create a new daily task or habit.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="routine-title">Title *</Label>
            <Input id="routine-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Morning Workout" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="routine-start-time">Start Time *</Label>
              <Input id="routine-start-time" type="text" value={startTime} onChange={e => setStartTime(e.target.value)} required placeholder="e.g., 06:00 AM" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="routine-end-time">End Time (Optional)</Label>
              <Input id="routine-end-time" type="text" value={endTime} onChange={e => setEndTime(e.target.value)} placeholder="e.g., 07:00 AM" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="routine-color">Color</Label>
            <div className="flex items-center gap-2">
                <Input id="routine-color" type="color" value={color} onChange={e => setColor(e.target.value)} className="w-16 h-10 p-1"/>
                <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: color }} />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : 'Save Routine'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddEditRoutineDialog;

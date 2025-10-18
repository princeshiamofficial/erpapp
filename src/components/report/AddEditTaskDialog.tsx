
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { updateTaskEntryAction } from '@/app/(app)/report/actions';
import { Loader2 } from 'lucide-react';
import type { TaskEntry, User } from '@/types';
import { format, parseISO } from 'date-fns';

interface AddEditTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onTaskSaved: () => void;
  task: TaskEntry | null;
  currentUser: User;
}

export function AddEditTaskDialog({ isOpen, onOpenChange, onTaskSaved, task, currentUser }: AddEditTaskDialogProps) {
  const [taskCount, setTaskCount] = useState('');
  const [likelihood, setLikelihood] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!task;

  useEffect(() => {
    if (isOpen && task) {
      setTaskCount(task.taskCount.toString());
      setLikelihood(task.likelihood?.toString() || '');
    } else if (!isOpen) {
      setTaskCount('');
      setLikelihood('');
    }
  }, [isOpen, task]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    const numericTaskCount = parseInt(taskCount, 10);
    const numericLikelihood = task.role === 'CRM' ? parseInt(likelihood, 10) : undefined;
    
    if (isNaN(numericTaskCount) || numericTaskCount < 0) {
      toast({ title: "Invalid Input", description: "Task count must be a non-negative number.", variant: "destructive" });
      return;
    }
    if (task.role === 'CRM' && (numericLikelihood === undefined || isNaN(numericLikelihood) || numericLikelihood < 0)) {
       toast({ title: "Invalid Input", description: "Likely customers must be a non-negative number for CRM tasks.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    
    const updates: Partial<Omit<TaskEntry, 'id'>> = {
      taskCount: numericTaskCount,
      likelihood: numericLikelihood,
    };

    const result = await updateTaskEntryAction(task.id, updates);
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: "Task Entry Updated", description: "The task entry has been successfully updated." });
      onTaskSaved();
    } else {
      toast({ title: "Update Failed", description: result.error, variant: "destructive" });
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Task Entry</DialogTitle>
          <DialogDescription>
            Editing entry for <span className="font-semibold">{task?.userName}</span> on <span className="font-semibold">{task ? format(parseISO(task.date), 'PPP') : ''}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="task-count">Task Count</Label>
            <Input id="task-count" type="number" value={taskCount} onChange={e => setTaskCount(e.target.value)} required />
          </div>
          {task?.role === 'CRM' && (
            <div className="space-y-1">
              <Label htmlFor="likelihood">Likely Customers</Label>
              <Input id="likelihood" type="number" value={likelihood} onChange={e => setLikelihood(e.target.value)} required />
            </div>
          )}
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

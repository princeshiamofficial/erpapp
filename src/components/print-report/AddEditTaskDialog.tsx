
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
import { Loader2 } from 'lucide-react';
import type { TrackingLink, User } from '@/types'; // Import User
import { addTaskAction, updateTaskAction } from '@/app/(app)/print-report/actions';

interface AddEditTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onTaskSaved: () => void;
  task?: TrackingLink | null;
  currentUser: User; // Add currentUser prop
}

export function AddEditTaskDialog({ isOpen, onOpenChange, onTaskSaved, task, currentUser }: AddEditTaskDialogProps) {
  const [taskNotes, setTaskNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!task;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && task) {
        setTaskNotes(task.orderNotes || '');
      } else {
        setTaskNotes('');
      }
    }
  }, [isOpen, task, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    let result;

    if (isEditMode && task) {
      const updates: Partial<TrackingLink> = {
        orderNotes: taskNotes || null,
        updatedAt: new Date().toISOString(),
      };
      updates.crmUserName = task.crmUserName;
      
      result = await updateTaskAction(task.id, updates);
    } else {
      const newTaskData: Omit<TrackingLink, 'id' | 'crmUserId' | 'crmUserName'> = {
        companyName: "New Task (Details pending)",
        address: "N/A",
        phoneNumber: "N/A",
        orderItems: [],
        createdAt: new Date().toISOString(),
        isPublic: false,
        currentStatus: "order-submitted", // Default status
        statusHistory: [],
        comments: [],
        orderNotes: taskNotes || null,
      };
      result = await addTaskAction(newTaskData, currentUser);
    }
    
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: `Task ${isEditMode ? 'Updated' : 'Created'}`, description: "The task has been saved." });
      onTaskSaved();
    } else {
      toast({ title: "Error", description: result.error || "Could not save the task.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Task' : 'Add New Task'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? `Update details for Task ID: ${task.id}` : 'Fill in the details for a new production task.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
           <div className="space-y-1">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea id="task-notes" value={taskNotes} onChange={e => setTaskNotes(e.target.value)} placeholder="Add any relevant notes..."/>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Add Task')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

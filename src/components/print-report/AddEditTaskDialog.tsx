
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
import type { TrackingLink } from '@/types';
import { addTaskAction, updateTaskAction } from '@/app/(app)/print-report/actions';

interface AddEditTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onTaskSaved: () => void;
  task?: TrackingLink | null;
}

export function AddEditTaskDialog({ isOpen, onOpenChange, onTaskSaved, task }: AddEditTaskDialogProps) {
  const [creatorName, setCreatorName] = useState('');
  const [assignedLrName, setAssignedLrName] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!task;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && task) {
        setCreatorName(task.crmUserName);
        setAssignedLrName(task.designerRepresentativeName || '');
        setTaskNotes(task.orderNotes || '');
      } else {
        // Reset form for add mode
        setCreatorName('');
        setAssignedLrName('');
        setTaskNotes('');
      }
    }
  }, [isOpen, task, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorName.trim()) {
      toast({ title: "Validation Error", description: "Creator Name is required.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    let result;

    if (isEditMode && task) {
      const updates: Partial<TrackingLink> = {
        crmUserName: creatorName,
        designerRepresentativeName: assignedLrName || null,
        orderNotes: taskNotes || null,
        updatedAt: new Date().toISOString(),
      };
      result = await updateTaskAction(task.id, updates);
    } else {
      // For adding, we need more fields to create a valid TrackingLink.
      // This part is simplified as the primary focus is the dialog itself.
      // A real implementation would require a more complete form.
      const newTaskData: Omit<TrackingLink, 'id'> = {
        companyName: "New Task (Details pending)",
        address: "N/A",
        phoneNumber: "N/A",
        orderItems: [],
        crmUserId: "TEMP_USER", // Placeholder
        crmUserName: creatorName,
        designerRepresentativeName: assignedLrName || null,
        createdAt: new Date().toISOString(),
        isPublic: false,
        currentStatus: "order-submitted", // Default status
        statusHistory: [],
        comments: [],
      };
      result = await addTaskAction(newTaskData);
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
            <Label htmlFor="creator-name">Creator Name *</Label>
            <Input id="creator-name" value={creatorName} onChange={e => setCreatorName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="assigned-lr-name">Assigned LR</Label>
            <Input id="assigned-lr-name" value={assignedLrName} onChange={e => setAssignedLrName(e.target.value)} />
          </div>
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

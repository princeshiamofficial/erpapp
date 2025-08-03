
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { TrackingLink, User, CustomStatus } from '@/types';
import { addTaskAction, updateTaskAction } from '@/app/(app)/print-report/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddEditTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onTaskSaved: (task: TrackingLink) => void;
  task?: TrackingLink | null;
  currentUser: User;
  allStatuses: CustomStatus[];
}

const PRINT_STATUSES = ['Waiting', 'Printed'];

export function AddEditTaskDialog({ isOpen, onOpenChange, onTaskSaved, task, currentUser, allStatuses }: AddEditTaskDialogProps) {
  const [taskNotes, setTaskNotes] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!task;

  const availableStatuses = useMemo(() => {
    return PRINT_STATUSES;
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && task) {
        setTaskNotes(task.orderNotes || '');
        setCurrentStatus(task.currentStatus);
      } else {
        setTaskNotes('');
        setCurrentStatus('Waiting'); 
      }
    }
  }, [isOpen, task, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    onOpenChange(false); // Close dialog immediately
    const savingToast = toast({
      title: "Saving Task...",
      description: "Your changes are being saved in the background.",
    });

    setIsSubmitting(true);
    let result;

    const updates: Partial<Omit<TrackingLink, 'id'>> = {
      orderNotes: taskNotes || null,
      updatedAt: new Date().toISOString(),
      updatedByUserId: currentUser.id,
      updatedByUserName: currentUser.name,
      currentStatus: currentStatus,
    };

    if (isEditMode && task) {
      updates.crmUserId = task.crmUserId;
      updates.crmUserName = task.crmUserName;
      
      result = await updateTaskAction(task.id, updates);
    } else {
      const newTaskData = {
        companyName: "New Task (Details pending)",
        address: "N/A",
        phoneNumber: "N/A",
        orderItems: [],
        createdAt: new Date().toISOString(),
        isPublic: false,
        statusHistory: [],
        comments: [],
        ...updates
      };
      result = await addTaskAction(newTaskData, currentUser);
    }
    
    setIsSubmitting(false);

    savingToast.dismiss(); 

    if (result.success && result.task) {
      toast({ title: `Task ${isEditMode ? 'Updated' : 'Created'}`, description: "The task has been saved." });
      onTaskSaved(result.task); 
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
            {isEditMode ? `Update details for Task ID: ${task.projectIdDisplay || task.id}` : 'Fill in the details for a new production task.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
           {isEditMode && (
             <div className="space-y-1">
               <Label>Task ID</Label>
               <Input value={task.projectIdDisplay || task.id} readOnly disabled className="bg-muted/50" />
             </div>
           )}
           <div className="space-y-1">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea id="task-notes" value={taskNotes} onChange={e => setTaskNotes(e.target.value)} placeholder="Add any relevant notes..."/>
          </div>
          <div className="space-y-1">
            <Label htmlFor="status">Status</Label>
            <Select value={currentStatus} onValueChange={setCurrentStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (isEditMode ? 'Save Changes' : 'Add Task')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

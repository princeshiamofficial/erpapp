

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
import { Loader2, Calendar as CalendarIcon, ClipboardList, PlusCircle, AlertTriangle, Trash2 } from 'lucide-react';
import type { Employee, LeaveRecord, User } from '@/types';
import { addLeaveRecordAction, deleteLeaveRecordAction } from '@/app/(app)/payroll/actions';
import { format, parseISO, getYear, getMonth, differenceInMonths } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface ManageLeaveDialogProps {
  employee: Employee | null;
  onLeaveUpdated: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User;
}

export function ManageLeaveDialog({ employee, onLeaveUpdated, isOpen, onOpenChange, currentUser }: ManageLeaveDialogProps) {
  const [selectedDates, setSelectedDates] = useState<Date[] | undefined>([]);
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedLeaveTaken, setEditedLeaveTaken] = useState<string>('');
  const [recordToDelete, setRecordToDelete] = useState<LeaveRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();

  const totalLeaveAccrued = useMemo(() => {
    if (!employee?.joiningDate) return 0;
    
    const joiningDate = new Date(employee.joiningDate);
    const now = new Date();
    
    // Only calculate if joining date is in the past or present
    if (joiningDate > now) return 0;
    
    const monthsSinceJoining = differenceInMonths(now, joiningDate);

    // Leave accrues from the month *after* joining
    return Math.max(0, monthsSinceJoining);
  }, [employee?.joiningDate]);


  const leaveTaken = useMemo(() => {
    if (!employee?.leaveHistory) return 0;
    // Sum up all leave days regardless of year
    return employee.leaveHistory.reduce((sum, leave) => sum + leave.days, 0);
  }, [employee?.leaveHistory]);
  
  const availableLeave = useMemo(() => totalLeaveAccrued - leaveTaken, [totalLeaveAccrued, leaveTaken]);
  
  const canAdminEdit = currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN';

  useEffect(() => {
    if (!isOpen) {
      setSelectedDates([]);
      setLeaveReason('');
      setEditedLeaveTaken('');
      setRecordToDelete(null);
    } else if (employee) {
      setEditedLeaveTaken(leaveTaken.toString());
    }
  }, [isOpen, employee, leaveTaken]);
  
  const filteredLeaveHistory = useMemo(() => {
    if (!employee?.leaveHistory) return [];
    return employee.leaveHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [employee?.leaveHistory]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    const days = selectedDates?.length || 0;
    if (days <= 0) {
      toast({ title: "Validation Error", description: "Please select at least one leave date.", variant: "destructive" });
      return;
    }
    if (!leaveReason.trim()) {
      toast({ title: "Validation Error", description: "A reason for the leave is required.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    
    const newLeaveRecord: Omit<LeaveRecord, 'id'> = {
      date: selectedDates![0].toISOString(),
      days,
      reason: leaveReason.trim(),
      recordedByUserId: currentUser.id,
      recordedByUserName: currentUser.name,
    };
    
    const finalLeaveTaken = editedLeaveTaken !== leaveTaken.toString() ? parseInt(editedLeaveTaken, 10) : undefined;
    
    const result = await addLeaveRecordAction(employee.id, newLeaveRecord, finalLeaveTaken);
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: "Leave Recorded", description: `${days} day(s) of leave recorded for ${employee.name}.` });
      onLeaveUpdated();
      onOpenChange(false);
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleConfirmDelete = async () => {
    if (!employee || !recordToDelete) return;
    setIsDeleting(true);
    const result = await deleteLeaveRecordAction(employee.id, recordToDelete.id);
    setIsDeleting(false);
    setRecordToDelete(null);
    if (result.success) {
        toast({ title: "History Deleted", description: "The leave record has been removed." });
        onLeaveUpdated();
        onOpenChange(false); 
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };
  

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Leave for {employee?.name}</DialogTitle>
            <DialogDescription>View and record leave for this employee.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Accrued</p>
                <p className="text-2xl font-bold">{totalLeaveAccrued}</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="leave-taken-edit" className="text-sm text-muted-foreground">Taken</Label>
                <Input
                  id="leave-taken-edit"
                  type="number"
                  value={editedLeaveTaken}
                  onChange={e => setEditedLeaveTaken(e.target.value)}
                  className="text-2xl font-bold text-destructive h-auto p-0 border-none text-center bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  readOnly={!canAdminEdit}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-green-600">{availableLeave}</p>
              </div>
            </div>
            
            <Separator />

            <div className="flex justify-between items-center">
                 <h4 className="text-md font-semibold flex items-center">
                    <ClipboardList className="mr-2 h-5 w-5 text-primary" />
                    Leave History
                </h4>
            </div>
            <ScrollArea className="h-40 border rounded-md p-2 bg-muted/50">
              {filteredLeaveHistory.length > 0 ? (
                  filteredLeaveHistory.map(record => (
                      <div
                        key={record.id}
                        className="text-sm p-1.5 border-b last:border-b-0 hover:bg-muted/80 rounded-sm"
                        onDoubleClick={() => canAdminEdit && setRecordToDelete(record)}
                        title={canAdminEdit ? "Double-click to delete" : ""}
                      >
                         <p><span className="font-semibold">{record.days} day(s)</span> on {format(parseISO(record.date), 'd MMM, yyyy')}</p>
                         <p className="text-xs text-muted-foreground italic">Reason: {record.reason}</p>
                      </div>
                  ))
              ) : (
                  <div className="text-center text-sm text-muted-foreground py-10">No leave history recorded.</div>
              )}
            </ScrollArea>
            
            <Separator />

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <h4 className="text-md font-semibold flex items-center">
                <PlusCircle className="mr-2 h-5 w-5 text-primary" />
                Record New Leave
              </h4>
              <div className="space-y-1">
                <Label>Leave Dates *</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left font-normal", !selectedDates?.length && "text-muted-foreground")}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDates?.length ? (
                                `${selectedDates.length} date(s) selected`
                            ) : (
                                <span>Pick dates</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="multiple"
                            selected={selectedDates}
                            onSelect={setSelectedDates}
                            initialFocus
                            disabled={{ before: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) }}
                        />
                    </PopoverContent>
                </Popover>
              </div>
               <div className="space-y-1">
                  <Label htmlFor="leave-reason">Reason *</Label>
                  <Textarea id="leave-reason" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} required placeholder="e.g., Sick leave"/>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || !selectedDates || selectedDates.length === 0 || !leaveReason}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording...</> : "Record Leave"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      
      {recordToDelete && (
          <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-6 w-6 text-destructive" />
                          Delete Leave Entry?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                          Are you sure you want to delete the <span className="font-semibold">{recordToDelete.days} day(s)</span> leave record from <span className="font-semibold">{format(parseISO(recordToDelete.date), 'd MMM, yyyy')}</span>? This will automatically update the total leave taken.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setRecordToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                          {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin mr-2"/>Deleting...</> : "Yes, Delete"}
                      </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      )}
    </>
  );
}

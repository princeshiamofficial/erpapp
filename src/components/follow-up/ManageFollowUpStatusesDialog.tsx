
"use client";

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
    Plus, 
    Trash2, 
    GripVertical, 
    Palette, 
    Layout, 
    Check,
    AlertCircle,
    Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { FollowUpStatus } from "@/types";
import { cn } from "@/lib/utils";
import * as LucideIcons from 'lucide-react';
import { 
    addFollowUpStatus, 
    updateFollowUpStatus, 
    deleteFollowUpStatus,
    getFollowUpStatuses
} from "@/lib/follow-up-status-service";

interface ManageFollowUpStatusesDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: () => void;
}

export function ManageFollowUpStatusesDialog({
    isOpen,
    onOpenChange,
    onUpdate
}: ManageFollowUpStatusesDialogProps) {
    const { toast } = useToast();
    const [statuses, setStatuses] = useState<FollowUpStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingStatus, setEditingStatus] = useState<Partial<FollowUpStatus> | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [statusToDelete, setStatusToDelete] = useState<{ id: string, name: string } | null>(null);

    const fetchStatuses = async () => {
        setIsLoading(true);
        try {
            const data = await getFollowUpStatuses();
            setStatuses(data);
        } catch (error) {
            console.error("Failed to fetch statuses:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchStatuses();
        }
    }, [isOpen]);

    const handleAddStatus = async () => {
        const nextOrder = statuses.length > 0 ? Math.max(...statuses.map(s => s.displayOrder)) + 1 : 1;
        const newStatusName = "New Stage";
        const newStatus: any = {
            name: newStatusName,
            color: "#64748b",
            isVisible: true,
            allowedRoles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'],
            displayOrder: nextOrder,
            icon: 'Layout',
            headerBgClass: 'bg-slate-600'
        };

        setIsSaving(true);
        try {
            const result = await addFollowUpStatus(newStatus);
            if (result) {
                toast({ title: "Status Added", description: `"${newStatusName}" has been created.` });
                await fetchStatuses();
                onUpdate();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to add status.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteStatus = (id: string, name: string) => {
        setStatusToDelete({ id, name });
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!statusToDelete) return;

        setIsSaving(true);
        try {
            const success = await deleteFollowUpStatus(statusToDelete.id);
            if (success) {
                toast({ title: "Status Deleted", description: `"${statusToDelete.name}" has been removed.` });
                await fetchStatuses();
                onUpdate();
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to delete status.", variant: "destructive" });
        } finally {
            setIsSaving(false);
            setIsDeleteDialogOpen(false);
            setStatusToDelete(null);
        }
    };

    const handleUpdateStatus = async (id: string, updates: Partial<FollowUpStatus>) => {
        setIsSaving(true);
        try {
            const success = await updateFollowUpStatus(id, updates);
            if (success) {
                await fetchStatuses();
                onUpdate();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const PRESET_COLORS = [
        '#2563eb', '#9333ea', '#0891b2', '#ea580c', '#4f46e5', '#059669', '#e11d48', '#64748b', '#0f172a'
    ];

    const ICONS = [
        { name: 'UserPlus', label: 'New Lead' },
        { name: 'Phone', label: 'Call' },
        { name: 'CheckCircle2', label: 'Qualified' },
        { name: 'MessageSquare', label: 'Proposal' },
        { name: 'TrendingUp', label: 'Negotiation' },
        { name: 'Target', label: 'Won' },
        { name: 'XCircle', label: 'Lost' },
        { name: 'Layout', label: 'Stage' },
        { name: 'Calendar', label: 'Schedule' },
        { name: 'Star', label: 'Priority' }
    ];

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="p-6 pb-2 border-b bg-muted/5">
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Layout className="h-5 w-5 text-primary" />
                        Kanban Settings
                    </DialogTitle>
                    <DialogDescription>
                        Configure your follow-up stages. Changes will reflect immediately on the board.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground font-medium">Loading pipeline configuration...</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {statuses.map((status) => (
                                <div 
                                    key={status.id}
                                    className={cn(
                                        "group flex flex-col p-4 rounded-2xl border transition-all duration-300",
                                        status.isSystemStatus ? "bg-muted/30 border-muted-foreground/10" : "bg-card border-border/60 hover:border-primary/40 hover:shadow-lg"
                                    )}
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div 
                                            className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0 border border-white/20"
                                            style={{ backgroundColor: status.color, boxShadow: `0 4px 12px ${status.color}40` }}
                                        >
                                            {React.createElement((LucideIcons as any)[status.icon || 'Layout'] || LucideIcons.Layout, { className: "h-5 w-5" })}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <Input 
                                                    defaultValue={status.name}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== status.name && e.target.value.trim() !== '') {
                                                            handleUpdateStatus(status.id, { name: e.target.value });
                                                        }
                                                    }}
                                                    className="h-9 font-semibold text-sm border-none bg-transparent hover:bg-muted/50 focus:bg-muted/50 p-2 -ml-2 transition-all w-fit min-w-[200px]"
                                                    placeholder="Enter stage name..."
                                                />
                                                {status.isSystemStatus && (
                                                    <Badge variant="secondary" className="text-[9px] h-5 bg-primary/10 text-primary border-none">
                                                        System
                                                    </Badge>
                                                )}
                                                {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/50" />}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                                                <span className="font-mono bg-muted/40 px-1.5 py-0.5 rounded uppercase tracking-tight">Order: {status.displayOrder}</span>
                                                <span>•</span>
                                                <span className="font-mono bg-muted/40 px-1.5 py-0.5 rounded tracking-tight">{status.id}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {!status.isSystemStatus && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                                                    onClick={() => handleDeleteStatus(status.id, status.name)}
                                                    disabled={isSaving}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border/40">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                <Palette className="h-3 w-3" />
                                                Column Color
                                            </Label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {PRESET_COLORS.map(color => (
                                                    <button
                                                        key={color}
                                                        className={cn(
                                                            "h-6 w-6 rounded-md transition-all hover:scale-110",
                                                            status.color === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                                                        )}
                                                        style={{ backgroundColor: color }}
                                                        onClick={() => handleUpdateStatus(status.id, { color, headerBgClass: `bg-[${color}]` })}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                <Layout className="h-3 w-3" />
                                                Visual Icon
                                            </Label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {ICONS.slice(0, 5).map(icon => (
                                                    <button
                                                        key={icon.name}
                                                        title={icon.label}
                                                        className={cn(
                                                            "h-8 w-8 flex items-center justify-center rounded-lg border transition-all",
                                                            status.icon === icon.name ? "bg-primary text-white border-primary shadow-md" : "bg-muted/30 border-transparent hover:bg-muted/50 text-muted-foreground"
                                                        )}
                                                        onClick={() => handleUpdateStatus(status.id, { icon: icon.name })}
                                                    >
                                                        {React.createElement((LucideIcons as any)[icon.name] || LucideIcons.HelpCircle, { className: "h-4 w-4" })}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!isLoading && (
                        <Button 
                            variant="outline" 
                            className="w-full h-14 border-dashed border-2 hover:border-primary hover:text-primary transition-all rounded-2xl gap-2 font-semibold bg-muted/5"
                            onClick={handleAddStatus}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                            Add New Pipeline Stage
                        </Button>
                    )}
                </div>

                <DialogFooter className="p-6 border-t bg-muted/10">
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground italic flex-1">
                        <AlertCircle className="h-4 w-4 text-primary shrink-0" />
                        Stages are ordered by their creation. System stages cannot be removed.
                    </div>
                    <Button variant="default" onClick={() => onOpenChange(false)} className="rounded-xl px-8 shadow-lg shadow-primary/20">
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Delete Stage
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-base py-2">
                        Are you sure you want to delete the <span className="font-bold text-foreground">"{statusToDelete?.name}"</span> stage? 
                        Any leads currently in this stage will need to be re-organized. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel className="rounded-xl border-none hover:bg-muted font-semibold h-11">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={(e) => {
                            e.preventDefault();
                            confirmDelete();
                        }}
                        className="rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold h-11 px-8 shadow-lg shadow-destructive/20"
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Delete Permanently
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}

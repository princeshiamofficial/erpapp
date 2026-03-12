
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { FollowUp, FollowUpStatusType, User } from '@/types';
import {
    Search,
    Loader2,
    Phone,
    Target,
    MessageSquare,
    TrendingUp,
    Download,
    UserPlus,
    CheckCircle2,
    XCircle,
    Settings2,
    Plus,
    FileSpreadsheet,
} from "lucide-react";
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useSocket } from '@/contexts/socket-context';
import {
    DndContext,
    MouseSensor,
    TouchSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
    closestCorners,
    DragOverlay,
} from '@dnd-kit/core';
import { updateFollowUpStatusAction } from '@/app/(app)/follow-up/actions';
import { getFollowUps } from '@/lib/follow-up-service';
import { getFollowUpStatuses } from '@/lib/follow-up-status-service';
import { getUsers } from '@/lib/user-service';
import type { FollowUpStatus } from '@/types';
import { FollowUpKanbanColumn } from './FollowUpKanbanColumn';
import { FollowUpCard } from './FollowUpCard';
import dynamic from 'next/dynamic';
import Papa from 'papaparse';

const ManageFollowUpStatusesDialog = dynamic(() => import('./ManageFollowUpStatusesDialog').then(mod => mod.ManageFollowUpStatusesDialog), { ssr: false });
const ImportFollowUpsDialog = dynamic(() => import('./ImportFollowUpsDialog').then(mod => mod.ImportFollowUpsDialog), { ssr: false });
const FollowUpStageChangeDialog = dynamic(() => import('./FollowUpStageChangeDialog').then(mod => mod.FollowUpStageChangeDialog), { ssr: false });

const getIcon = (name: string | undefined) => {
    if (!name) return LucideIcons.HelpCircle;
    return (LucideIcons as any)[name] || LucideIcons.HelpCircle;
};

export function FollowUpKanbanClient() {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [followUps, setFollowUps] = useState<FollowUp[]>([]);
    const [statuses, setStatuses] = useState<FollowUpStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeItem, setActiveItem] = useState<FollowUp | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    
    // Stage Change Dialog State
    const [isStageChangeDialogOpen, setIsStageChangeDialogOpen] = useState(false);
    const [pendingChange, setPendingChange] = useState<{ item: FollowUp, newStatus: FollowUpStatusType } | null>(null);
    
    const { socket } = useSocket();

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        try {
            const [fetchedFollowUps, fetchedStatuses, fetchedUsers] = await Promise.all([
                getFollowUps(),
                getFollowUpStatuses(),
                getUsers()
            ]);
            setFollowUps(fetchedFollowUps);
            setStatuses(fetchedStatuses);
            setAllUsers(fetchedUsers);
        } catch (error) {
            console.error("Failed to fetch follow-up data:", error);
            toast({ title: "Error", description: "Failed to load follow-up information.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
        // Removed 30s interval as we now have sockets
    }, [fetchData]);

    useEffect(() => {
        if (!socket) return;

        socket.on("follow-up-updated", (data: any) => {
            // refresh data silently
            fetchData(true);
        });

        return () => {
            socket.off("follow-up-updated");
        };
    }, [socket, fetchData]);

    const filteredItems = useMemo(() => {
        return followUps.filter(item => {
            const matchesSearch = !searchTerm ||
                (item.businessName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.contactName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.jobId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.phone || "").includes(searchTerm);
            return matchesSearch;
        });
    }, [followUps, searchTerm]);

    const itemsByStatus = useMemo(() => {
        const grouped: Record<string, FollowUp[]> = {};
        statuses.forEach(col => grouped[col.name] = []);
        filteredItems.forEach(item => {
            if (grouped[item.status]) {
                grouped[item.status].push(item);
            }
        });
        return grouped;
    }, [filteredItems, statuses]);

    const handleExport = useCallback(() => {
        if (filteredItems.length === 0) {
            toast({ title: "No Data", description: "No follow-up records to export." });
            return;
        }

        const dataToExport = filteredItems.map(item => ({
            date: item.date,
            name: item.contactName,
            phone: item.phone,
            address: item.address,
            'job id': item.jobId || '',
            status: item.status,
        }));

        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'follow_up_records.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ title: "Export Successful", description: "Follow-up records have been downloaded." });
    }, [filteredItems, toast]);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const item = active.data.current?.followUp as FollowUp;
        if (item) setActiveItem(item);
    };

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        setActiveItem(null);
        const { active, over } = event;
        if (!over || !currentUser) return;

        const item = active.data.current?.followUp as FollowUp;
        const newStatus = over.id as FollowUpStatusType;

        if (item.status === newStatus) return;

        setPendingChange({ item, newStatus });
        setIsStageChangeDialogOpen(true);
    }, [currentUser]);

    const handleConfirmStageChange = async (notes: string) => {
        if (!pendingChange || !currentUser) return;

        const { item, newStatus } = pendingChange;
        
        // Optimistic update
        setFollowUps(prev => prev.map(l => l.id === item.id ? { ...l, status: newStatus } : l));

        const result = await updateFollowUpStatusAction(item, newStatus, currentUser, notes);
        if (!result.success) {
            toast({ title: "Update Failed", description: result.error, variant: "destructive" });
            setFollowUps(prev => prev.map(l => l.id === item.id ? { ...l, status: item.status } : l));
        } else {
            toast({ title: "Status Updated", description: `Record moved to ${newStatus}.` });
        }

        setIsStageChangeDialogOpen(false);
        setPendingChange(null);
    };

    const handleDragCancel = () => setActiveItem(null);

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            collisionDetection={closestCorners}
        >
            <div className="flex flex-col h-full space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search records..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] border-border/40 focus:border-primary/50 text-sm h-10 rounded-xl w-full"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN') && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsManageDialogOpen(true)}
                                    className="h-10 flex-1 sm:flex-none px-3 sm:px-4 rounded-xl border-dashed border-2 hover:border-primary hover:text-primary transition-all gap-2 shadow-sm bg-white"
                                >
                                    <Settings2 className="h-4 w-4 shrink-0" />
                                    <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">Columns</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsImportDialogOpen(true)}
                                    className="h-10 flex-1 sm:flex-none px-3 sm:px-4 rounded-xl border-dashed border-2 hover:border-primary hover:text-primary transition-all gap-2 text-primary shadow-sm bg-white"
                                >
                                    <FileSpreadsheet className="h-4 w-4 shrink-0" />
                                    <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">Import</span>
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleExport}
                                    className="h-10 px-4 rounded-xl border-border/50 bg-white gap-2 hover:bg-muted transition-all shadow-sm"
                                >
                                    <Download className="h-4 w-4 text-emerald-600" />
                                    <span className="hidden sm:inline">Export</span>
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-1 w-full max-w-full px-4 sm:px-6 lg:px-8 overflow-hidden">
                    <ScrollArea className="h-full w-full" orientation="horizontal">
                        <div className="flex space-x-4 h-full min-w-max pb-6">
                                {statuses.map((col) => (
                                    <FollowUpKanbanColumn
                                        key={col.id}
                                        id={col.name}
                                        title={col.name}
                                        icon={getIcon(col.icon)}
                                        items={itemsByStatus[col.name] || []}
                                        color={col.color}
                                        headerBgClass={col.headerBgClass || 'bg-slate-600'}
                                        isLoading={isLoading}
                                        currentUser={currentUser}
                                        allUsers={allUsers}
                                        onViewDetails={(item) => {}}
                                    />
                                ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
            </div>

            {isManageDialogOpen && (
                <ManageFollowUpStatusesDialog 
                    isOpen={isManageDialogOpen} 
                    onOpenChange={setIsManageDialogOpen} 
                    onUpdate={() => fetchData(true)} 
                />
            )}

            {isImportDialogOpen && (
                <ImportFollowUpsDialog
                    isOpen={isImportDialogOpen}
                    onOpenChange={setIsImportDialogOpen}
                    onFollowUpsImported={() => fetchData(true)}
                    currentUser={currentUser!}
                />
            )}

            {isStageChangeDialogOpen && pendingChange && (
                <FollowUpStageChangeDialog
                    isOpen={isStageChangeDialogOpen}
                    onOpenChange={setIsStageChangeDialogOpen}
                    onConfirm={handleConfirmStageChange}
                    oldStatus={pendingChange.item.status}
                    newStatus={pendingChange.newStatus}
                    businessName={pendingChange.item.businessName || pendingChange.item.contactName}
                />
            )}

            <DragOverlay dropAnimation={null}>
                {activeItem ? (
                    <FollowUpCard
                        followUp={activeItem}
                        isOverlay
                        currentUser={currentUser}
                        allUsers={allUsers}
                        statusColor={statuses.find(s => s.name === activeItem.status)?.color}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

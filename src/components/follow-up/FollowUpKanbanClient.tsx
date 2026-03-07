
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
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
import type { FollowUpStatus } from '@/types';
import { FollowUpKanbanColumn } from './FollowUpKanbanColumn';
import { FollowUpCard } from './FollowUpCard';
import dynamic from 'next/dynamic';
import Papa from 'papaparse';

const ManageFollowUpStatusesDialog = dynamic(() => import('./ManageFollowUpStatusesDialog').then(mod => mod.ManageFollowUpStatusesDialog), { ssr: false });
const ImportFollowUpsDialog = dynamic(() => import('./ImportFollowUpsDialog').then(mod => mod.ImportFollowUpsDialog), { ssr: false });

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
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        try {
            const [fetchedFollowUps, fetchedStatuses] = await Promise.all([
                getFollowUps(),
                getFollowUpStatuses()
            ]);
            setFollowUps(fetchedFollowUps);
            setStatuses(fetchedStatuses);
        } catch (error) {
            console.error("Failed to fetch follow-up data:", error);
            toast({ title: "Error", description: "Failed to load follow-up information.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const filteredItems = useMemo(() => {
        return followUps.filter(item => {
            const matchesSearch = !searchTerm ||
                (item.businessName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.contactName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            contactName: item.contactName,
            businessName: item.businessName,
            phone: item.phone,
            address: item.address,
            district: item.district || '',
            division: item.division || '',
            status: item.status,
            category: item.category,
            lastEngagement: item.lastEngagementDate || '',
            nextScheduled: item.nextScheduledDate || '',
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

        // Optimistic update
        setFollowUps(prev => prev.map(l => l.id === item.id ? { ...l, status: newStatus } : l));

        const result = await updateFollowUpStatusAction(item, newStatus, currentUser);
        if (!result.success) {
            toast({ title: "Update Failed", description: result.error, variant: "destructive" });
            setFollowUps(prev => prev.map(l => l.id === item.id ? { ...l, status: item.status } : l));
        } else {
            toast({ title: "Status Updated", description: `Record moved to ${newStatus}.` });
        }
    }, [currentUser, toast]);

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
                <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-0">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search follow-ups..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-card/50 border-border/50 focus:border-primary/50 text-sm h-10 rounded-xl"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN') && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsManageDialogOpen(true)}
                                    className="h-10 px-4 rounded-xl border-dashed border-2 hover:border-primary hover:text-primary transition-all gap-2"
                                >
                                    <Settings2 className="h-4 w-4" />
                                    Manage Columns
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsImportDialogOpen(true)}
                                    className="h-10 px-4 rounded-xl border-dashed border-2 hover:border-primary hover:text-primary transition-all gap-2 text-primary"
                                >
                                    <FileSpreadsheet className="h-4 w-4" />
                                    Import Leads
                                </Button>
                            </>
                        )}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleExport}
                            className="h-10 px-4 rounded-xl border-border/50 bg-card/50 gap-2 hover:bg-muted transition-all"
                        >
                            <Download className="h-4 w-4 text-emerald-600" />
                            <span className="hidden sm:inline">Export</span>
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar-hidden">
                    <div className="flex space-x-4 h-full min-w-max px-4 sm:px-0">
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
                            />
                        ))}
                    </div>
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

            <DragOverlay dropAnimation={null}>
                {activeItem ? (
                    <FollowUpCard
                        followUp={activeItem}
                        isOverlay
                        currentUser={currentUser}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

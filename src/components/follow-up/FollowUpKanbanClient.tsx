
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
} from "lucide-react";
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
import { FollowUpKanbanColumn } from './FollowUpKanbanColumn';
import { FollowUpCard } from './FollowUpCard';

const KANBAN_COLUMNS: Array<{ title: string; status: FollowUpStatusType; icon: any; headerBgClass: string }> = [
    { title: 'New Lead', status: 'New Lead', icon: UserPlus, headerBgClass: 'bg-blue-600' },
    { title: 'Contacted', status: 'Contacted', icon: Phone, headerBgClass: 'bg-purple-600' },
    { title: 'Qualified', status: 'Qualified', icon: CheckCircle2, headerBgClass: 'bg-cyan-600' },
    { title: 'Proposal', status: 'Proposal Sent', icon: MessageSquare, headerBgClass: 'bg-orange-600' },
    { title: 'Negotiation', status: 'Negotiation', icon: TrendingUp, headerBgClass: 'bg-indigo-600' },
    { title: 'Won', status: 'Won', icon: Target, headerBgClass: 'bg-emerald-600' },
    { title: 'Lost', status: 'Lost', icon: XCircle, headerBgClass: 'bg-rose-600' },
];

export function FollowUpKanbanClient() {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [followUps, setFollowUps] = useState<FollowUp[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeItem, setActiveItem] = useState<FollowUp | null>(null);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        try {
            const fetched = await getFollowUps();
            setFollowUps(fetched);
        } catch (error) {
            console.error("Failed to fetch follow-ups:", error);
            toast({ title: "Error", description: "Failed to load follow-up entries.", variant: "destructive" });
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
        KANBAN_COLUMNS.forEach(col => grouped[col.status] = []);
        filteredItems.forEach(item => {
            if (grouped[item.status]) {
                grouped[item.status].push(item);
            }
        });
        return grouped;
    }, [filteredItems]);

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
                        <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl border-border/50 bg-card/50 gap-2 opacity-50 cursor-not-allowed">
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Export</span>
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar-hidden">
                    <div className="flex space-x-4 h-full min-w-max px-4 sm:px-0">
                        {KANBAN_COLUMNS.map((col) => (
                            <FollowUpKanbanColumn
                                key={col.status}
                                id={col.status}
                                title={col.title}
                                icon={col.icon}
                                items={itemsByStatus[col.status] || []}
                                headerBgClass={col.headerBgClass}
                                isLoading={isLoading}
                                currentUser={currentUser}
                            />
                        ))}
                    </div>
                </div>
            </div>

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

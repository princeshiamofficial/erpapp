
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Loader2, type LucideIcon } from 'lucide-react';
import type { FollowUp, User } from '@/types';
import { FollowUpCard } from './FollowUpCard';

interface FollowUpKanbanColumnProps {
    id: string;
    title: string;
    icon: LucideIcon;
    items: FollowUp[];
    color?: string;
    headerBgClass?: string;
    headerTextClass?: string;
    headerIconClass?: string;
    isLoading?: boolean;
    currentUser: User | null;
    allUsers: User[];
    onViewDetails?: (item: FollowUp) => void;
}

const ITEMS_PER_PAGE = 20;

export function FollowUpKanbanColumn({
    id,
    title,
    icon: Icon,
    items,
    color,
    headerBgClass,
    headerTextClass = "text-white",
    headerIconClass = "text-white",
    isLoading = false,
    currentUser,
    allUsers,
    onViewDetails = () => { },
}: FollowUpKanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id });
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

    useEffect(() => {
        setVisibleCount(ITEMS_PER_PAGE);
    }, [items]);

    const handleLoadMore = () => {
        setVisibleCount(prevCount => prevCount + ITEMS_PER_PAGE);
    };

    const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
    const hasMoreItems = visibleCount < items.length;

    const { ref: observerRef, inView } = useInView({
        threshold: 0.1,
    });

    useEffect(() => {
        if (inView && hasMoreItems) {
            handleLoadMore();
        }
    }, [inView, hasMoreItems]);

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "w-[280px] sm:w-[300px] shrink-0 flex flex-col bg-muted/20 sm:bg-muted/30 rounded-lg overflow-hidden transition-all duration-300 ease-in-out h-full border border-border/10",
                isOver ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.01] bg-muted/40' : 'shadow-sm'
            )}
        >
            <div 
                className={cn(
                    "px-3 py-2.5 flex items-center justify-between relative shadow-sm",
                    !color && headerBgClass,
                    headerTextClass
                )}
                style={color ? { backgroundColor: color } : undefined}
            >
                <div className="flex items-center gap-2.5">
                    <div className={cn("p-1.5 rounded-lg bg-white/20 backdrop-blur-md", headerIconClass)}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <h2 className="font-semibold text-sm tracking-wide">{title}</h2>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-black/20 rounded-full border border-white/10 backdrop-blur-sm">
                    {isLoading ? <Skeleton className="h-3 w-3 bg-white/20" /> : items.length}
                </span>
            </div>

            <ScrollArea className="flex-1 bg-background/10 custom-scrollbar">
                <div className="p-3 min-h-full space-y-3">
                    <motion.div layout className="space-y-3">
                        {isLoading && items.length === 0 ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-40 w-full rounded-xl" />
                                ))}
                            </div>
                        ) : visibleItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 opacity-40">
                                <p className="text-xs font-semibold italic">No lead in this stage.</p>
                            </div>
                        ) : (
                            <AnimatePresence initial={false} mode="popLayout">
                                {visibleItems.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                    >
                                        <FollowUpCard
                                            followUp={item}
                                            currentUser={currentUser}
                                            allUsers={allUsers}
                                            statusColor={color}
                                            onViewDetails={onViewDetails}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </motion.div>
                    {hasMoreItems && (
                        <div ref={observerRef} className="flex justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

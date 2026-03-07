
"use client";

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { FollowUp, User } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Phone,
    Calendar,
    User as UserIcon,
    Building2,
    Clock,
    MessageSquare,
    MapPin,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface FollowUpCardProps {
    followUp: FollowUp;
    isOverlay?: boolean;
    currentUser: User | null;
    onViewDetails?: (item: FollowUp) => void;
}

const getInitials = (name: string | undefined): string => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

export const FollowUpCard = ({
    followUp,
    isOverlay = false,
    currentUser,
    onViewDetails = () => { },
}: FollowUpCardProps) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: followUp.id,
        data: { followUp },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
    };

    const getCustomerTypeColor = (type: string | null | undefined) => {
        switch (type) {
            case 'WARM': return 'bg-orange-500 text-white';
            case 'COLD': return 'bg-blue-400 text-white';
            case 'Order Lock': return 'bg-emerald-600 text-white';
            default: return 'bg-slate-500 text-white';
        }
    };

    const lastLog = followUp.history?.[followUp.history.length - 1];

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "group relative select-none touch-none",
                isOverlay && "z-[100] scale-[1.02] shadow-2xl rotate-2"
            )}
        >
            <Card className={cn(
                "border border-border/50 bg-card hover:bg-accent/5 transition-all duration-300 shadow-sm hover:shadow-md rounded-xl overflow-hidden",
                isOverlay && "border-primary/50 ring-2 ring-primary/20 shadow-xl"
            )}>
                <CardContent className="p-3.5 space-y-3">
                    {/* Header: Customer Type & Category */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {followUp.customerType && (
                                <Badge className={cn("px-2 py-0 h-4 text-[8px] font-black rounded-sm border-none shadow-none", getCustomerTypeColor(followUp.customerType))}>
                                    {followUp.customerType}
                                </Badge>
                            )}
                            <Badge variant="outline" className="px-1.5 py-0 h-4 text-[8px] font-bold rounded-sm border-slate-200 dark:border-white/10 uppercase tracking-tight">
                                {followUp.category}
                            </Badge>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">
                            {followUp.id.substring(0, 8)}
                        </div>
                    </div>

                    {/* Main Info */}
                    <div className="space-y-1.5">
                        <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                            {followUp.businessName || followUp.contactName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                            <UserIcon className="h-3 w-3 shrink-0" />
                            <span className="truncate">{followUp.contactName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{followUp.phone}</span>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="pt-2.5 border-t border-border/50 flex items-center justify-between gap-2">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/80 font-medium">
                                <Calendar className="h-2.5 w-2.5 shrink-0" />
                                <span>{format(parseISO(followUp.date), 'dd MMM yyyy')}</span>
                            </div>
                            {followUp.district && (
                                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/80 font-medium italic truncate">
                                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                                    <span>{followUp.district}</span>
                                </div>
                            )}
                        </div>

                        {/* Assignee Avatar */}
                        <div className="flex -space-x-2">
                            <Avatar className="h-6 w-6 ring-2 ring-background shadow-sm border border-border/50">
                                <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
                                    {getInitials(followUp.crmName)}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>

                    {/* Last Log Hook */}
                    {lastLog && (
                        <div className="p-2 bg-muted/30 rounded-lg flex items-start gap-2 border border-border/30 group-hover:bg-muted/50 transition-colors">
                            <MessageSquare className="h-2.5 w-2.5 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-0.5">
                                <p className="text-[9px] text-foreground/70 font-medium line-clamp-1 leading-tight italic">
                                    "{lastLog.notes || lastLog.outcome}"
                                </p>
                                <span className="text-[8px] text-muted-foreground/60 font-medium uppercase tracking-wider">
                                    {format(parseISO(lastLog.timestamp), 'h:mm a')}
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

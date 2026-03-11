
"use client";

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { FollowUp, User } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { deleteFollowUpAction } from '@/app/(app)/follow-up/actions';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, StickyNote, CalendarDays, ExternalLink, Phone, Info, User as UserIcon, Trash2, Loader2 } from 'lucide-react';

interface FollowUpCardProps {
    followUp: FollowUp;
    isOverlay?: boolean;
    currentUser: User | null;
    allUsers?: User[];
    statusColor?: string;
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
    allUsers = [],
    statusColor,
    onViewDetails = () => { },
}: FollowUpCardProps) => {
    const { toast } = useToast();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: followUp.id,
        data: { followUp },
    });

    const style = !isOverlay && transform ? {
        transform: CSS.Translate.toString(transform),
    } : undefined;

    const getCustomerTypeColor = (type: string | null | undefined) => {
        switch (type) {
            case 'WARM': return 'bg-orange-500 text-white';
            case 'COLD': return 'bg-blue-400 text-white';
            case 'Order Lock': return 'bg-emerald-600 text-white';
            default: return 'bg-slate-500 text-white';
        }
    };

    const lastLog = followUp.history?.[followUp.history.length - 1];
    const crmUser = allUsers.find(u => u.id === followUp.crmId);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteFollowUpAction(followUp.id);
            if (result.success) {
                toast({ title: "Deleted", description: "Lead record removed successfully." });
                setIsDeleteDialogOpen(false);
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete lead.", variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <motion.div
            ref={!isOverlay ? setNodeRef : null}
            style={style}
            {...(!isOverlay ? listeners : {})}
            {...(!isOverlay ? attributes : {})}
            animate={{
              scale: !isOverlay && isDragging ? 1.05 : (isOverlay ? 0.95 : 1),
              opacity: !isOverlay && isDragging ? 0.4 : 1,
              boxShadow: isOverlay ? "0px 10px 25px -5px rgba(0, 0, 0, 0.2)" : "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
              rotate: isOverlay ? 2 : 0,
            }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className={cn("relative group", isOverlay ? "z-50" : (isDragging ? "z-50" : ""))}
            onClick={() => !isOverlay && onViewDetails(followUp)}
        >
            <Card className={cn(
                "bg-card w-full shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden",
                isOverlay ? "cursor-grabbing" : (isDragging ? "ring-2 ring-primary cursor-grabbing" : "cursor-grab active:cursor-grabbing"),
            )}>
                <CardContent className="p-3 space-y-2.5">
                    {/* Header: Title and Actions */}
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-4">
                            <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors w-full">
                                {followUp.businessName || followUp.contactName}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                {followUp.customerType && (
                                    <Badge className={cn("px-1.5 py-0 h-4 text-[8px] font-bold rounded-sm border-none shadow-none", getCustomerTypeColor(followUp.customerType))}>
                                        {followUp.customerType}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        

                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium min-w-0">
                            <UserIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{followUp.contactName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span>{followUp.phone}</span>
                        </div>
                        {followUp.jobId && (
                            <div className="flex items-center gap-2 text-[11px] text-primary font-bold bg-primary/5 px-2 py-0.5 rounded-lg w-fit mt-1">
                                <Info className="h-3.5 w-3.5 shrink-0" />
                                <span>ID: {followUp.jobId}</span>
                            </div>
                        )}
                    </div>

                    {/* Date and Location Badge */}
                    <div className="flex items-center justify-between pt-1">
                        <div 
                            className="inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-bold shadow-sm"
                            style={{
                                backgroundColor: statusColor ? `${statusColor}10` : undefined,
                                color: statusColor || 'inherit',
                                borderColor: statusColor ? `${statusColor}20` : 'rgba(0,0,0,0.05)'
                            }}
                        >
                            <CalendarDays className="mr-1.5 h-3 w-3" />
                            <span>{format(parseISO(followUp.date), 'dd MMM, yyyy')}</span>
                        </div>
                        
                        {followUp.address && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="h-7 w-7 rounded-lg bg-muted/30 flex items-center justify-center cursor-help border border-border/40">
                                            <MapPin className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs p-3 rounded-xl border-none shadow-2xl bg-slate-900 text-white">
                                        <p className="text-xs leading-relaxed">{followUp.address}</p>
                                        {followUp.district && <p className="text-[10px] text-slate-400 mt-1 italic">{followUp.district}, {followUp.division}</p>}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>

                    {/* Footer: Assignee and Action Icons */}
                    <div className="pt-2.5 border-t border-border/40 flex items-center justify-between">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 group/avatar cursor-pointer">
                                        <Avatar className="h-7 w-7 ring-2 ring-background border border-border/40 shadow-sm group-hover/avatar:ring-primary/40 transition-all">
                                            <AvatarImage src={crmUser?.avatarUrl || undefined} alt={followUp.crmName} />
                                            <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                                                {getInitials(followUp.crmName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col -space-y-0.5 min-w-0">
                                            <span className="text-[10px] font-bold text-foreground/80 truncate max-w-[80px]">{followUp.crmName}</span>
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-xs">Assigned to {followUp.crmName}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <div className="flex items-center gap-1">
                            {followUp.history && followUp.history.length > 0 && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5">
                                                <StickyNote className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="w-[320px] p-0 rounded-3xl border border-border/50 shadow-2xl bg-white dark:bg-slate-950 overflow-hidden" side="right" align="start" sideOffset={10}>
                                            <div className="bg-slate-50/50 dark:bg-white/[0.02] px-5 py-4 border-b border-border/50">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                                                    <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground/70">Activity Timeline</h4>
                                                </div>
                                            </div>
                                            <ScrollArea className="h-[320px] w-full">
                                                <div className="p-6 relative">
                                                    {/* Timeline Line */}
                                                    <div className="absolute left-[29px] top-6 bottom-6 w-[1px] bg-border/60" />
                                                    
                                                    <div className="space-y-6">
                                                        {[...followUp.history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log, idx) => (
                                                            <div key={log.id || idx} className="relative flex gap-4 pr-2">
                                                                {/* Timeline Dot */}
                                                                <div className="relative z-10 mt-1">
                                                                    <div className="h-2 w-2 rounded-full border-2 border-white dark:border-slate-950 bg-orange-500 shadow-[0_0_0_2px_rgba(249,115,22,0.1)]" />
                                                                </div>

                                                                <div className="flex-1 space-y-1.5">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="text-[10px] font-bold text-foreground/90">{log.recordedByUserName}</span>
                                                                        <span className="text-[9px] text-muted-foreground/60 font-medium">
                                                                            {format(parseISO(log.timestamp), 'h:mm a, MMM dd')}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-2.5 border border-border/40">
                                                                        <p className="text-[11px] font-semibold text-orange-600/90 dark:text-orange-400 leading-snug">
                                                                            {log.outcome}
                                                                        </p>
                                                                        {log.notes && (
                                                                            <p className="text-[10px] text-muted-foreground/80 mt-1 italic leading-relaxed">
                                                                                "{log.notes}"
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </ScrollArea>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5" 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setIsDeleteDialogOpen(true); 
                                }}
                            >
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-3xl p-8 max-w-[400px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
                             Confirm Deletion
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm pt-2">
                            This will permanently delete <span className="font-bold text-foreground">"{followUp.businessName || followUp.contactName}"</span>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-4 flex !justify-center gap-3">
                        <AlertDialogCancel className="rounded-2xl h-11 px-6 font-semibold border-none hover:bg-muted m-0">
                            No, Cancel
                        </AlertDialogCancel>
                        <Button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="rounded-2xl h-11 px-8 font-bold bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20 m-0"
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Yes, Delete
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
};

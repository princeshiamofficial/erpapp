
"use client";

import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import type { Lead } from '@/types';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { parseISO, format, isToday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LeadCalendarViewProps {
  leads: Lead[];
  onEditLead: (lead: Lead) => void;
}

const getCategoryClass = (category: string) => {
    switch (category) {
        case 'POP': return 'bg-sky-500';
        case 'POG': return 'bg-blue-500';
        case 'OC': return 'bg-purple-500';
        case 'OD': return 'bg-green-500';
        case 'ROD': return 'bg-orange-500';
        default: return 'bg-gray-500';
    }
}

export function LeadCalendarView({ leads, onEditLead }: LeadCalendarViewProps) {
  const eventsByDate = React.useMemo(() => {
    const events: Record<string, Lead[]> = {};
    leads.forEach(lead => {
        const dateKey = lead.schedule ? parseISO(lead.schedule).toDateString() : parseISO(lead.date).toDateString();
        if (!events[dateKey]) {
            events[dateKey] = [];
        }
        events[dateKey].push(lead);
    });
    return events;
  }, [leads]);
  

  const DayWithEvents = (dayProps: { date: Date }) => {
    const dateKey = dayProps.date.toDateString();
    const dayEvents = eventsByDate[dateKey] || [];
    const isCurrentDay = isToday(dayProps.date);

    return (
        <Popover>
            <PopoverTrigger asChild disabled={dayEvents.length === 0}>
                <div className={cn(
                    "relative flex flex-col items-start justify-start p-2 w-full h-full rounded-md transition-colors border border-transparent",
                    dayEvents.length > 0 && "cursor-pointer hover:bg-accent hover:border-primary/50"
                )}>
                    <span className={cn(
                        "flex items-center justify-center text-xs h-6 w-6 rounded-full",
                        isCurrentDay ? "bg-primary text-primary-foreground font-semibold" : "font-medium"
                    )}>
                      {dayProps.date.getDate()}
                    </span>
                     <div className="flex-grow w-full mt-1.5 space-y-1">
                        {dayEvents.slice(0, 3).map(lead => (
                            <div key={lead.id} className="flex items-center gap-1.5 w-full">
                                <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", getCategoryClass(lead.category))}></div>
                                <span className="text-xs text-foreground/80 truncate">{lead.contactName}</span>
                            </div>
                        ))}
                         {dayEvents.length > 3 && 
                           <div className="text-xs text-muted-foreground ml-3.5 pt-0.5">
                             + {dayEvents.length - 3} more
                           </div>
                         }
                    </div>
                </div>
            </PopoverTrigger>
            {dayEvents.length > 0 && (
                <PopoverContent className="w-72 p-2">
                    <div className="font-semibold text-sm mb-2 px-2 pt-1">{format(dayProps.date, "PPP")}</div>
                    <ScrollArea className="max-h-60">
                        <div className="space-y-1 pr-2">
                            {dayEvents.map(lead => (
                                <div key={lead.id} className="p-1.5 rounded-md hover:bg-muted" >
                                    <div className="flex items-center gap-2">
                                        <div className={cn("h-2 w-2 rounded-full shrink-0", getCategoryClass(lead.category))}></div>
                                        <span className="text-xs font-medium truncate">{lead.contactName}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground ml-4 truncate">{lead.businessName}</p>
                                    <div className="flex justify-end mt-1">
                                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => onEditLead(lead)}>View Lead</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </PopoverContent>
            )}
        </Popover>
    );
  };
  
  return (
    <div className="p-0 sm:p-4 bg-card rounded-lg shadow-sm mt-4">
      <Calendar
        mode="single"
        className="w-full"
        components={{
            Day: DayWithEvents,
        }}
      />
    </div>
  );
}

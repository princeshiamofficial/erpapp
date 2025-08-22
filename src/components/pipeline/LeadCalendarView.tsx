
"use client";

import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import type { Lead } from '@/types';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { parseISO, format, isToday, isBefore, startOfDay } from 'date-fns';
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

// Define DayWithEvents outside of LeadCalendarView to prevent re-creation on every render
const DayWithEvents = ({ date, dayEvents, onEditLead }: { date: Date; dayEvents: Lead[]; onEditLead: (lead: Lead) => void; }) => {
    const isCurrentDay = isToday(date);
    const today = startOfDay(new Date());
    const isPastDate = isBefore(date, today);

    const cardBackgroundColor = () => {
        if (isPastDate && dayEvents.length > 0) {
            return 'bg-destructive/10 dark:bg-destructive/20 border-destructive/20';
        }
        if (!isPastDate && dayEvents.length > 0) {
            return 'bg-green-100/80 dark:bg-green-900/30 border-green-500/20';
        }
        return 'border-border/20';
    };

    return (
        <Popover>
            <PopoverTrigger asChild disabled={dayEvents.length === 0}>
                <div className={cn(
                    "relative flex flex-col items-start justify-start p-2 h-full rounded-md transition-colors",
                    dayEvents.length > 0 && "cursor-pointer hover:bg-accent/50",
                    cardBackgroundColor(),
                    'ml-1' // Added margin to the left
                )}>
                    <span className={cn(
                        "flex items-center justify-center text-xs h-6 w-6 rounded-full font-medium",
                        isCurrentDay ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    )}>
                      {date.getDate()}
                    </span>
                     <div className="flex-grow w-full mt-1 space-y-1">
                        {dayEvents.slice(0, 2).map(lead => (
                            <div key={lead.id} className="flex items-center gap-1.5 w-full">
                                <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", getCategoryClass(lead.category))}></div>
                                <span className="text-xs text-foreground/80 truncate">{lead.contactName}</span>
                            </div>
                        ))}
                         {dayEvents.length > 2 &&
                           <div className="text-xs text-muted-foreground ml-3.5 pt-0.5">
                             + {dayEvents.length - 2} more
                           </div>
                         }
                    </div>
                </div>
            </PopoverTrigger>
            {dayEvents.length > 0 && (
                <PopoverContent className="w-72 p-2">
                    <div className="font-semibold text-sm mb-2 px-2 pt-1">{format(date, "PPP")}</div>
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


export function LeadCalendarView({ leads, onEditLead }: LeadCalendarViewProps) {
  const eventsByDate = React.useMemo(() => {
    const events: Record<string, Lead[]> = {};
    leads.forEach(lead => {
      if (lead.schedule) { // Only process leads that have a schedule date
        try {
            const dateKey = parseISO(lead.schedule).toDateString();
            if (!events[dateKey]) {
                events[dateKey] = [];
            }
            events[dateKey].push(lead);
        } catch (e) {
            console.error("Invalid schedule date found for lead:", lead.id, lead.schedule);
        }
      }
    });
    return events;
  }, [leads]);

  return (
    <div className="p-0 sm:p-4 bg-black rounded-lg shadow-lg mt-4">
      <Calendar
        mode="single"
        className="w-full"
        classNames={{
          day_cell: 'h-24 w-full' // Ensure cells can grow
        }}
        components={{
            Day: (props) => (
                <DayWithEvents 
                    date={props.date} 
                    dayEvents={eventsByDate[props.date.toDateString()] || []}
                    onEditLead={onEditLead}
                />
            ),
        }}
      />
    </div>
  );
}

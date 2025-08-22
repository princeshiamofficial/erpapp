"use client";

import React from 'react';
import { Calendar2 as Calendar } from '@/components/ui/calendar2';
import type { Lead } from '@/types';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { parseISO, format, isToday } from 'date-fns';
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

const DayWithEvents = ({ date, dayEvents, onEditLead, isOutside }: { date: Date; dayEvents: Lead[]; onEditLead: (lead: Lead) => void; isOutside?: boolean }) => {
    const isCurrentDay = isToday(date);
    
    return (
        <Popover>
            <PopoverTrigger asChild disabled={dayEvents.length === 0}>
                 <div className={cn(
                    "relative flex flex-col items-start justify-start p-1.5 h-full rounded-sm transition-all w-full border border-transparent",
                    dayEvents.length > 0 && "cursor-pointer hover:border-primary",
                    isCurrentDay && "border-primary"
                )}>
                    <span className={cn(
                        "flex items-center justify-center text-xs h-6 w-6 rounded-full font-medium",
                        isCurrentDay ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                        isOutside && "text-muted-foreground/50"
                    )}>
                      {format(date, 'd')}
                    </span>
                     <div className="flex-grow w-full mt-1 space-y-1 overflow-hidden">
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
                <PopoverContent className="w-64 p-2 bg-red-50 border-red-200 shadow-lg">
                    <div className="font-semibold text-sm mb-2 px-2 pt-1 text-red-900">{format(date, "PPP")}</div>
                    <ScrollArea className="max-h-56">
                        <div className="space-y-1 pr-2">
                            {dayEvents.map(lead => (
                                <div key={lead.id} className="p-1.5 rounded-md hover:bg-red-100" >
                                    <div className="flex items-center gap-2">
                                        <div className={cn("h-2 w-2 rounded-full shrink-0", getCategoryClass(lead.category))}></div>
                                        <span className="text-xs font-medium truncate text-red-900">{lead.contactName}</span>
                                    </div>
                                    <p className="text-xs text-red-800/80 ml-4 truncate">{lead.businessName}</p>
                                    <div className="flex justify-end mt-1">
                                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-red-900 hover:bg-red-200 hover:text-red-900" onClick={() => onEditLead(lead)}>View</Button>
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
      if (lead.schedule) { 
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
    <div className="bg-card rounded-lg shadow-sm border mt-4 h-full w-full flex flex-col p-1 sm:p-2">
      <Calendar
        className="w-full flex-grow"
        components={{
            Day: (props) => (
                <DayWithEvents 
                    date={props.date}
                    isOutside={props.outside}
                    dayEvents={eventsByDate[props.date.toDateString()] || []}
                    onEditLead={onEditLead}
                />
            ),
        }}
      />
    </div>
  );
}

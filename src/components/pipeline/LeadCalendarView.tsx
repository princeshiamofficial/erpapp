
"use client";

import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import type { Lead } from '@/types';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { parseISO, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

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

    if (dayEvents.length === 0) {
      return (
        <div className="relative flex flex-col items-end justify-start p-1 w-full h-full">
          <span className="text-xs text-muted-foreground">{dayProps.date.getDate()}</span>
        </div>
      );
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="relative flex flex-col items-end justify-start p-1 w-full h-full cursor-pointer hover:bg-accent rounded-md transition-colors">
                    <span className="text-xs font-medium">{dayProps.date.getDate()}</span>
                     <div className="flex flex-wrap gap-1 justify-end mt-1">
                        {dayEvents.slice(0, 3).map(lead => (
                            <div key={lead.id} className={cn("h-1.5 w-1.5 rounded-full", getCategoryClass(lead.category))}></div>
                        ))}
                         {dayEvents.length > 3 && <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground"></div>}
                    </div>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2">
                <div className="font-semibold text-sm mb-2">{format(dayProps.date, "PPP")}</div>
                <div className="space-y-2">
                    {dayEvents.map(lead => (
                        <div key={lead.id} className="p-1.5 rounded-md hover:bg-muted cursor-pointer" onClick={() => onEditLead(lead)}>
                            <div className="flex items-center gap-2">
                                <div className={cn("h-2 w-2 rounded-full shrink-0", getCategoryClass(lead.category))}></div>
                                <span className="text-xs font-medium truncate">{lead.contactName}</span>
                            </div>
                            <p className="text-xs text-muted-foreground ml-4 truncate">{lead.businessName}</p>
                        </div>
                    ))}
                </div>
            </PopoverContent>
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


"use client";

import React from 'react';
import type { Lead } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { User, Phone, CalendarDays, UserCheck, History, StickyNote, MessageSquare } from 'lucide-react'; // Import icons

interface LeadReportViewProps {
  leads: Lead[];
}

const formatDateSafe = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'd MMM, yyyy');
  } catch (e) {
    return 'Invalid Date';
  }
};

export function LeadReportView({ leads }: LeadReportViewProps) {
  const getRecentActivityNote = (lead: Lead): string => {
    if (!lead.activityHistory || lead.activityHistory.length === 0) {
      return 'No activities yet';
    }
    // Sort to be sure, although they are usually appended
    const sortedActivities = [...lead.activityHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return sortedActivities[0].notes || sortedActivities[0].activity;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Report</CardTitle>
        <CardDescription>
          Detailed report of all leads matching the current filters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-100 dark:bg-gray-800 shadow-md">
              <TableRow>
                <TableHead className="whitespace-nowrap"><User className="h-4 w-4 mr-2 inline-block"/>Contact</TableHead>
                <TableHead className="whitespace-nowrap"><Phone className="h-4 w-4 mr-2 inline-block"/>Phone</TableHead>
                <TableHead className="whitespace-nowrap"><UserCheck className="h-4 w-4 mr-2 inline-block"/>Assigned CRM</TableHead>
                <TableHead className="whitespace-nowrap"><CalendarDays className="h-4 w-4 mr-2 inline-block"/>Date</TableHead>
                <TableHead className="whitespace-nowrap"><History className="h-4 w-4 mr-2 inline-block"/>Update Date</TableHead>
                <TableHead className="whitespace-nowrap"><StickyNote className="h-4 w-4 mr-2 inline-block"/>Note</TableHead>
                <TableHead className="whitespace-nowrap"><MessageSquare className="h-4 w-4 mr-2 inline-block"/>Recent Activity Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length > 0 ? (
                leads.map(lead => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.contactName}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell className="whitespace-nowrap">{lead.crmName}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateSafe(lead.date)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateSafe(lead.updatedAt)}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-xs">{lead.notes || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-xs">{getRecentActivityNote(lead)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No leads found for the current filter criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

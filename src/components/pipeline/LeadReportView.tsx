
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
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Assigned CRM</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Update Date</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Recent Activity Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length > 0 ? (
                leads.map(lead => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.contactName}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell>{lead.crmName}</TableCell>
                    <TableCell>{formatDateSafe(lead.date)}</TableCell>
                    <TableCell>{formatDateSafe(lead.updatedAt)}</TableCell>
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

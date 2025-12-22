
"use client";

import React, { useMemo, useState } from 'react';
import type { Lead, User } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { User as UserIcon, Phone, CalendarDays, History, StickyNote, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { cn } from '@/lib/utils';

interface LeadReportViewProps {
  leads: Lead[];
  allUsers: User[];
}

const ITEMS_PER_PAGE = 25;

const formatDateSafe = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'd MMM, yyyy');
  } catch (e) {
    return 'Invalid Date';
  }
};

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};


export function LeadReportView({ leads, allUsers }: LeadReportViewProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(leads.length / ITEMS_PER_PAGE);

  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return leads.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [leads, currentPage]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);

      if (currentPage < 3) {
        endPage = maxPagesToShow;
      } else if (currentPage > totalPages - 2) {
        startPage = totalPages - maxPagesToShow + 1;
      }

      if (startPage > 1) {
        pageNumbers.push(1);
        if (startPage > 2) {
          pageNumbers.push('...');
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pageNumbers.push('...');
        }
        pageNumbers.push(totalPages);
      }
    }

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }}
              aria-disabled={currentPage === 1}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          {pageNumbers.map((page, index) => (
            <PaginationItem key={index}>
              {page === '...' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  href="#"
                  onClick={(e) => { e.preventDefault(); setCurrentPage(page as number); }}
                  isActive={currentPage === page}
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
              aria-disabled={currentPage === totalPages}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };
  
  const getRecentActivityNote = (lead: Lead): string => {
    if (!lead.activityHistory || lead.activityHistory.length === 0) {
      return 'No activities yet';
    }
    const sortedActivities = [...lead.activityHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return sortedActivities[0].notes || sortedActivities[0].activity;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-100 dark:bg-gray-800 shadow-md">
              <TableRow>
                <TableHead className="whitespace-nowrap"><UserIcon className="h-4 w-4 mr-2 inline-block"/>Contact</TableHead>
                <TableHead className="whitespace-nowrap"><Phone className="h-4 w-4 mr-2 inline-block"/>Phone</TableHead>
                <TableHead className="whitespace-nowrap"><CalendarDays className="h-4 w-4 mr-2 inline-block"/>Date</TableHead>
                <TableHead className="whitespace-nowrap"><UserIcon className="h-4 w-4 mr-2 inline-block"/>Assigned CRM</TableHead>
                <TableHead className="whitespace-nowrap"><History className="h-4 w-4 mr-2 inline-block"/>Update Date</TableHead>
                <TableHead className="whitespace-nowrap"><StickyNote className="h-4 w-4 mr-2 inline-block"/>Note</TableHead>
                <TableHead className="whitespace-nowrap"><MessageSquare className="h-4 w-4 mr-2 inline-block"/>Recent Activity Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.length > 0 ? (
                paginatedLeads.map(lead => {
                  const crmUser = allUsers.find(u => u.id === lead.crmId);
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.contactName}</TableCell>
                      <TableCell>{lead.phone}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateSafe(lead.date)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 text-xs">
                                <AvatarImage src={crmUser?.avatarUrl || undefined} alt={lead.crmName} />
                                <AvatarFallback>{getInitials(lead.crmName)}</AvatarFallback>
                            </Avatar>
                            <span>{lead.crmName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateSafe(lead.updatedAt)}</TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-xs">{lead.notes || 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-xs">{getRecentActivityNote(lead)}</TableCell>
                    </TableRow>
                  );
                })
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
       <CardFooter className="py-4 border-t">
          {renderPagination()}
      </CardFooter>
    </Card>
  );
}

"use client";

import type { Lead, User } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, Trash2, Users, MoreVertical, Briefcase } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LeadListViewProps {
  leads: Lead[];
  isLoading: boolean;
  currentUser: User | null;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (lead: Lead) => void;
  onTransferLead: (lead: Lead) => void;
  allCrmUsers: User[];
}

const formatDateSafe = (dateString?: string) => {
  if (!dateString) return 'No Date';
  try {
    return format(parseISO(dateString), 'd MMM, yyyy');
  } catch (e) {
    return 'Invalid Date';
  }
};

const getInitials = (name: string | undefined) => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names[names.length - 1] ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

const getStatusBadgeClass = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('won')) return 'bg-green-100 text-green-800 border-green-200';
    if (s.includes('lost')) return 'bg-red-100 text-red-800 border-red-200';
    if (s.includes('proposal') || s.includes('negotiation')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (s.includes('qualified')) return 'bg-sky-100 text-sky-800 border-sky-200';
    if (s.includes('contacted')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // Default for New Lead
};

export function LeadListView({ leads, isLoading, currentUser, onEditLead, onDeleteLead, onTransferLead, allCrmUsers }: LeadListViewProps) {
  const canEdit = (lead: Lead) => currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.id === lead.crmId;
  const canDelete = (lead: Lead) => currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN';
  const canTransfer = (lead: Lead) => currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.id === lead.crmId;

  return (
    <div className="mt-4 border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Assigned CRM</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        [...Array(12)].map((_, i) => (
                            <TableRow key={`skel-${i}`}>
                                <TableCell><div className="flex items-center gap-2"><Skeleton className="h-5 w-24" /></div></TableCell>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                <TableCell><div className="flex items-center gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-5 w-24" /></div></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                            </TableRow>
                        ))
                    ) : leads.length > 0 ? (
                        leads.map(lead => {
                            const crmUser = allCrmUsers.find(u => u.id === lead.crmId);
                            return (
                                <TableRow key={lead.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium text-foreground">{lead.contactName}</TableCell>
                                    <TableCell>{lead.businessName}</TableCell>
                                    <TableCell>{lead.phone}</TableCell>
                                    <TableCell>{lead.source}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{lead.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8 text-xs">
                                                <AvatarImage src={crmUser?.avatarUrl || undefined} alt={lead.crmName} />
                                                <AvatarFallback>{getInitials(lead.crmName)}</AvatarFallback>
                                            </Avatar>
                                            <span>{lead.crmName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatDateSafe(lead.date)}</TableCell>
                                    <TableCell className="text-right">
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {canEdit(lead) && <DropdownMenuItem onSelect={() => onEditLead(lead)} className="cursor-pointer"><Edit className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>}
                                                {canTransfer(lead) && <DropdownMenuItem onSelect={() => onTransferLead(lead)} className="cursor-pointer"><Users className="mr-2 h-4 w-4"/> Transfer</DropdownMenuItem>}
                                                {canDelete(lead) && <DropdownMenuItem onSelect={() => onDeleteLead(lead)} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>}
                                                {!canEdit(lead) && !canTransfer(lead) && !canDelete(lead) && <DropdownMenuItem disabled>No actions available</DropdownMenuItem>}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                                <div className="flex flex-col items-center gap-2">
                                    <Briefcase className="h-10 w-10 opacity-50" />
                                    <span>No leads found.</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    </div>
  );
}

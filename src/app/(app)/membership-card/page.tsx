"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  PlusCircle, 
  Search, 
  MoreVertical, 
  Crown, 
  Trash2, 
  Edit3,
  CreditCard as CreditCardIcon
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";

interface MemberCard {
  id: string;
  cardNo: string;
  name: string;
  phone: string;
  tier: 'Silver' | 'Gold' | 'Platinum';
  points: number;
  issueDate: string;
  expiryDate: string;
  status: 'Active' | 'Suspended' | 'Pending';
}

const INITIAL_MEMBERS: MemberCard[] = [
  { id: '1', cardNo: 'CH-SLV-89410', name: 'Zahid Hasan', phone: '01712345678', tier: 'Silver', points: 350, issueDate: '2026-01-15', expiryDate: '2027-01-15', status: 'Active' },
  { id: '2', cardNo: 'CH-GLD-29315', name: 'Anisur Rahman', phone: '01898765432', tier: 'Gold', points: 1250, issueDate: '2025-11-20', expiryDate: '2026-11-20', status: 'Active' },
  { id: '3', cardNo: 'CH-PLT-50123', name: 'Tasnim Jahan', phone: '01911223344', tier: 'Platinum', points: 3400, issueDate: '2025-08-10', expiryDate: '2026-08-10', status: 'Active' },
  { id: '4', cardNo: 'CH-SLV-77124', name: 'Kamrul Islam', phone: '01555667788', tier: 'Silver', points: 120, issueDate: '2026-03-01', expiryDate: '2027-03-01', status: 'Pending' },
  { id: '5', cardNo: 'CH-GLD-44189', name: 'Sumaiya Akter', phone: '01677889900', tier: 'Gold', points: 1550, issueDate: '2025-12-05', expiryDate: '2026-12-05', status: 'Active' },
  { id: '6', cardNo: 'CH-SLV-30214', name: 'Imran Khan', phone: '01311224455', tier: 'Silver', points: 450, issueDate: '2026-02-18', expiryDate: '2027-02-18', status: 'Suspended' }
];

const ITEMS_PER_PAGE = 25;

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), 'd MMM yyyy');
  } catch (e) {
    return "Invalid Date";
  }
};

export default function MembershipCardPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [members, setMembers] = useState<MemberCard[]>(INITIAL_MEMBERS);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberCard | null>(null);
  
  // Form States
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formTier, setFormTier] = useState<'Silver' | 'Gold' | 'Platinum'>('Silver');
  const [formPoints, setFormPoints] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<'Active' | 'Suspended' | 'Pending'>('Active');
  
  const [currentPage, setCurrentPage] = useState(1);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone.includes(searchTerm) ||
        m.cardNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.tier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.status.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [members, searchTerm]);

  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);

  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMembers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMembers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleOpenAddDialog = () => {
    setSelectedMember(null);
    setFormName('');
    setFormPhone('');
    setFormTier('Silver');
    setFormPoints(0);
    setFormStatus('Active');
    setIsAddEditOpen(true);
  };

  const handleOpenEditDialog = (member: MemberCard) => {
    setSelectedMember(member);
    setFormName(member.name);
    setFormPhone(member.phone);
    setFormTier(member.tier);
    setFormPoints(member.points);
    setFormStatus(member.status);
    setIsAddEditOpen(true);
  };

  const handleSave = () => {
    if (!formName || !formPhone) {
      toast({ title: "Validation Error", description: "Name and Phone Number are required.", variant: "destructive" });
      return;
    }

    if (selectedMember) {
      // Edit mode
      setMembers(prev => prev.map(m => m.id === selectedMember.id ? {
        ...m,
        name: formName,
        phone: formPhone,
        tier: formTier,
        points: formPoints,
        status: formStatus
      } : m));
      toast({ title: "Member Updated", description: "Membership card details updated successfully." });
    } else {
      // Add mode
      const randomId = Math.random().toString(36).substring(7);
      const prefix = formTier === 'Silver' ? 'SLV' : formTier === 'Gold' ? 'GLD' : 'PLT';
      const randomNo = Math.floor(10000 + Math.random() * 90000);
      const newCard: MemberCard = {
        id: randomId,
        cardNo: `CH-${prefix}-${randomNo}`,
        name: formName,
        phone: formPhone,
        tier: formTier,
        points: formPoints,
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        status: formStatus
      };
      setMembers(prev => [newCard, ...prev]);
      toast({ title: "Card Issued", description: `Issued a new ${formTier} membership card.` });
    }
    setIsAddEditOpen(false);
  };

  const handleDelete = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    toast({ title: "Card Terminated", description: "Membership card has been terminated.", variant: "destructive" });
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis1');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('ellipsis2');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              href="#" 
              onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(currentPage - 1); }}
              className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
            />
          </PaginationItem>
          
          {pages.map((page, idx) => (
            <PaginationItem key={idx}>
              {page === 'ellipsis1' || page === 'ellipsis2' ? (
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
              onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setCurrentPage(currentPage + 1); }}
              className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  if (!currentUser || !['SYSTEM_ADMIN', 'ADMIN', 'CRM'].includes(currentUser.role)) {
    return <div className="p-8 text-center">Access Denied.</div>
  }

  return (
    <>
      <div className="space-y-6 p-1 sm:p-0">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
          <div>
            <h1 className="page-title">Membership Cards</h1>
            <p className="page-description">Manage and issue premium tier loyalty membership cards to your high-value customers.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button size="lg" onClick={handleOpenAddDialog} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-10 shadow-md">
              <PlusCircle className="mr-2 h-5 w-5" />Issue Membership Card
            </Button>
          </div>
        </div>

        {/* Main Database Table Card */}
        <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-card-foreground text-xl">All Membership Cards</CardTitle>
              <div className="relative flex-grow sm:flex-grow-0 sm:max-w-xs w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search member, phone, card..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="pl-10 bg-background h-10 rounded-md w-full" 
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Card No</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMembers.length > 0 ? (
                    paginatedMembers.map((member) => {
                      return (
                        <TableRow key={member.id} className="hover:bg-muted/50">
                          <TableCell className="pl-6 font-mono text-primary font-bold">{member.cardNo}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">{member.phone}</TableCell>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>{member.tier}</TableCell>
                          <TableCell>{member.points}</TableCell>
                          <TableCell>{formatDate(member.issueDate)}</TableCell>
                          <TableCell className="max-w-[250px] truncate text-muted-foreground text-sm" title={formatDate(member.expiryDate)}>
                            {formatDate(member.expiryDate)}
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full",
                              member.status === 'Active' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                              member.status === 'Pending' && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                              member.status === 'Suspended' && "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            )}>
                              {member.status}
                            </span>
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleOpenEditDialog(member)} className="cursor-pointer">
                                  <Edit3 className="mr-2 h-4 w-4" />Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => {
                                  const nextTier = member.tier === 'Silver' ? 'Gold' : 'Platinum';
                                  setMembers(prev => prev.map(m => m.id === member.id ? { ...m, tier: nextTier, points: m.points + 500 } : m));
                                  toast({ title: "Tier Upgraded", description: `${member.name} upgraded to ${nextTier} tier!` });
                                }} disabled={member.tier === 'Platinum'} className="cursor-pointer">
                                  <Crown className="mr-2 h-4 w-4 text-amber-400" />Upgrade Tier
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleDelete(member.id)} className="cursor-pointer text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />Terminate Card
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-48 text-center text-muted-foreground">
                        <CreditCardIcon className="mx-auto h-12 w-12 opacity-30 mb-3" />
                        No members matching filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="py-4 border-t flex justify-center">
            {renderPagination()}
          </CardFooter>
        </Card>
      </div>

      {/* Add / Edit Card Modal */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedMember ? "Edit Membership Card" : "Issue New Loyalty Card"}</DialogTitle>
            <DialogDescription>
              {selectedMember ? "Modify this member's details and loyalty points database record." : "Issue a new brand membership loyalty card."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Customer Name</Label>
              <Input 
                id="name" 
                value={formName} 
                onChange={(e) => setFormName(e.target.value)} 
                placeholder="e.g. Zahid Hasan" 
                className="col-span-3" 
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Phone Number</Label>
              <Input 
                id="phone" 
                value={formPhone} 
                onChange={(e) => setFormPhone(e.target.value)} 
                placeholder="e.g. 01712345678" 
                className="col-span-3" 
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tier" className="text-right">Member Tier</Label>
              <Select value={formTier} onValueChange={(val: any) => setFormTier(val)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Silver">Silver VIP</SelectItem>
                  <SelectItem value="Gold">Gold VIP</SelectItem>
                  <SelectItem value="Platinum">Platinum VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="points" className="text-right">Loyalty Points</Label>
              <Input 
                id="points" 
                type="number" 
                value={formPoints} 
                onChange={(e) => setFormPoints(parseInt(e.target.value) || 0)} 
                placeholder="Initial loyalty points" 
                className="col-span-3" 
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending">Pending Approval</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

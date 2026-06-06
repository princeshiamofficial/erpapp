"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CreditCard, 
  PlusCircle, 
  Search, 
  Gift, 
  Award, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  MoreVertical, 
  Sparkles, 
  ShieldCheck, 
  Crown, 
  Trash2, 
  Edit3, 
  UserCheck 
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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

export default function MembershipCardPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [members, setMembers] = useState<MemberCard[]>(INITIAL_MEMBERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberCard | null>(null);
  
  // Form States
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formTier, setFormTier] = useState<'Silver' | 'Gold' | 'Platinum'>('Silver');
  const [formPoints, setFormPoints] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<'Active' | 'Suspended' | 'Pending'>('Active');
  
  // Highlighted card in preview (defaults to the first one)
  const [previewIndex, setPreviewIndex] = useState(0);

  const stats = useMemo(() => {
    return {
      total: members.length,
      active: members.filter(m => m.status === 'Active').length,
      platinum: members.filter(m => m.tier === 'Platinum').length,
      points: members.reduce((sum, m) => sum + m.points, 0)
    };
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone.includes(searchTerm) ||
        m.cardNo.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesTier = tierFilter === 'all' || m.tier === tierFilter;
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      
      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [members, searchTerm, tierFilter, statusFilter]);

  const activePreviewMember = useMemo(() => {
    if (filteredMembers.length > 0) {
      const index = Math.min(previewIndex, filteredMembers.length - 1);
      return filteredMembers[index >= 0 ? index : 0];
    }
    return members[0];
  }, [filteredMembers, previewIndex, members]);

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

  // Helper styles for glassmorphism membership cards
  const getCardStyle = (tier: 'Silver' | 'Gold' | 'Platinum') => {
    switch (tier) {
      case 'Platinum':
        return {
          background: 'linear-gradient(135deg, rgba(30,30,40,0.85) 0%, rgba(15,15,20,0.95) 100%)',
          border: '1px solid rgba(255,255,255,0.15)',
          glow: 'rgba(255,255,255,0.1)',
          badgeClass: 'bg-slate-200 text-slate-900 border-slate-300',
          textColor: 'text-slate-100',
          subText: 'text-slate-400',
          accentColor: '#E2E8F0',
          cardIcon: <Crown className="w-8 h-8 text-slate-300" />
        };
      case 'Gold':
        return {
          background: 'linear-gradient(135deg, rgba(234,179,8,0.2) 0%, rgba(202,138,4,0.3) 50%, rgba(133,77,14,0.4) 100%)',
          border: '1px solid rgba(234,179,8,0.35)',
          glow: 'rgba(234,179,8,0.2)',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          textColor: 'text-amber-100',
          subText: 'text-amber-200/60',
          accentColor: '#F59E0B',
          cardIcon: <Sparkles className="w-8 h-8 text-amber-400" />
        };
      default: // Silver
        return {
          background: 'linear-gradient(135deg, rgba(148,163,184,0.15) 0%, rgba(100,116,139,0.25) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          glow: 'rgba(255,255,255,0.05)',
          badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
          textColor: 'text-slate-200',
          subText: 'text-slate-400',
          accentColor: '#94A3B8',
          cardIcon: <Award className="w-8 h-8 text-slate-400" />
        };
    }
  };

  const cardDesign = getCardStyle(activePreviewMember?.tier || 'Silver');

  return (
    <div className="space-y-8 p-1 sm:p-0">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-primary" />
            Loyalty & Membership Cards
          </h1>
          <p className="page-description">Manage and issue premium tier loyalty membership cards to your high-value customers.</p>
        </div>
        <Button size="lg" onClick={handleOpenAddDialog} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-10 shadow-lg transition-transform hover:scale-[1.02]">
          <PlusCircle className="mr-2 h-5 w-5" /> Issue Membership Card
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: "Total Members", val: stats.total, desc: "Issued cards database", icon: <Users className="w-5 h-5 text-indigo-400" />, bg: "bg-indigo-500/10 border-indigo-500/20" },
          { title: "Active Members", val: stats.active, desc: "Excluding suspended/pending", icon: <UserCheck className="w-5 h-5 text-emerald-400" />, bg: "bg-emerald-500/10 border-emerald-500/20" },
          { title: "Platinum Members", val: stats.platinum, desc: "Highest VIP tier status", icon: <Crown className="w-5 h-5 text-amber-400" />, bg: "bg-amber-500/10 border-amber-500/20" },
          { title: "Total Loyalty Points", val: stats.points.toLocaleString(), desc: "Accumulated by custom purchases", icon: <Gift className="w-5 h-5 text-rose-400" />, bg: "bg-rose-500/10 border-rose-500/20" }
        ].map((item, idx) => (
          <Card key={idx} className={`shadow-md border ${item.bg}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-sm font-semibold text-muted-foreground">{item.title}</span>
              {item.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{item.val}</div>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card Interactive Preview */}
        <div className="lg:col-span-1 flex flex-col space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-primary" /> Active Membership Card View
          </h2>
          
          <AnimatePresence mode="wait">
            {activePreviewMember && (
              <motion.div
                key={activePreviewMember.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="relative w-full aspect-[1.58/1] rounded-2xl p-6 overflow-hidden flex flex-col justify-between shadow-2xl transition-all"
                style={{
                  background: cardDesign.background,
                  border: cardDesign.border,
                  boxShadow: `0 20px 45px -10px ${cardDesign.glow}`
                }}
              >
                {/* Background Glass Highlights */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-xl pointer-events-none" />

                {/* Card Top Row */}
                <div className="flex justify-between items-start z-10">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-[0.2em] opacity-60">Color Hut Club</h3>
                    <p className={`text-xl font-bold ${cardDesign.textColor} tracking-tight flex items-center gap-1.5 mt-1`}>
                      {activePreviewMember.tier} VIP
                    </p>
                  </div>
                  {cardDesign.cardIcon}
                </div>

                {/* Card Middle Row (Card Number) */}
                <div className="z-10 py-2">
                  <p className="font-mono text-lg tracking-[0.15em] font-semibold text-slate-100/90 shadow-sm drop-shadow-md">
                    {activePreviewMember.cardNo}
                  </p>
                </div>

                {/* Card Bottom Row */}
                <div className="flex justify-between items-end z-10 border-t border-white/5 pt-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider opacity-40">Card Holder</p>
                    <p className="font-semibold text-sm text-white/90 truncate max-w-[150px]">{activePreviewMember.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider opacity-40">Loyalty Points</p>
                    <p className="font-bold text-sm text-white/95">{activePreviewMember.points} Pts</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider opacity-40">Expiry</p>
                    <p className="font-semibold text-xs text-white/90">{activePreviewMember.expiryDate}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="border shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Tier Rewards Matrix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs text-muted-foreground">
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-slate-400">Platinum Tier</span>
                <span className="text-slate-200">10% Cash Back, Free Priority Delivery, VIP Support</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-amber-400">Gold Tier</span>
                <span className="text-amber-200">5% Discount, Free Gifts, Double Points Days</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="font-semibold text-slate-500">Silver Tier</span>
                <span className="text-slate-300">1 Point per 10 BDT, Basic Exclusive Offers</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Database Grid */}
        <div className="lg:col-span-2">
          <Card className="shadow-xl border bg-card rounded-lg">
            
            {/* Filters Header */}
            <CardHeader className="border-b p-5">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-card-foreground text-lg flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-primary" /> Members Directory
                  </CardTitle>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search member, phone, card..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="pl-10 bg-background h-10 rounded-md" 
                    />
                  </div>
                  
                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="w-full sm:w-[140px] bg-background">
                      <SelectValue placeholder="Filter Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="Silver">Silver</SelectItem>
                      <SelectItem value="Gold">Gold</SelectItem>
                      <SelectItem value="Platinum">Platinum</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[140px] bg-background">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Member Card</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((member, index) => {
                        const styleConfig = getCardStyle(member.tier);
                        return (
                          <TableRow 
                            key={member.id} 
                            onClick={() => setPreviewIndex(index)}
                            className={cn(
                              "cursor-pointer hover:bg-muted/30 transition-colors",
                              activePreviewMember?.id === member.id && "bg-muted/40 font-medium border-l-4 border-l-primary"
                            )}
                          >
                            <TableCell className="pl-6">
                              <div>
                                <div className="font-semibold text-foreground">{member.name}</div>
                                <div className="text-xs text-muted-foreground font-mono">{member.cardNo}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm font-mono">{member.phone}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${styleConfig.badgeClass}`}>
                                {member.tier}
                              </span>
                            </TableCell>
                            <TableCell className="font-bold text-foreground">{member.points}</TableCell>
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
                            <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
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
                                    // Quick upgrade shortcut
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
                        <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                          <CreditCard className="mx-auto h-12 w-12 opacity-30 mb-3" />
                          No members matching filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
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
    </div>
  );
}

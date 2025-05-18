
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Link2, Eye, Edit3, Search, ClipboardCopy, Check, RefreshCw, Loader2 } from "lucide-react"; 
import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";
import Link from "next/link";
import type { TrackingLink, User, CustomStatus } from '@/types';
import { EditTrackingLinkDialog } from '@/components/tracking-links/edit-tracking-link-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getOrders } from '@/lib/order-service'; 
import { getContrastTextColor, getStatuses } from '@/lib/status-service'; // Removed getStatusById as getStatusDisplayInfo will use allStatuses
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast'; 

export default function TrackingLinksPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast(); 
  const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([]);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);


  const [selectedLink, setSelectedLink] = useState<TrackingLink | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedLinks, fetchedStatuses] = await Promise.all([
        getOrders(),
        getStatuses()
      ]);
      setTrackingLinks(fetchedLinks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setAllStatuses(fetchedStatuses);
    } catch (error) {
      console.error("Failed to fetch tracking links or statuses:", error);
      toast({ title: "Error", description: "Could not load tracking links or statuses.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [fetchData, currentUser]);

  const getStatusDisplayInfo = useCallback((statusId: string): { name: string; color: string; textColor: string } => {
    const status = allStatuses.find(s => s.id === statusId);
    if (status) {
      return { name: status.name, color: status.color, textColor: getContrastTextColor(status.color) };
    }
    return { name: statusId, color: '#A1A1AA', textColor: '#FFFFFF' }; 
  }, [allStatuses]);

  const canEditSpecificLink = (link: TrackingLink) => {
    if (!currentUser) return false;
    return ['ADMIN', 'SYSTEM_ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'].includes(currentUser.role);
  };
  
  const handleTrackingLinkUpdated = () => {
    fetchData(); 
    setIsEditDialogOpen(false);
  };

  const handleCopyLink = async (linkId: string) => {
    const urlToCopy = `${window.location.origin}/track/${linkId}`;
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API not available.");
      }
      await navigator.clipboard.writeText(urlToCopy);
      toast({ title: "Link Copied!", description: "The tracking link has been copied to your clipboard." });
      setCopiedLinkId(linkId);
      setTimeout(() => setCopiedLinkId(null), 2000); 
    } catch (err) {
      console.error('Failed to copy: ', err);
      let description = "Could not copy the link. Please try copying manually.";
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          description = "Clipboard access was denied. Please check your browser permissions or copy manually.";
        } else if (err.message.toLowerCase().includes("permissions policy")) {
          description = "Clipboard access is restricted by the current page's permissions policy. Please try copying manually.";
        } else if (err.message.includes("Clipboard API not available") || (typeof window !== 'undefined' && !window.isSecureContext)) {
           description = "Copying to clipboard requires a secure connection (HTTPS) or is not supported by your browser. Please copy manually.";
        }
      }
      toast({ title: "Copy Failed", description, variant: "destructive" });
    }
  };

  const filteredTrackingLinks = useMemo(() => {
    if (!searchTerm) return trackingLinks;
    return trackingLinks.filter(link => 
      link.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || // Keep searching by customer name
      (link.companyName && link.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (link.phoneNumber && link.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (link.service && link.service.toLowerCase().includes(searchTerm.toLowerCase())) ||
      link.crmUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (link.designerRepresentativeName && link.designerRepresentativeName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [trackingLinks, searchTerm]);

  const [orderStatusDisplay, setOrderStatusDisplay] = useState<Record<string, { name: string; color: string; textColor: string }>>({});

  useEffect(() => {
    if (allStatuses.length > 0 && filteredTrackingLinks.length > 0) {
      const newDisplayInfoMap: Record<string, { name: string; color: string; textColor: string }> = {};
      const uniqueStatusIds = new Set<string>();
      filteredTrackingLinks.forEach(link => uniqueStatusIds.add(link.currentStatus));
      
      uniqueStatusIds.forEach(statusId => {
        newDisplayInfoMap[statusId] = getStatusDisplayInfo(statusId);
      });
      setOrderStatusDisplay(newDisplayInfoMap);
    } else if (allStatuses.length > 0 && filteredTrackingLinks.length === 0 && Object.keys(orderStatusDisplay).length > 0) {
       setOrderStatusDisplay({}); 
    } else if (allStatuses.length === 0 && Object.keys(orderStatusDisplay).length > 0) {
       setOrderStatusDisplay({});
    }
  }, [filteredTrackingLinks, allStatuses, getStatusDisplayInfo, orderStatusDisplay]);


  if (!currentUser) return (
     <div className="flex h-screen w-full items-center justify-center">
       <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6 p-1 sm:p-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Tracking Links</h1>
          <p className="page-description">
            Manage and monitor public tracking links for orders.
          </p>
        </div>
      </div>

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-grow">
                    <CardTitle className="text-card-foreground text-xl">Active Tracking Links</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm mt-0.5">Overview of generated tracking links and their status.</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} className="h-10 w-10" title="Refresh Data">
                        <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <div className="relative flex-grow sm:flex-grow-0 sm:max-w-xs w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                        placeholder="Search links..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-background h-10 rounded-md w-full"
                        />
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Link ID (Order)</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>CRM Contact</TableHead>
                  <TableHead>Assigned DR</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                   [...Array(5)].map((_, i) => (
                    <TableRow key={`skel-link-${i}`}>
                      <TableCell className="pl-6"><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="pr-6 text-right space-x-2">
                        <Skeleton className="h-9 w-9 inline-block rounded-md" />
                        <Skeleton className="h-9 w-9 inline-block rounded-md" />
                        <Skeleton className="h-9 w-9 inline-block rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredTrackingLinks.length > 0 ? (
                  filteredTrackingLinks.map((link) => {
                    const statusInfo = orderStatusDisplay[link.currentStatus] || { name: link.currentStatus, color: '#A1A1AA', textColor: '#FFFFFF' };
                    return (
                      <TableRow key={link.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="pl-6">
                          <Link href={`/track/${link.id}`} className="font-medium text-primary hover:underline">
                            {link.id}
                          </Link>
                        </TableCell>
                        <TableCell className="text-card-foreground">{link.companyName} <br/><small className="text-muted-foreground">{link.customerName}</small></TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${link.isPublic ? 'bg-green-500/20 text-green-700 border-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20' : 'bg-red-500/20 text-red-700 border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20'}`}>
                            {link.isPublic ? 'Public' : 'Private'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: statusInfo.color, color: statusInfo.textColor }} className="border-transparent">
                            {statusInfo.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{link.viewCount || 0}</TableCell>
                        <TableCell className="text-card-foreground">{link.crmUserName}</TableCell>
                        <TableCell className="text-card-foreground">{link.designerRepresentativeName || 'N/A'}</TableCell>
                        <TableCell className="pr-6 text-right space-x-2 whitespace-nowrap">
                          <Button variant="outline" size="sm" className="h-9 px-3" onClick={() => handleCopyLink(link.id)} title="Copy Link">
                            {copiedLinkId === link.id ? <Check className="h-4 w-4 text-green-500" /> : <ClipboardCopy className="h-4 w-4" />}
                            <span className="ml-1.5 hidden sm:inline">{copiedLinkId === link.id ? "Copied!" : "Copy"}</span>
                          </Button>
                          <Link href={`/track/${link.id}`} passHref>
                            <Button variant="outline" size="sm" className="h-9 px-3">
                              <Eye className="mr-1.5 h-4 w-4" /> 
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </Link>
                          {canEditSpecificLink(link) && (
                            <Button variant="outline" size="sm" className="h-9 px-3" onClick={() => { setSelectedLink(link); setIsEditDialogOpen(true);}}>
                              <Edit3 className="mr-1.5 h-4 w-4" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 h-[300px]">
                            <Image src="https://placehold.co/180x135.png" alt="No tracking links" data-ai-hint="empty link" width={180} height={135} className="mx-auto rounded-md opacity-60 mb-4" />
                            <p className="text-lg text-muted-foreground font-medium">
                              {searchTerm ? "No tracking links match your search." : "No tracking links found."}
                            </p>
                             <p className="text-sm text-muted-foreground">
                                {searchTerm ? "Try a different search term." : "Orders will appear here once created."}
                            </p>
                        </TableCell>
                    </TableRow>
                 )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedLink && currentUser && allStatuses.length > 0 && (
        <EditTrackingLinkDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          trackingLink={selectedLink}
          currentUser={currentUser}
          availableStatuses={allStatuses}
          onTrackingLinkUpdated={handleTrackingLinkUpdated}
        />
      )}
    </div>
  );
}
    

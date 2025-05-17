
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Link2, Eye, Edit3, Search } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";
import Link from "next/link";
import type { TrackingLink, User, CustomStatus } from '@/types';
import { EditTrackingLinkDialog } from '@/components/tracking-links/edit-tracking-link-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getOrders } from '@/lib/order-service'; 
import { getStatusById, getContrastTextColor, getStatuses } from '@/lib/status-service';
import { Skeleton } from '@/components/ui/skeleton';

// Removed mockViews constant
// const mockViews: {[key: string]: number} = { ... };

export default function TrackingLinksPage() {
  const { currentUser } = useAuth();
  const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([]);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [selectedLink, setSelectedLink] = useState<TrackingLink | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedLinks, fetchedStatuses] = await Promise.all([
        getOrders(),
        getStatuses()
      ]);
      setTrackingLinks(fetchedLinks);
      setAllStatuses(fetchedStatuses);
    } catch (error) {
      console.error("Failed to fetch tracking links or statuses:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusDisplayInfo = useCallback(async (statusId: string): Promise<{ name: string; color: string; textColor: string }> => {
    const status = allStatuses.find(s => s.id === statusId) || await getStatusById(statusId);
    if (status) {
      return { name: status.name, color: status.color, textColor: getContrastTextColor(status.color) };
    }
    return { name: statusId, color: '#ccc', textColor: '#000' };
  }, [allStatuses]);

  const canEditSpecificLink = (link: TrackingLink) => {
    if (!currentUser) return false;
    return ['ADMIN', 'DESIGNER_REPRESENTATIVE', 'CRM', 'SYSTEM_ADMIN'].includes(currentUser.role);
  };
  
  const handleTrackingLinkUpdated = () => {
    fetchData(); 
    setIsEditDialogOpen(false);
  };

  const filteredTrackingLinks = useMemo(() => {
    if (!searchTerm) return trackingLinks;
    return trackingLinks.filter(link => 
      link.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (link.phoneNumber && link.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (link.service && link.service.toLowerCase().includes(searchTerm.toLowerCase())) ||
      link.crmUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (link.designerRepresentativeName && link.designerRepresentativeName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [trackingLinks, searchTerm]);

  const [orderStatusDisplay, setOrderStatusDisplay] = useState<Record<string, { name: string; color: string; textColor: string }>>({});

  useEffect(() => {
    const fetchAllDisplayInfo = async () => {
      const displayInfoMap: Record<string, { name: string; color: string; textColor: string }> = {};
      for (const link of filteredTrackingLinks) {
        if (!orderStatusDisplay[link.currentStatus]) {
          displayInfoMap[link.currentStatus] = await getStatusDisplayInfo(link.currentStatus);
        }
      }
      setOrderStatusDisplay(prev => ({ ...prev, ...displayInfoMap }));
    };
    if (filteredTrackingLinks.length > 0 && allStatuses.length > 0) {
      fetchAllDisplayInfo();
    }
  }, [filteredTrackingLinks, getStatusDisplayInfo, allStatuses, orderStatusDisplay]);


  if (!currentUser) return (
     <div className="flex h-screen w-full items-center justify-center">
      <p>Loading user data...</p>
    </div>
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
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
                <div>
                    <CardTitle className="text-card-foreground text-xl">Active Tracking Links</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm mt-0.5">Overview of generated tracking links and their status.</CardDescription>
                </div>
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                    placeholder="Search links (ID, Customer, Service...)"
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
                  <TableHead className="pl-6">Link ID (Order)</TableHead>
                  <TableHead>Customer</TableHead>
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
                   [...Array(3)].map((_, i) => (
                    <TableRow key={`skel-link-${i}`}>
                      <TableCell className="pl-6"><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="pr-6 text-right space-x-2">
                        <Skeleton className="h-8 w-8 inline-block rounded" />
                        <Skeleton className="h-8 w-8 inline-block rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredTrackingLinks.length > 0 ? (
                  filteredTrackingLinks.map((link) => {
                    const statusInfo = orderStatusDisplay[link.currentStatus] || { name: link.currentStatus, color: '#ccc', textColor: '#000' };
                    return (
                      <TableRow key={link.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="pl-6">
                          <Link href={`/track/${link.id}`} className="font-medium text-primary hover:underline">
                            {link.id}
                          </Link>
                        </TableCell>
                        <TableCell className="text-card-foreground">{link.customerName}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                            link.isPublic 
                              ? 'bg-green-500/20 text-green-700 border-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20' 
                              : 'bg-red-500/20 text-red-700 border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20'
                          }`}>
                            {link.isPublic ? 'Public' : 'Private'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: statusInfo.color, color: statusInfo.textColor }} className="border-transparent">
                            {statusInfo.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{0}</TableCell> {/* Display 0 for views */}
                        <TableCell className="text-card-foreground">{link.crmUserName}</TableCell>
                        <TableCell className="text-card-foreground">{link.designerRepresentativeName || 'N/A'}</TableCell>
                        <TableCell className="pr-6 text-right space-x-1 sm:space-x-1.5 whitespace-nowrap">
                          <Link href={`/track/${link.id}`} passHref>
                            <Button variant="outline" size="sm" className="table-action-button h-9 px-3"><Eye className="mr-1.5 h-4 w-4" />View Public</Button>
                          </Link>
                          {canEditSpecificLink(link) && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="table-action-button h-9 px-3"
                                onClick={() => { setSelectedLink(link); setIsEditDialogOpen(true);}}
                            >
                                <Edit3 className="mr-1.5 h-4 w-4" />Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 h-[300px]">
                            <Image src="https://placehold.co/240x180.png" alt="No tracking links" data-ai-hint="empty state link" width={180} height={135} className="mx-auto rounded-md opacity-60 mb-4" />
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

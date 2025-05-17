
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Link2, Eye, Edit3, Search } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";
import Link from "next/link";
import type { TrackingLink, OrderStatus, User } from '@/types'; // Assuming types are defined
import { EditTrackingLinkDialog } from '@/components/tracking-links/edit-tracking-link-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Initial mock data, mirrors orders for now. In a real app, this might be derived or a separate collection.
// For this scaffold, we'll assume TrackingLinks are essentially Orders with tracking-specific properties.
const initialMockTrackingLinks: TrackingLink[] = [
   { 
    id: "ORD-001", customerName: "Tech Solutions Inc.", companyName: "Tech Solutions Inc.", address: "123 Tech Ave",
    crmUserId: "user-crm-001", crmUserName: "Bob CRM", createdAt: "2023-10-26T10:00:00Z", isPublic: true,
    currentStatus: "IN_PRODUCTION", statusHistory: [], comments: []
  },
  { 
    id: "ORD-002", customerName: "GreenScape Ltd.", companyName: "GreenScape Ltd.", address: "456 Green Rd",
    crmUserId: "user-crm-002", crmUserName: "David CRM", createdAt: "2023-10-25T10:00:00Z", isPublic: false,
    currentStatus: "PENDING_CLIENT_APPROVAL", statusHistory: [], comments: []
  },
   { 
    id: "ORD-003", customerName: "Innovate Hub", companyName: "Innovate Hub", address: "789 Innovate St",
    crmUserId: "user-crm-001", crmUserName: "Bob CRM", createdAt: "2023-10-24T10:00:00Z", isPublic: true,
    currentStatus: "SHIPPED", statusHistory: [], comments: []
  },
];

// Dummy views data for demonstration
const mockViews: {[key: string]: number} = {
  "ORD-001": 102,
  "ORD-002": 5,
  "ORD-003": 250,
}

const formatStatus = (status: OrderStatus) => status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

export default function TrackingLinksPage() {
  const { currentUser } = useAuth();
  const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>(initialMockTrackingLinks);
  const [searchTerm, setSearchTerm] = useState('');

  // Permissions
  const canManageLinks = currentUser?.role === 'ADMIN' || currentUser?.role === 'DESIGNER_REPRESENTATIVE';
  const canEditSpecificLink = (link: TrackingLink) => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.role === 'DESIGNER_REPRESENTATIVE') return true; // Designers can edit status/public toggle
    // CRMs generally cannot edit from this page, they create.
    return false;
  };
  
  const handleTrackingLinkUpdated = (updatedLink: TrackingLink) => {
    setTrackingLinks(prevLinks => prevLinks.map(link => link.id === updatedLink.id ? updatedLink : link));
  };

  const filteredTrackingLinks = useMemo(() => {
    if (!searchTerm) return trackingLinks;
    return trackingLinks.filter(link => 
      link.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.crmUserName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [trackingLinks, searchTerm]);

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tracking Links</h1>
          <p className="text-muted-foreground">
            Manage and monitor public tracking links for orders.
          </p>
        </div>
        {/* Button for generating new link is part of Order Creation now */}
        {/* {canManageLinks && (
          <Button size="lg" disabled> 
            <Link2 className="mr-2 h-5 w-5" />
            Generate New Link
          </Button>
        )} */}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Active Tracking Links</CardTitle>
          <CardDescription>Overview of generated tracking links and their status.</CardDescription>
           <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search links (ID, Customer, CRM)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Link ID (Order ID)</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Public Status</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Created By (CRM)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrackingLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                       <Link href={`/track/${link.id}`} className="font-medium text-primary hover:underline">
                        {link.id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-foreground">{link.customerName}</TableCell>
                    <TableCell>
                       <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        link.isPublic ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {link.isPublic ? 'Public' : 'Private'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        link.currentStatus === 'IN_PRODUCTION' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        link.currentStatus === 'PENDING_CLIENT_APPROVAL' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        link.currentStatus === 'SHIPPED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        link.currentStatus === 'IDEA_SUBMITTED' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                         'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {formatStatus(link.currentStatus)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{mockViews[link.id] || 0}</TableCell>
                    <TableCell className="text-foreground">{link.crmUserName}</TableCell>
                    <TableCell className="space-x-2 whitespace-nowrap">
                      <Link href={`/track/${link.id}`} passHref>
                        <Button variant="outline" size="sm"><Eye className="mr-1 h-4 w-4" />View Public Page</Button>
                      </Link>
                      {canEditSpecificLink(link) && (
                        <EditTrackingLinkDialog trackingLink={link} currentUser={currentUser} onTrackingLinkUpdated={handleTrackingLinkUpdated}>
                          <Button variant="outline" size="sm"><Edit3 className="mr-1 h-4 w-4" />Edit</Button>
                        </EditTrackingLinkDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTrackingLinks.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                            <Image src="https://placehold.co/300x200.png" alt="No tracking links" data-ai-hint="empty state link" width={300} height={200} className="mx-auto rounded-md" />
                            <p className="mt-4 text-muted-foreground">
                              {searchTerm ? "No tracking links match your search." : "No tracking links found."}
                            </p>
                        </TableCell>
                    </TableRow>
                 )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

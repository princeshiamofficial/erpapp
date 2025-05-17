
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Eye } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";
import Link from "next/link";
import { CreateOrderDialog } from '@/components/orders/create-order-dialog';
import type { TrackingLink, OrderStatus } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// Initial mock data, will be managed by state
const initialMockOrders: TrackingLink[] = [
  { 
    id: "ORD-001", 
    customerName: "Tech Solutions Inc.", 
    companyName: "Tech Solutions Inc.",
    address: "123 Tech Ave",
    phoneNumber: "555-0101",
    service: "Custom Software Development",
    crmUserId: "user-crm-001",
    crmUserName: "Bob CRM",
    createdAt: "2023-10-26T10:00:00Z",
    isPublic: true,
    currentStatus: "IN_PRODUCTION", 
    statusHistory: [{ id: "log1", timestamp: "2023-10-26T10:00:00Z", status: "IN_PRODUCTION", changedByUserId: "user-crm-001", changedByUserName: "Bob CRM", notes: "Production started"}],
    comments: [],
  },
  { 
    id: "ORD-002", 
    customerName: "GreenScape Ltd.", 
    companyName: "GreenScape Ltd.",
    address: "456 Green Rd",
    phoneNumber: "555-0102",
    service: "Landscaping Design",
    crmUserId: "user-crm-002",
    crmUserName: "David CRM",
    createdAt: "2023-10-25T10:00:00Z",
    isPublic: false,
    currentStatus: "PENDING_CLIENT_APPROVAL", 
    statusHistory: [{ id: "log2", timestamp: "2023-10-25T10:00:00Z", status: "PENDING_CLIENT_APPROVAL", changedByUserId: "user-crm-002", changedByUserName: "David CRM", notes: "Awaiting approval"}],
    comments: [],
  },
   { 
    id: "ORD-003", customerName: "Innovate Hub", companyName: "Innovate Hub", address: "789 Innovate St",
    phoneNumber: "555-0103", service: "Mobile App Development",
    crmUserId: "user-crm-001", crmUserName: "Bob CRM", createdAt: "2023-10-24T10:00:00Z", isPublic: true,
    currentStatus: "SHIPPED", statusHistory: [], comments: []
  },
   { 
    id: "ORD-004", customerName: "Market Masters", companyName: "Market Masters LLC", address: "321 Marketing Blvd",
    phoneNumber: "555-0104", service: "Digital Marketing Campaign",
    crmUserId: "user-crm-002", crmUserName: "David CRM", createdAt: "2023-10-23T10:00:00Z", isPublic: true,
    currentStatus: "READY_FOR_DESIGN", statusHistory: [], comments: []
  },
];

const formatStatus = (status: OrderStatus) => status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return "Invalid Date";
  }
};

const getStatusBadgeVariant = (status: OrderStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'IN_PRODUCTION': return 'default'; // Blue (Primary)
    case 'PENDING_CLIENT_APPROVAL': return 'secondary'; // Yellow-ish (Secondary might need theme adjustment)
    case 'SHIPPED': return 'default'; // Using primary, but could be green.
    case 'READY_FOR_DESIGN': return 'outline'; // Teal-ish / Outline (Outline is good for distinct status)
    case 'IDEA_SUBMITTED': return 'outline';
    case 'DELIVERED': return 'default';
    case 'CANCELLED': return 'destructive';
    default: return 'secondary';
  }
};


export default function OrdersPage() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<TrackingLink[]>(initialMockOrders);
  const [searchTerm, setSearchTerm] = useState('');

  const canCreateOrder = currentUser?.role === 'CRM' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';

  const handleOrderCreated = (newOrder: TrackingLink) => {
    setOrders(prevOrders => [newOrder, ...prevOrders]);
  };
  
  const filteredOrders = useMemo(() => {
    let result = orders;
    if (currentUser?.role === 'CRM') { 
      result = result.filter(order => order.crmUserId === currentUser.id);
    }
    if (!searchTerm) return result;
    return result.filter(order => 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.phoneNumber && order.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.service && order.service.toLowerCase().includes(searchTerm.toLowerCase())) ||
      order.crmUserName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm, currentUser]);


  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Order Management</h1>
          <p className="page-description">
            View, track, and manage all customer orders.
          </p>
        </div>
        {canCreateOrder && (
          <CreateOrderDialog currentUser={currentUser} onOrderCreated={handleOrderCreated}>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-shadow rounded-md font-semibold">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create New Order
            </Button>
          </CreateOrderDialog>
        )}
      </div>

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <CardTitle className="text-card-foreground text-xl">Order List</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">{currentUser.role === 'CRM' ? "Showing orders assigned to you." : "Showing all orders."}</CardDescription>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background h-10 rounded-md"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CRM Contact</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="pl-6">
                      <Link href={`/track/${order.id}`} className="font-medium text-primary hover:underline">
                        {order.id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-card-foreground">{order.customerName} <br/><small className="text-muted-foreground">{order.companyName}</small></TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(order.currentStatus)} className={
                        cn(
                          order.currentStatus === 'IN_PRODUCTION' && 'bg-blue-500/20 text-blue-700 border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
                          order.currentStatus === 'PENDING_CLIENT_APPROVAL' && 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/20',
                          order.currentStatus === 'SHIPPED' && 'bg-green-500/20 text-green-700 border-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20',
                          order.currentStatus === 'READY_FOR_DESIGN' && 'bg-teal-500/20 text-teal-700 border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20',
                          order.currentStatus === 'IDEA_SUBMITTED' && 'bg-purple-500/20 text-purple-700 border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20',
                          order.currentStatus === 'CANCELLED' && 'bg-red-500/20 text-red-700 border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20',
                           !['IN_PRODUCTION', 'PENDING_CLIENT_APPROVAL', 'SHIPPED', 'READY_FOR_DESIGN', 'IDEA_SUBMITTED', 'CANCELLED'].includes(order.currentStatus) && 'bg-gray-500/20 text-gray-700 border-gray-500/30 dark:bg-gray-500/10 dark:text-gray-300 dark:border-gray-500/20'
                        )
                      }>
                        {formatStatus(order.currentStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-card-foreground">{order.crmUserName}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                    <TableCell className="pr-6 text-right">
                       <Link href={`/track/${order.id}`} passHref>
                        <Button variant="outline" size="sm" className="table-action-button h-9 px-3">
                          <Eye className="mr-1.5 h-4 w-4" /> View
                        </Button>
                       </Link>
                    </TableCell>
                  </TableRow>
                ))}
                 {filteredOrders.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                            <Image src="https://placehold.co/240x180.png" alt="No orders" data-ai-hint="empty state document" width={180} height={135} className="mx-auto rounded-md opacity-50 mb-4" />
                            <p className="text-lg text-muted-foreground font-medium">
                              {searchTerm ? "No orders match your search." : "No orders found."}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {searchTerm ? "Try a different search term." : (canCreateOrder ? "Start by creating a new one!" : "Check back later for updates.")}
                            </p>
                             {canCreateOrder && !searchTerm && (
                                <CreateOrderDialog currentUser={currentUser} onOrderCreated={handleOrderCreated}>
                                    <Button size="sm" className="mt-4">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Create Order
                                    </Button>
                                </CreateOrderDialog>
                             )}
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

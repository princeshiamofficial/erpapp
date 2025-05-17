
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Search } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";
import Link from "next/link";
import { CreateOrderDialog } from '@/components/orders/create-order-dialog';
import type { TrackingLink, OrderStatus } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Initial mock data, will be managed by state
const initialMockOrders: TrackingLink[] = [
  { 
    id: "ORD-001", 
    customerName: "Tech Solutions Inc.", 
    companyName: "Tech Solutions Inc.",
    address: "123 Tech Ave",
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
    crmUserId: "user-crm-002",
    crmUserName: "David CRM",
    createdAt: "2023-10-25T10:00:00Z",
    isPublic: false,
    currentStatus: "PENDING_CLIENT_APPROVAL", 
    statusHistory: [{ id: "log2", timestamp: "2023-10-25T10:00:00Z", status: "PENDING_CLIENT_APPROVAL", changedByUserId: "user-crm-002", changedByUserName: "David CRM", notes: "Awaiting approval"}],
    comments: [],
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

export default function OrdersPage() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<TrackingLink[]>(initialMockOrders);
  const [searchTerm, setSearchTerm] = useState('');

  const canCreateOrder = currentUser?.role === 'CRM' || currentUser?.role === 'ADMIN';

  const handleOrderCreated = (newOrder: TrackingLink) => {
    setOrders(prevOrders => [newOrder, ...prevOrders]);
  };
  
  const filteredOrders = useMemo(() => {
    let result = orders;
    if (currentUser?.role === 'CRM') { // CRMs only see their own orders
      result = result.filter(order => order.crmUserId === currentUser.id);
    }
    if (!searchTerm) return result;
    return result.filter(order => 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.crmUserName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm, currentUser]);


  if (!currentUser) return null; // Should be handled by layout

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
          <p className="text-muted-foreground">
            View, track, and manage all customer orders.
          </p>
        </div>
        {canCreateOrder && (
          <CreateOrderDialog currentUser={currentUser} onOrderCreated={handleOrderCreated}>
            <Button size="lg">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create New Order
            </Button>
          </CreateOrderDialog>
        )}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Order List</CardTitle>
          <CardDescription>A summary of recent and active orders. {currentUser.role === 'CRM' ? "Showing orders assigned to you." : "Showing all orders."}</CardDescription>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search orders (ID, Customer, Company, CRM)..."
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
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CRM Contact</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link href={`/track/${order.id}`} className="font-medium text-primary hover:underline">
                        {order.id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-foreground">{order.customerName} <br/><small className="text-muted-foreground">{order.companyName}</small></TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        order.currentStatus === 'IN_PRODUCTION' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        order.currentStatus === 'PENDING_CLIENT_APPROVAL' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        order.currentStatus === 'SHIPPED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        order.currentStatus === 'IDEA_SUBMITTED' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                         'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {formatStatus(order.currentStatus)}
                      </span>
                    </TableCell>
                    <TableCell className="text-foreground">{order.crmUserName}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                    <TableCell>
                       <Link href={`/track/${order.id}`} passHref>
                        <Button variant="outline" size="sm">View Details</Button>
                       </Link>
                    </TableCell>
                  </TableRow>
                ))}
                 {filteredOrders.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center py-10">
                            <Image src="https://placehold.co/300x200.png" alt="No orders" data-ai-hint="empty state illustration" width={300} height={200} className="mx-auto rounded-md" />
                            <p className="mt-4 text-muted-foreground">
                              {searchTerm ? "No orders match your search criteria." : "No orders found. Start by creating a new one!"}
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

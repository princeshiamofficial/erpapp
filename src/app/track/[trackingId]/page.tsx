
"use client";

import { use, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare, Package, UserCircle, CalendarDays, Clock, CheckCircle, Info, Phone, Briefcase } from "lucide-react";
import Image from "next/image";
import type { Comment, OrderStatus, TrackingLink } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from '@/components/ui/label';

interface PublicTrackingPageProps {
  params: { trackingId: string };
}

// Mock data for a single tracking link
const mockTrackingData: TrackingLink = {
  id: "TRK-XYZ123",
  customerName: "Alice Wonderland",
  companyName: "Wonderland Enterprises",
  address: "123 Fantasy Lane, Storybook City, SB 12345",
  phoneNumber: "555-0123",
  service: "Custom Dream Weaving",
  crmUserId: "user-crm-001",
  crmUserName: "Bob CRM",
  createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
  isPublic: true,
  currentStatus: "IN_PRODUCTION" as OrderStatus,
  statusHistory: [
    { id: "log0", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), status: "IDEA_SUBMITTED", changedByUserName: "Bob CRM", notes: "Order placed by customer." },
    { id: "log1", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), status: "DESIGN_IN_PROGRESS" as OrderStatus, changedByUserName: "Carol DesignerRep", notes: "Initial design phase started. Sketches shared." },
    { id: "log2", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), status: "PENDING_CLIENT_APPROVAL" as OrderStatus, changedByUserName: "Carol DesignerRep", notes: "Design mockups sent for client review. Awaiting feedback." },
    { id: "log3", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: "APPROVED_FOR_PRODUCTION" as OrderStatus, changedByUserName: "Alice Wonderland", notes: "Approved with minor color adjustment to logo." },
    { id: "log4", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), status: "IN_PRODUCTION" as OrderStatus, changedByUserName: "System", notes: "Production has commenced. Estimated completion: 3 working days." },
  ],
  comments: [
    { id: "cmt1", userName: "Alice Wonderland (Client)", text: "Looking great! Eager to see the final product. Thanks for the quick turnaround on the mockups.", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), isInternal: false }, // 2 hours after pending approval
    { id: "cmt2", userName: "Carol DesignerRep (TrackFlow)", text: "Thanks, Alice! We'll keep you updated on the production progress.", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(), isInternal: true }, // 5 mins after Alice's comment
  ] as Comment[],
};

const formatStatus = (status: OrderStatus) => status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return "Invalid Date";
  }
};

const getStatusIcon = (status: OrderStatus) => {
  // Using semantic colors which are generally good practice for status indicators
  if (status === "DELIVERED" || status === "APPROVED_FOR_PRODUCTION" || status === "SHIPPED") return <CheckCircle className="h-5 w-5 mr-2 text-green-500" />;
  if (status === "READY_FOR_DESIGN") return <Info className="h-5 w-5 mr-2 text-teal-500" />; 
  if (status === "IN_PRODUCTION") return <Info className="h-5 w-5 mr-2 text-blue-500" />;
  if (status === "PENDING_CLIENT_APPROVAL" || status === "CHANGES_REQUESTED") return <Clock className="h-5 w-5 mr-2 text-yellow-500" />;
  return <Info className="h-5 w-5 mr-2 text-gray-500" />;
};

export default function PublicTrackingPage({ params: paramsProp }: PublicTrackingPageProps) {
  const params = use(paramsProp); 
  const { trackingId } = params; 
  const data = mockTrackingData; // In a real app, fetch data based on trackingId and handle not found

  const [lastUpdatedDisplay, setLastUpdatedDisplay] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Set to true once component mounts on client
    const lastStatusEntry = data.statusHistory[data.statusHistory.length - 1];
    const timestampToUse = lastStatusEntry?.timestamp || new Date().toISOString(); 
    setLastUpdatedDisplay(formatDate(timestampToUse));
  }, [data?.statusHistory]);

  if (!data) { 
    return <div className="p-6 text-center text-lg font-semibold">Tracking ID <span className="text-primary">{trackingId}</span> not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 py-8 px-4 sm:px-6 lg:px-8">
      <header className="text-center mb-12">
        <div className="inline-flex items-center space-x-3 text-primary mb-2">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary drop-shadow-[0_2px_4px_hsl(var(--primary)/0.5)]">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 7L12 12M12 12L22 7M12 12V22M12 2V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 4.5L7 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="text-5xl font-extrabold tracking-tight text-foreground">TrackFlow</h1>
        </div>
        <p className="text-xl text-muted-foreground">Order Tracking Portal</p>
      </header>

      <main className="max-w-4xl mx-auto space-y-10">
        <Card className="shadow-xl overflow-hidden border border-border bg-card hover:shadow-2xl transition-shadow duration-300">
          <CardHeader className="bg-card p-6 border-b border-border/70">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
              <Package className="h-12 w-12 text-primary mb-3 sm:mb-0" />
              <div>
                <CardTitle className="text-2xl md:text-3xl font-semibold text-card-foreground">Order ID: {data.id}</CardTitle>
                <CardDescription className="text-md text-muted-foreground">
                  Tracking information for {data.customerName} ({data.companyName})
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Current Status</h3>
              <p className="text-3xl font-bold text-primary flex items-center">
                {getStatusIcon(data.currentStatus)}
                {formatStatus(data.currentStatus)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Last updated: {lastUpdatedDisplay !== null && isClient ? lastUpdatedDisplay : 'Calculating...'}
              </p>
            </div>

            <Separator className="my-6 bg-border/50" />

            <div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Order Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="flex items-start">
                  <UserCircle className="h-5 w-5 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <span className="font-medium text-foreground">Customer:</span> {data.customerName}
                  </div>
                </div>
                <div className="flex items-start">
                  <Briefcase className="h-5 w-5 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <span className="font-medium text-foreground">Company:</span> {data.companyName}
                  </div>
                </div>
                {data.phoneNumber && (
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground">Phone:</span> {data.phoneNumber}
                    </div>
                  </div>
                )}
                {data.service && (
                  <div className="flex items-start">
                    <Briefcase className="h-5 w-5 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" /> {/* Could use a more specific icon if available */}
                    <div>
                      <span className="font-medium text-foreground">Service:</span> {data.service}
                    </div>
                  </div>
                )}
                 <div className="flex items-start md:col-span-2">
                    <CalendarDays className="h-5 w-5 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground">Order Placed:</span> {isClient ? formatDate(data.createdAt) : 'Loading date...'}
                    </div>
                  </div>
              </div>
            </div>
            
            <Separator className="my-6 bg-border/50" />

            <div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">Status History</h3>
              <div className="space-y-6 relative pl-6">
                <div className="absolute left-[0.625rem] top-0 bottom-0 w-0.5 bg-border rounded-full"></div>
                {data.statusHistory.slice().reverse().map((entry, index) => (
                  <div key={entry.id} className="flex items-start space-x-4 relative">
                    <div className={`absolute left-[-0.875rem] top-1 h-5 w-5 rounded-full flex items-center justify-center ${index === 0 ? 'bg-primary ring-4 ring-primary/20' : 'bg-muted border-2 border-background'}`}>
                      {index === 0 && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 pt-px">
                      <p className={`font-semibold text-md ${index === 0 ? 'text-primary' : 'text-foreground'}`}>{formatStatus(entry.status)}</p>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <CalendarDays className="h-4 w-4 mr-1.5 opacity-70" /> 
                        {isClient ? formatDate(entry.timestamp) : 'Loading date...'} by {entry.changedByUserName}
                      </p>
                      {entry.notes && <p className="text-sm mt-1.5 bg-muted/50 p-3 rounded-md border border-border/50 text-foreground/80">{entry.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl border border-border bg-card hover:shadow-2xl transition-shadow duration-300">
          <CardHeader className="bg-card p-6 border-b border-border/70">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl font-semibold text-card-foreground">Comments & Updates ({data.comments.filter(c => !c.isInternal).length})</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground mt-1">Share updates or ask questions about this order.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-5 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {data.comments.filter(c => !c.isInternal).map((comment) => (
                <div key={comment.id} className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg shadow-sm border border-border/50">
                  <Avatar className="h-11 w-11 border-2 border-primary/40">
                     <AvatarImage src={`https://placehold.co/44x44.png?text=${comment.userName.slice(0,2).toUpperCase()}`} alt={comment.userName} data-ai-hint="user avatar"/>
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">{comment.userName.slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-semibold text-foreground">{comment.userName}</p>
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1 opacity-70" /> 
                        {isClient ? formatDate(comment.timestamp) : 'Loading date...'}
                      </p>
                    </div>
                    <p className="text-sm text-foreground/90">{comment.text}</p>
                  </div>
                </div>
              ))}
              {data.comments.filter(c => !c.isInternal).length === 0 && (
                 <div className="text-center py-8">
                    <Image src="https://placehold.co/200x150.png?text=No+Comments" alt="No comments yet" data-ai-hint="empty message illustration" width={150} height={112} className="mx-auto rounded-md opacity-60" />
                    <p className="mt-4 text-muted-foreground text-md">No public comments yet.</p>
                    <p className="text-sm text-muted-foreground">Be the first to add one using the form below!</p>
                 </div>
              )}
            </div>
            <Separator className="my-6 bg-border/50" />
            <div>
              <Label htmlFor="comment" className="text-lg font-semibold mb-3 block text-foreground">Add a Comment</Label>
              <Textarea id="comment" placeholder="Type your message here..." className="min-h-[120px] text-base mb-4 p-3 focus:border-primary bg-background" />
              <Button size="lg" className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Send className="mr-2 h-5 w-5" /> Submit Comment
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <footer className="text-center mt-16 py-8 border-t border-border/30">
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} TrackFlow. All rights reserved.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Powered by Innovation</p>
      </footer>
    </div>
  );
}

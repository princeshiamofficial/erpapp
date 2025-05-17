
"use client";

import { use, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare, Package, UserCircle, CalendarDays, Clock, CheckCircle, Info } from "lucide-react";
import Image from "next/image";
import type { Comment, OrderStatus } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from '@/components/ui/label';

interface PublicTrackingPageProps {
  params: { trackingId: string };
}

// Mock data for a single tracking link
const mockTrackingData = {
  id: "TRK-XYZ123",
  customerName: "Alice Wonderland",
  companyName: "Wonderland Enterprises",
  currentStatus: "IN_PRODUCTION" as OrderStatus,
  statusHistory: [
    { timestamp: "2023-10-20T10:00:00Z", status: "DESIGN_IN_PROGRESS" as OrderStatus, changedByUserName: "Bob CRM", notes: "Initial design phase started. Sketches shared." },
    { timestamp: "2023-10-22T14:30:00Z", status: "PENDING_CLIENT_APPROVAL" as OrderStatus, changedByUserName: "Bob CRM", notes: "Design mockups sent for client review. Awaiting feedback." },
    { timestamp: "2023-10-24T09:15:00Z", status: "APPROVED_FOR_PRODUCTION" as OrderStatus, changedByUserName: "Alice Wonderland", notes: "Approved with minor color adjustment to logo." },
    { timestamp: "2023-10-25T16:45:00Z", status: "IN_PRODUCTION" as OrderStatus, changedByUserName: "System", notes: "Production has commenced. Estimated completion: 5 working days." },
  ],
  comments: [
    { id: "cmt1", userName: "Alice Wonderland (Client)", text: "Looking great! Eager to see the final product. Thanks for the quick turnaround on the mockups.", timestamp: "2023-10-22T15:00:00Z", isInternal: false },
    { id: "cmt2", userName: "Bob CRM (TrackFlow)", text: "Thanks, Alice! We'll keep you updated on the production progress.", timestamp: "2023-10-22T15:05:00Z", isInternal: true },
    { id: "cmt3", userName: "Logistics Partner", text: "ETA for shipping materials: Oct 26th. All on track.", timestamp: "2023-10-25T10:00:00Z", isInternal: false },
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
  if (status === "DELIVERED" || status === "APPROVED_FOR_PRODUCTION") return <CheckCircle className="h-4 w-4 mr-1.5 text-green-500" />;
  return <Info className="h-4 w-4 mr-1.5 text-blue-500" />;
};

export default function PublicTrackingPage({ params: paramsProp }: PublicTrackingPageProps) {
  const params = use(paramsProp); // Next.js hook for server-side params
  const { trackingId } = params; 
  // In a real app, you would fetch data based on trackingId here
  // For now, we use mock data and assume it matches the trackingId or is generic
  const data = mockTrackingData; 

  const [lastUpdatedDisplay, setLastUpdatedDisplay] = useState<string | null>(null);

  useEffect(() => {
    // This effect runs only on the client after hydration
    const lastStatusEntry = data.statusHistory[data.statusHistory.length - 1];
    const timestampToUse = lastStatusEntry?.timestamp || new Date().toISOString(); // Fallback to now if history is empty
    setLastUpdatedDisplay(formatDate(timestampToUse));
  }, [data.statusHistory]);

  if (!data) { // Basic check, in real app this would be more robust
    return <div className="p-6 text-center text-lg font-semibold">Tracking ID <span className="text-primary">{trackingId}</span> not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-8 px-4 sm:px-6 lg:px-8">
      <header className="text-center mb-12">
        <div className="inline-flex items-center space-x-3 text-primary mb-2">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary drop-shadow-[0_2px_4px_hsl(var(--primary)/0.5)]">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 7L12 12M12 12L22 7M12 12V22M12 2V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 4.5L7 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="text-5xl font-extrabold tracking-tight text-primary">TrackFlow</h1>
        </div>
        <p className="text-xl text-muted-foreground">Order Tracking Portal</p>
      </header>

      <main className="max-w-4xl mx-auto space-y-10">
        <Card className="shadow-xl overflow-hidden border-border hover:border-primary/30 transition-all duration-300 hover:shadow-2xl bg-card">
          <CardHeader className="bg-card p-6 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
              <Package className="h-12 w-12 text-primary mb-3 sm:mb-0" />
              <div>
                <CardTitle className="text-2xl md:text-3xl font-semibold text-primary">Order ID: {data.id}</CardTitle>
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
                Last updated: {lastUpdatedDisplay !== null ? lastUpdatedDisplay : 'Calculating...'}
              </p>
            </div>
            
            <Separator className="my-6" />

            <div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">Status History</h3>
              <div className="space-y-6 relative pl-6">
                {/* Timeline line */}
                <div className="absolute left-[0.625rem] top-0 bottom-0 w-0.5 bg-border rounded-full"></div>
                {data.statusHistory.slice().reverse().map((entry, index) => (
                  <div key={index} className="flex items-start space-x-4 relative">
                    <div className={`absolute left-[-0.875rem] top-1 h-5 w-5 rounded-full flex items-center justify-center ${index === 0 ? 'bg-primary ring-4 ring-primary/20' : 'bg-muted border-2 border-background'}`}>
                      {index === 0 && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 pt-px">
                      <p className={`font-semibold text-md ${index === 0 ? 'text-primary' : 'text-foreground'}`}>{formatStatus(entry.status)}</p>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <CalendarDays className="h-4 w-4 mr-1.5 opacity-70" /> {formatDate(entry.timestamp)} by {entry.changedByUserName}
                      </p>
                      {entry.notes && <p className="text-sm mt-1.5 bg-muted/50 p-3 rounded-md border border-border text-foreground/80">{entry.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-border hover:border-primary/30 transition-all duration-300 hover:shadow-2xl bg-card">
          <CardHeader className="bg-card p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl font-semibold text-primary">Comments & Updates ({data.comments.filter(c => !c.isInternal).length})</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground mt-1">Share updates or ask questions about this order.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-5 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {data.comments.filter(c => !c.isInternal).map((comment) => (
                <div key={comment.id} className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg shadow-sm border border-border">
                  <Avatar className="h-11 w-11 border-2 border-primary/40">
                     <AvatarImage src={`https://placehold.co/44x44.png?text=${comment.userName.slice(0,2).toUpperCase()}`} alt={comment.userName} data-ai-hint="user avatar"/>
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">{comment.userName.slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-semibold text-foreground">{comment.userName}</p>
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1 opacity-70" /> {formatDate(comment.timestamp)}
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
            <Separator className="my-6" />
            <div>
              <Label htmlFor="comment" className="text-lg font-semibold mb-3 block text-foreground">Add a Comment</Label>
              <Textarea id="comment" placeholder="Type your message here..." className="min-h-[120px] text-base mb-4 p-3 focus:border-primary" />
              <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300">
                <Send className="mr-2 h-5 w-5" /> Submit Comment
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <footer className="text-center mt-16 py-8 border-t border-border">
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} TrackFlow. All rights reserved.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Powered by Innovation</p>
      </footer>
    </div>
  );
}


"use client";

import { use } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare, Package, UserCircle, CalendarDays, Clock } from "lucide-react";
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
    { timestamp: "2023-10-20T10:00:00Z", status: "DESIGN_IN_PROGRESS" as OrderStatus, changedByUserName: "Bob CRM", notes: "Initial design phase started." },
    { timestamp: "2023-10-22T14:30:00Z", status: "PENDING_CLIENT_APPROVAL" as OrderStatus, changedByUserName: "Bob CRM", notes: "Design sent for client review." },
    { timestamp: "2023-10-24T09:15:00Z", status: "APPROVED_FOR_PRODUCTION" as OrderStatus, changedByUserName: "Alice Wonderland", notes: "Approved with minor color adjustment." },
    { timestamp: "2023-10-25T16:45:00Z", status: "IN_PRODUCTION" as OrderStatus, changedByUserName: "System", notes: "Production started." },
  ],
  comments: [
    { id: "cmt1", userName: "Alice Wonderland (Client)", text: "Looking great! Eager to see the final product.", timestamp: "2023-10-22T15:00:00Z", isInternal: false },
    { id: "cmt2", userName: "Bob CRM (TrackFlow)", text: "Thanks, Alice! We'll keep you updated.", timestamp: "2023-10-22T15:05:00Z", isInternal: true },
    { id: "cmt3", userName: "Logistics Partner", text: "ETA for shipping materials: Oct 26th.", timestamp: "2023-10-25T10:00:00Z", isInternal: false },
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


export default function PublicTrackingPage({ params: paramsProp }: PublicTrackingPageProps) {
  const params = use(paramsProp);
  const { trackingId } = params;
  const data = mockTrackingData; // In a real app, fetch data based on trackingId

  if (!data) {
    return <div className="p-6 text-center">Tracking ID not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary py-8 px-4 sm:px-6 lg:px-8">
      <header className="text-center mb-10">
        <div className="inline-flex items-center space-x-3 text-primary">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 7L12 12M12 12L22 7M12 12V22M12 2V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 4.5L7 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="text-4xl font-extrabold tracking-tight">TrackFlow</h1>
        </div>
        <p className="mt-2 text-xl text-muted-foreground">Order Tracking Portal</p>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        <Card className="shadow-xl overflow-hidden">
          <CardHeader className="bg-card-foreground/5 p-6">
            <div className="flex items-center space-x-4">
              <Package className="h-10 w-10 text-primary" />
              <div>
                <CardTitle className="text-2xl md:text-3xl">Order ID: {data.id}</CardTitle>
                <CardDescription className="text-md">
                  Tracking information for {data.customerName} ({data.companyName})
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-primary">Current Status</h3>
              <p className="text-2xl font-bold text-accent">{formatStatus(data.currentStatus)}</p>
              <p className="text-sm text-muted-foreground">Last updated: {formatDate(data.statusHistory[data.statusHistory.length -1]?.timestamp || new Date().toISOString())}</p>
            </div>
            
            <Separator />

            <div>
              <h3 className="text-xl font-semibold mb-4 text-primary">Status History</h3>
              <div className="space-y-4 relative pl-5">
                {/* Timeline line */}
                <div className="absolute left-[calc(0.375rem)] top-0 bottom-0 w-0.5 bg-border"></div>
                {data.statusHistory.slice().reverse().map((entry, index) => (
                  <div key={index} className="flex items-start space-x-3 relative">
                    <div className={`absolute left-[-0.625rem] top-1.5 h-3 w-3 rounded-full ${index === 0 ? 'bg-primary ring-4 ring-primary/30' : 'bg-muted-foreground'}`}></div>
                    <div className="flex-1">
                      <p className={`font-semibold ${index === 0 ? 'text-primary' : 'text-foreground'}`}>{formatStatus(entry.status)}</p>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <CalendarDays className="h-3.5 w-3.5 mr-1.5" /> {formatDate(entry.timestamp)} by {entry.changedByUserName}
                      </p>
                      {entry.notes && <p className="text-sm mt-1 bg-muted/50 p-2 rounded-md">{entry.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl">Comments & Updates ({data.comments.filter(c => !c.isInternal).length})</CardTitle>
            </div>
            <CardDescription>Share updates or ask questions about this order.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {data.comments.filter(c => !c.isInternal).map((comment) => (
                <div key={comment.id} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg shadow-sm">
                  <Avatar className="h-10 w-10 border-2 border-primary/50">
                     <AvatarImage src={`https://placehold.co/40x40.png?text=${comment.userName.charAt(0)}`} alt={comment.userName} data-ai-hint="user avatar"/>
                    <AvatarFallback className="bg-primary/20 text-primary">{comment.userName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{comment.userName}</p>
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" /> {formatDate(comment.timestamp)}
                      </p>
                    </div>
                    <p className="text-sm text-foreground/90 mt-1">{comment.text}</p>
                  </div>
                </div>
              ))}
              {data.comments.filter(c => !c.isInternal).length === 0 && (
                 <div className="text-center py-6">
                    <Image src="https://placehold.co/200x150.png?text=No+Comments" alt="No comments yet" data-ai-hint="empty message" width={200} height={150} className="mx-auto rounded-md opacity-70" />
                    <p className="mt-3 text-muted-foreground">No public comments yet. Be the first to add one!</p>
                 </div>
              )}
            </div>
            <Separator />
            <div>
              <Label htmlFor="comment" className="text-lg font-semibold mb-2 block text-primary">Add a Comment</Label>
              <Textarea id="comment" placeholder="Type your message here..." className="min-h-[100px] text-base mb-3" />
              <Button size="lg" className="w-full sm:w-auto">
                <Send className="mr-2 h-5 w-5" /> Submit Comment
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <footer className="text-center mt-12 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TrackFlow. All rights reserved.</p>
      </footer>
    </div>
  );
}

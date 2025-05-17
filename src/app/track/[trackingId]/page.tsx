
"use client";

import { use, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare, Package, UserCircle, CalendarDays, Clock, CheckCircle, Info, Phone, Briefcase, Building, MapPin } from "lucide-react";
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
    { id: "log0", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), status: "IDEA_SUBMITTED", changedByUserName: "Bob CRM", notes: "Order placed by customer. Initial requirements gathered." },
    { id: "log1", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), status: "READY_FOR_DESIGN", changedByUserName: "Bob CRM", notes: "Order details confirmed and sent to design team." },
    { id: "log1a", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), status: "DESIGN_IN_PROGRESS" as OrderStatus, changedByUserName: "Carol DesignerRep", notes: "Initial design phase started. Sketches shared." },
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
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) {
    return "Invalid Date";
  }
};

const getStatusIcon = (status: OrderStatus, sizeClass = "h-6 w-6") => {
  const commonClasses = `${sizeClass} mr-2 flex-shrink-0`;
  if (status === "DELIVERED" || status === "SHIPPED" || status === "APPROVED_FOR_PRODUCTION") return <CheckCircle className={`${commonClasses} text-green-500`} />;
  if (status === "READY_FOR_DESIGN") return <Info className={`${commonClasses} text-teal-500`} />; 
  if (status === "IN_PRODUCTION") return <Info className={`${commonClasses} text-blue-500`} />;
  if (status === "PENDING_CLIENT_APPROVAL" || status === "CHANGES_REQUESTED") return <Clock className={`${commonClasses} text-yellow-600`} />;
  if (status === "CANCELLED") return <Info className={`${commonClasses} text-red-500`} />;
  return <Info className={`${commonClasses} text-gray-500`} />;
};

export default function PublicTrackingPage({ params: paramsProp }: PublicTrackingPageProps) {
  const params = use(paramsProp); 
  const { trackingId } = params; 
  const data = mockTrackingData; 

  const [lastUpdatedDisplay, setLastUpdatedDisplay] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); 
    if (data?.statusHistory?.length > 0) {
      const lastStatusEntry = data.statusHistory[data.statusHistory.length - 1];
      const timestampToUse = lastStatusEntry?.timestamp || new Date().toISOString(); 
      setLastUpdatedDisplay(formatDate(timestampToUse));
    } else {
      setLastUpdatedDisplay(formatDate(new Date().toISOString()));
    }
  }, [data?.statusHistory]);

  if (!data) { 
    return <div className="p-8 text-center text-lg font-semibold">Tracking ID <span className="text-primary font-bold">{trackingId}</span> not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-background to-secondary/30 py-10 px-4 sm:px-6 lg:px-8 selection:bg-primary/20 selection:text-primary">
      <header className="text-center mb-12">
        <div className="inline-flex items-center space-x-3 text-primary mb-2">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary drop-shadow-[0_3px_5px_hsl(var(--primary)/0.4)]">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 7L12 12M12 12L22 7M12 12V22M12 2V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 4.5L7 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400 dark:to-orange-300">TrackFlow</h1>
        </div>
        <p className="text-2xl text-muted-foreground font-light">Seamless Order Tracking</p>
      </header>

      <main className="max-w-4xl mx-auto space-y-10">
        <Card className="shadow-2xl overflow-hidden border-border/40 bg-card hover:shadow-primary/10 transition-shadow duration-300 rounded-xl">
          <CardHeader className="bg-card p-6 sm:p-8 border-b border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6">
              <Package className="h-16 w-16 sm:h-20 sm:w-20 text-primary mb-4 sm:mb-0 flex-shrink-0 p-3 bg-primary/10 rounded-lg border border-primary/20" />
              <div>
                <CardTitle className="text-3xl md:text-4xl font-semibold text-card-foreground">Order ID: <span className="text-primary font-bold">{data.id}</span></CardTitle>
                <CardDescription className="text-md text-muted-foreground mt-1.5">
                  Tracking information for {data.customerName}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 sm:p-8 space-y-8">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-foreground flex items-center">
                {getStatusIcon(data.currentStatus, "h-8 w-8")}
                Current Status
              </h3>
              <p className="text-4xl font-bold text-primary ml-[40px] mt-1"> {/* Align with text after icon */}
                {formatStatus(data.currentStatus)}
              </p>
              <p className="text-sm text-muted-foreground mt-1.5 ml-[40px]">
                Last updated: {lastUpdatedDisplay !== null && isClient ? lastUpdatedDisplay : 'Calculating...'}
              </p>
            </div>

            <Separator className="my-8 bg-border/30" />

            <div>
              <h3 className="text-xl font-semibold mb-5 text-foreground">Order Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 text-md">
                <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20">
                  <UserCircle className="h-6 w-6 mt-0.5 text-primary flex-shrink-0" />
                  <div>
                    <span className="font-medium text-foreground block text-sm text-muted-foreground">Customer</span> {data.customerName}
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20">
                  <Building className="h-6 w-6 mt-0.5 text-primary flex-shrink-0" />
                  <div>
                    <span className="font-medium text-foreground block text-sm text-muted-foreground">Company</span> {data.companyName}
                  </div>
                </div>
                 <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20 md:col-span-2">
                  <MapPin className="h-6 w-6 mt-0.5 text-primary flex-shrink-0" />
                  <div>
                    <span className="font-medium text-foreground block text-sm text-muted-foreground">Address</span> {data.address}
                  </div>
                </div>
                {data.phoneNumber && (
                  <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20">
                    <Phone className="h-6 w-6 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground block text-sm text-muted-foreground">Phone</span> {data.phoneNumber}
                    </div>
                  </div>
                )}
                {data.service && (
                  <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20">
                    <Briefcase className="h-6 w-6 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground block text-sm text-muted-foreground">Service</span> {data.service}
                    </div>
                  </div>
                )}
                 <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20 md:col-span-2">
                    <CalendarDays className="h-6 w-6 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground block text-sm text-muted-foreground">Order Placed</span> {isClient ? formatDate(data.createdAt) : 'Loading date...'}
                    </div>
                  </div>
              </div>
            </div>
            
            <Separator className="my-8 bg-border/30" />

            <div>
              <h3 className="text-xl font-semibold mb-6 text-foreground">Status History</h3>
              <div className="space-y-8 relative pl-6 border-l-2 border-primary/30 ml-3">
                {data.statusHistory.slice().reverse().map((entry, index) => (
                  <div key={entry.id} className="flex items-start space-x-4 relative group">
                    <div className={`absolute -left-[1.45rem] top-1 h-9 w-9 rounded-full flex items-center justify-center ring-4 ring-background transition-all duration-200 ${index === 0 ? 'bg-primary shadow-lg' : 'bg-muted border-2 border-border group-hover:bg-primary/20 group-hover:border-primary/50'}`}>
                      {index === 0 ? 
                        <CheckCircle className={`h-5 w-5 text-primary-foreground`} /> :
                        getStatusIcon(entry.status, "h-4 w-4 !mr-0 group-hover:text-primary")
                      }
                    </div>
                    <div className="flex-1 pt-px ml-3">
                      <p className={`font-semibold text-lg ${index === 0 ? 'text-primary' : 'text-foreground group-hover:text-primary/90'}`}>{formatStatus(entry.status)}</p>
                      <p className="text-sm text-muted-foreground flex items-center mt-0.5">
                        <CalendarDays className="h-4 w-4 mr-1.5 opacity-70" /> 
                        {isClient ? formatDate(entry.timestamp) : 'Loading date...'} <span className="mx-2">&bull;</span> {entry.changedByUserName}
                      </p>
                      {entry.notes && <p className="text-md mt-2.5 bg-muted/50 p-4 rounded-lg border border-border/40 text-foreground/80 shadow-sm">{entry.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl border border-border/40 bg-card hover:shadow-primary/10 transition-shadow duration-300 rounded-xl">
          <CardHeader className="bg-card p-6 sm:p-8 border-b border-border/40">
            <div className="flex items-center space-x-4">
              <MessageSquare className="h-10 w-10 text-primary flex-shrink-0 p-1.5 bg-primary/10 rounded-lg border border-primary/20" />
              <CardTitle className="text-2xl font-semibold text-card-foreground">Comments & Updates ({data.comments.filter(c => !c.isInternal).length})</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground mt-1 ml-[56px]">Share updates or ask questions about this order.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="space-y-5 max-h-[500px] overflow-y-auto pr-3 custom-scrollbar">
              {data.comments.filter(c => !c.isInternal).map((comment) => (
                <div key={comment.id} className="flex items-start space-x-4 p-4 bg-secondary/40 rounded-lg shadow-sm border border-border/30 hover:border-primary/30 transition-colors">
                  <Avatar className="h-11 w-11 border-2 border-primary/30 flex-shrink-0 shadow-sm">
                     <AvatarImage src={`https://placehold.co/44x44.png?text=${comment.userName.slice(0,2).toUpperCase()}`} alt={comment.userName} data-ai-hint="user avatar"/>
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{comment.userName.slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-md font-semibold text-foreground">{comment.userName}</p>
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1.5 opacity-70" /> 
                        {isClient ? formatDate(comment.timestamp) : 'Loading date...'}
                      </p>
                    </div>
                    <p className="text-md text-foreground/90 whitespace-pre-wrap">{comment.text}</p>
                  </div>
                </div>
              ))}
              {data.comments.filter(c => !c.isInternal).length === 0 && (
                 <div className="text-center py-10">
                    <Image src="https://placehold.co/200x150.png?text=No+Comments" alt="No comments yet" data-ai-hint="empty message illustration" width={180} height={135} className="mx-auto rounded-lg opacity-50 shadow-sm" />
                    <p className="mt-5 text-muted-foreground text-lg">No public comments yet.</p>
                    <p className="text-sm text-muted-foreground">Be the first to add one using the form below!</p>
                 </div>
              )}
            </div>
            <Separator className="my-8 bg-border/30" />
            <div>
              <Label htmlFor="comment" className="text-xl font-semibold mb-4 block text-foreground">Add a Comment</Label>
              <Textarea id="comment" placeholder="Type your message here..." className="min-h-[140px] text-base mb-4 p-4 focus:border-primary bg-background/80 border-border/70 rounded-lg shadow-sm text-md" />
              <Button size="lg" className="w-full sm:w-auto shadow-lg hover:shadow-primary/40 transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-md py-3 px-6 rounded-lg transform hover:scale-[1.02]">
                <Send className="mr-2.5 h-5 w-5" /> Submit Comment
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <footer className="text-center mt-20 py-10 border-t border-border/30">
        <p className="text-md text-muted-foreground">&copy; {new Date().getFullYear()} TrackFlow. All rights reserved.</p>
        <p className="text-sm text-muted-foreground/70 mt-1.5">Precision Order Tracking, Simplified.</p>
      </footer>
    </div>
  );
}

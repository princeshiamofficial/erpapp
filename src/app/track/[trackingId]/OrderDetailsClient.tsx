
"use client";

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare, Package, UserCircle, CalendarDays, Clock, CheckCircle, Info, Phone, Briefcase, Building, MapPin, UserCheck } from "lucide-react";
import Image from "next/image";
import type { Comment, CustomStatus, TrackingLink } from "@/types"; // Use CustomStatus
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from '@/components/ui/label';
import { getStatusById, getContrastTextColor } from '@/lib/status-service'; // For status name/color resolution
import { submitCommentAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface OrderDetailsClientProps {
  order: TrackingLink;
  allStatuses: CustomStatus[]; // Pass all statuses for efficient lookup
}

export function OrderDetailsClient({ order: initialOrder, allStatuses }: OrderDetailsClientProps) {
  const [order, setOrder] = useState(initialOrder);
  const [isClient, setIsClient] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    setOrder(initialOrder); // Update state if initialOrder changes (e.g., due to revalidation)
  }, [initialOrder]);

  const getStatusDisplayInfo = useCallback((statusId: string): { name: string; color: string; textColor: string } => {
    const status = allStatuses.find(s => s.id === statusId);
    if (status) {
      return { name: status.name, color: status.color, textColor: getContrastTextColor(status.color) };
    }
    return { name: statusId, color: '#ccc', textColor: '#000' }; // Fallback
  }, [allStatuses]);

  const currentStatusInfo = getStatusDisplayInfo(order.currentStatus);

  const formatDate = (dateString: string | undefined) => {
    if (!isClient || !dateString) return "Loading date..."; // Or a skeleton
    try {
      return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return "Invalid Date";
    }
  };

  const getStatusIcon = (statusId: string, sizeClass = "h-6 w-6") => {
    const statusInfo = getStatusDisplayInfo(statusId); // Get full status info
    const commonClasses = `${sizeClass} mr-2 flex-shrink-0`;
    // Simplified icon logic, can be expanded based on status names/properties
    if (statusInfo.name.toLowerCase().includes("delivered") || statusInfo.name.toLowerCase().includes("shipped") || statusInfo.name.toLowerCase().includes("approved")) return <CheckCircle className={`${commonClasses} text-green-500`} />;
    if (statusInfo.name.toLowerCase().includes("design")) return <Info className={`${commonClasses} text-teal-500`} />; 
    if (statusInfo.name.toLowerCase().includes("production")) return <Info className={`${commonClasses} text-blue-500`} />;
    if (statusInfo.name.toLowerCase().includes("pending") || statusInfo.name.toLowerCase().includes("changes")) return <Clock className={`${commonClasses} text-yellow-600`} />;
    if (statusInfo.name.toLowerCase().includes("cancelled")) return <Info className={`${commonClasses} text-red-500`} />;
    return <Info className={`${commonClasses} text-gray-500`} />;
  };
  
  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
        toast({ title: "Cannot submit empty comment", variant: "destructive" });
        return;
    }
    setIsSubmittingComment(true);
    // Assuming public comments are from the customer. UserID might not be available.
    const result = await submitCommentAction(order.id, {
        userName: `${order.customerName} (Client)`, // Or a generic "Visitor"
        text: newComment,
        isInternal: false, 
    });

    if ('error' in result) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
        setOrder(result); // Update local order state with the new comment
        setNewComment('');
        toast({ title: "Success", description: "Your comment has been submitted." });
    }
    setIsSubmittingComment(false);
  };


  const publicComments = order.comments.filter(c => !c.isInternal);

  return (
    <main className="max-w-4xl mx-auto space-y-8 sm:space-y-10">
      <Card className="shadow-2xl overflow-hidden border-border/40 bg-card hover:shadow-primary/10 transition-shadow duration-300 rounded-xl">
        <CardHeader className="bg-card p-6 sm:p-8 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6">
            <Package className="h-16 w-16 sm:h-20 sm:w-20 text-primary mb-4 sm:mb-0 flex-shrink-0 p-3 bg-primary/10 rounded-lg border border-primary/20" />
            <div>
              <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-semibold text-card-foreground">Order ID: <span className="text-primary font-bold">{order.id}</span></CardTitle>
              <CardDescription className="text-md text-muted-foreground mt-1 sm:mt-1.5">
                Tracking information for {order.customerName}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-2 text-foreground flex items-center">
              {getStatusIcon(order.currentStatus, "h-8 w-8")}
              Current Status
            </h3>
            <p className="text-3xl sm:text-4xl font-bold ml-[40px] mt-1" style={{ color: currentStatusInfo.color }}>
              {currentStatusInfo.name}
            </p>
            <p className="text-sm text-muted-foreground mt-1.5 ml-[40px]">
              Last updated: {isClient ? formatDate(order.statusHistory[order.statusHistory.length - 1]?.timestamp) : <Skeleton className="h-4 w-32 inline-block" />}
            </p>
          </div>

          <Separator className="my-6 sm:my-8 bg-border/30" />

          <div>
            <h3 className="text-xl font-semibold mb-4 sm:mb-5 text-foreground">Order Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-4 sm:gap-y-5 text-md">
              <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20">
                <UserCircle className="h-5 w-5 sm:h-6 sm:w-6 mt-0.5 text-primary flex-shrink-0" />
                <div>
                  <span className="font-medium text-foreground block text-xs sm:text-sm text-muted-foreground">Customer</span> {order.customerName}
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20">
                <Building className="h-5 w-5 sm:h-6 sm:w-6 mt-0.5 text-primary flex-shrink-0" />
                <div>
                  <span className="font-medium text-foreground block text-xs sm:text-sm text-muted-foreground">Company</span> {order.companyName}
                </div>
              </div>
               <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20 md:col-span-2">
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6 mt-0.5 text-primary flex-shrink-0" />
                <div>
                  <span className="font-medium text-foreground block text-xs sm:text-sm text-muted-foreground">Address</span> {order.address}
                </div>
              </div>
              {order.phoneNumber && (
                <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20">
                  <Phone className="h-5 w-5 sm:h-6 sm:w-6 mt-0.5 text-primary flex-shrink-0" />
                  <div>
                    <span className="font-medium text-foreground block text-xs sm:text-sm text-muted-foreground">Phone</span> {order.phoneNumber}
                  </div>
                </div>
              )}
              {order.service && (
                <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20">
                  <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 mt-0.5 text-primary flex-shrink-0" />
                  <div>
                    <span className="font-medium text-foreground block text-xs sm:text-sm text-muted-foreground">Service</span> {order.service}
                  </div>
                </div>
              )}
               <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20">
                  <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 mt-0.5 text-primary flex-shrink-0" />
                  <div>
                    <span className="font-medium text-foreground block text-xs sm:text-sm text-muted-foreground">Order Placed</span> {isClient ? formatDate(order.createdAt) : <Skeleton className="h-4 w-24" />}
                  </div>
                </div>
                {order.designerRepresentativeName && (
                    <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20">
                        <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 mt-0.5 text-primary flex-shrink-0" />
                        <div>
                            <span className="font-medium text-foreground block text-xs sm:text-sm text-muted-foreground">Assigned Designer</span> {order.designerRepresentativeName}
                        </div>
                    </div>
                )}
            </div>
          </div>
          
          <Separator className="my-6 sm:my-8 bg-border/30" />

          <div>
            <h3 className="text-xl font-semibold mb-5 sm:mb-6 text-foreground">Status History</h3>
            <div className="space-y-6 sm:space-y-8 relative pl-5 sm:pl-6 border-l-2 border-primary/30 ml-2 sm:ml-3">
              {order.statusHistory.slice().reverse().map((entry, index) => {
                const entryStatusInfo = getStatusDisplayInfo(entry.status);
                return (
                  <div key={entry.id} className="flex items-start space-x-3 sm:space-x-4 relative group">
                    <div className={`absolute -left-[1.20rem] sm:-left-[1.45rem] top-1 h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center ring-4 ring-background transition-all duration-200 ${index === 0 ? 'bg-primary shadow-lg' : 'bg-muted border-2 border-border group-hover:bg-primary/20 group-hover:border-primary/50'}`}>
                      {index === 0 ? 
                        <CheckCircle className={`h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground`} /> :
                        getStatusIcon(entry.status, "h-4 w-4 sm:h-4 sm:w-4 !mr-0 group-hover:text-primary")
                      }
                    </div>
                    <div className="flex-1 pt-px ml-2 sm:ml-3">
                      <p className={`font-semibold text-md sm:text-lg ${index === 0 ? 'text-primary' : 'text-foreground group-hover:text-primary/90'}`}>{entryStatusInfo.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground flex items-center flex-wrap mt-0.5">
                        <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 opacity-70 flex-shrink-0" /> 
                        {isClient ? formatDate(entry.timestamp) : <Skeleton className="h-4 w-28" />} 
                        <span className="mx-1.5 hidden sm:inline">&bull;</span> 
                        <span className="block sm:inline w-full sm:w-auto mt-0.5 sm:mt-0">{entry.changedByUserName}</span>
                      </p>
                      {entry.notes && <p className="text-sm sm:text-md mt-2 sm:mt-2.5 bg-muted/50 p-3 sm:p-4 rounded-lg border border-border/40 text-foreground/80 shadow-sm">{entry.notes}</p>}
                    </div>
                  </div>
                );
                })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl border border-border/40 bg-card hover:shadow-primary/10 transition-shadow duration-300 rounded-xl">
        <CardHeader className="bg-card p-6 sm:p-8 border-b border-border/40">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 text-primary flex-shrink-0 p-1.5 bg-primary/10 rounded-lg border border-primary/20" />
            <CardTitle className="text-xl sm:text-2xl font-semibold text-card-foreground">Comments & Updates ({publicComments.length})</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground mt-1 ml-[44px] sm:ml-[56px]">Share updates or ask questions about this order.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="space-y-4 sm:space-y-5 max-h-[500px] overflow-y-auto pr-2 sm:pr-3 custom-scrollbar">
            {publicComments.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 bg-secondary/40 rounded-lg shadow-sm border border-border/30 hover:border-primary/30 transition-colors">
                <Avatar className="h-10 w-10 sm:h-11 sm:w-11 border-2 border-primary/30 flex-shrink-0 shadow-sm">
                    <AvatarImage src={`https://placehold.co/44x44.png?text=${comment.userName.slice(0,2).toUpperCase()}`} alt={comment.userName} data-ai-hint="user avatar"/>
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-sm">{comment.userName.slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                    <p className="text-sm sm:text-md font-semibold text-foreground">{comment.userName}</p>
                    <p className="text-xs text-muted-foreground flex items-center mt-0.5 sm:mt-0">
                      <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5 opacity-70" /> 
                      {isClient ? formatDate(comment.timestamp) : <Skeleton className="h-3 w-24" />}
                    </p>
                  </div>
                  <p className="text-sm sm:text-md text-foreground/90 whitespace-pre-wrap">{comment.text}</p>
                </div>
              </div>
            ))}
            {publicComments.length === 0 && (
                <div className="text-center py-8 sm:py-10">
                  <Image src="https://placehold.co/200x150.png?text=No+Comments" alt="No comments yet" data-ai-hint="empty message illustration" width={150} height={112} className="mx-auto rounded-lg opacity-50 shadow-sm" />
                  <p className="mt-4 sm:mt-5 text-muted-foreground text-md sm:text-lg">No public comments yet.</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Be the first to add one using the form below!</p>
                </div>
            )}
          </div>
          <Separator className="my-6 sm:my-8 bg-border/30" />
          <form onSubmit={handleCommentSubmit}>
            <Label htmlFor="comment" className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 block text-foreground">Add a Comment</Label>
            <Textarea 
                id="comment" 
                placeholder="Type your message here..." 
                className="min-h-[120px] sm:min-h-[140px] text-sm sm:text-base mb-4 p-3 sm:p-4 focus:border-primary bg-background/80 border-border/70 rounded-lg shadow-sm" 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={isSubmittingComment}
            />
            <Button 
                type="submit" 
                size="lg" 
                className="w-full sm:w-auto shadow-lg hover:shadow-primary/40 transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm sm:text-md py-2.5 sm:py-3 px-5 sm:px-6 rounded-lg transform hover:scale-[1.02]"
                disabled={isSubmittingComment}
            >
              {isSubmittingComment ? (
                <>
                  <Clock className="mr-2.5 h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2.5 h-4 w-4 sm:h-5 sm:w-5" /> Submit Comment
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}


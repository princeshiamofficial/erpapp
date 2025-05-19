
"use client";

import { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare, Package, CalendarDays, Clock, CheckCircle, Info, Phone, Building, MapPin, UserCheck, Layers, ThumbsUp, CornerDownRight, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import Image from "next/image";
import type { Comment, CustomStatus, TrackingLink, User, UserRole, OrderItem } from "@/types"; // Added OrderItem
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from '@/components/ui/label';
import { getContrastTextColor } from '@/lib/status-service';
import { submitCommentAction, submitClientReplyAction, toggleOrderCommentReactionAction, submitReplyAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import { formatDistanceToNowStrict } from 'date-fns';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';


interface OrderDetailsClientProps {
  order: TrackingLink;
  allStatuses: CustomStatus[];
  allUsersForMentions: User[];
}

const CLIENT_REACTOR_ID_KEY = 'colorHutClientReactorId';
const MAX_INITIAL_REPLIES_TO_SHOW = 1;

const getInitials = (name: string | undefined) => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
};

export function OrderDetailsClient({ order: initialOrder, allStatuses, allUsersForMentions = [] }: OrderDetailsClientProps) {
  const { currentUser } = useAuth();
  const [order, setOrder] = useState(initialOrder);
  const [isClient, setIsClient] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const { toast } = useToast();

  const [replyingTo, setReplyingTo] = useState<{ parentId: string; targetName: string; formUnderId: string } | null>(null);
  const [currentReplyText, setCurrentReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [clientReactorId, setClientReactorId] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeMentionStartIndex, setActiveMentionStartIndex] = useState<number | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<Array<User | { id: string, name: string, role: 'Client' }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Diagnostic log for the order prop
  useEffect(() => {
    console.log('OrderDetailsClient received order:', JSON.stringify(initialOrder, null, 2));
  }, [initialOrder]);


  useEffect(() => {
    setIsClient(true);
    setOrder(initialOrder);

    let storedReactorId = localStorage.getItem(CLIENT_REACTOR_ID_KEY);
    if (!storedReactorId) {
      storedReactorId = uuidv4();
      localStorage.setItem(CLIENT_REACTOR_ID_KEY, storedReactorId);
    }
    setClientReactorId(storedReactorId);

  }, [initialOrder]);

  useEffect(() => {
    if (allUsersForMentions && allUsersForMentions.length > 0) {
      console.log("OrderDetailsClient: Received allUsersForMentions:", allUsersForMentions.map(u => ({id: u.id, name: u.name, role: u.role})));
    }
  }, [allUsersForMentions]);


  const getReactorId = useCallback(() => {
    return currentUser?.id || clientReactorId;
  }, [currentUser, clientReactorId]);

  const getStatusDisplayInfo = useCallback((statusId: string): { name: string; color: string; textColor: string } => {
    const status = allStatuses.find(s => s.id === statusId);
    if (status) {
      return { name: status.name, color: status.color, textColor: getContrastTextColor(status.color) };
    }
    return { name: statusId, color: '#A1A1AA', textColor: '#FFFFFF' };
  }, [allStatuses]);

  const currentStatusInfo = getStatusDisplayInfo(order.currentStatus);

  const formatDate = (dateString: string | undefined, relative: boolean = false) => {
    if (!isClient || !dateString) return "Loading date...";
    try {
      const date = new Date(dateString);
      if (relative) {
        return formatDistanceToNowStrict(date, { addSuffix: true });
      }
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return "Invalid Date";
    }
  };

  const getStatusIcon = (statusId: string, sizeClass = "h-6 w-6") => {
    const statusInfo = getStatusDisplayInfo(statusId);
    const commonClasses = `${sizeClass} mr-2 flex-shrink-0`;

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
    const result = await submitCommentAction(order.id, {
      userName: currentUser ? currentUser.name : `${order.companyName} (Client)`,
      userRole: currentUser ? currentUser.role : 'Client',
      text: newComment,
      isInternal: false,
      userId: currentUser?.id
    });

    if ('error' in result) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setOrder(result);
      setNewComment('');
      toast({ title: "Success", description: "Your comment has been submitted." });
    }
    setIsSubmittingComment(false);
  };

  const handleReplySubmit = async (parentId: string) => {
    if (!currentReplyText.trim()) {
      toast({ title: "Cannot submit empty reply", variant: "destructive" });
      return;
    }
    setIsSubmittingReply(true);
    let result;

    if (currentUser) {
      result = await submitReplyAction(
        order.id,
        parentId,
        currentReplyText,
        false, // isInternal: public replies are not internal
        currentUser
      );
    } else {
      result = await submitClientReplyAction(
        order.id,
        parentId,
        currentReplyText
      );
    }
    setIsSubmittingReply(false);

    if ('error' in result) {
      toast({ title: "Error submitting reply", description: result.error, variant: "destructive" });
    } else {
      setOrder(result);
      setCurrentReplyText('');
      setReplyingTo(null);
      toast({ title: "Reply submitted" });
    }
  };

  const handleToggleLike = async (targetCommentId: string, isReply: boolean, parentCommentIdIfReply?: string) => {
    const currentReactorId = getReactorId();
    if (!currentReactorId) {
      toast({ title: "Error", description: "Could not identify reactor.", variant: "destructive" });
      return;
    }

    const originalOrder = JSON.parse(JSON.stringify(order)) as TrackingLink;
    let newOrderState = JSON.parse(JSON.stringify(order)) as TrackingLink;

    const findAndUpdateComment = (commentsArr: Comment[]): boolean => {
      for (let i = 0; i < commentsArr.length; i++) {
        if (commentsArr[i].id === targetCommentId && !isReply) {
          commentsArr[i].likes = commentsArr[i].likes || { count: 0, reactedBy: [] };
          const likedIndex = commentsArr[i].likes!.reactedBy.indexOf(currentReactorId);
          if (likedIndex > -1) {
            commentsArr[i].likes!.reactedBy.splice(likedIndex, 1);
            commentsArr[i].likes!.count--;
          } else {
            commentsArr[i].likes!.reactedBy.push(currentReactorId);
            commentsArr[i].likes!.count++;
          }
          return true;
        }
        if (isReply && parentCommentIdIfReply && commentsArr[i].id === parentCommentIdIfReply && commentsArr[i].replies) {
          const replyIndex = (commentsArr[i].replies as Comment[]).findIndex(r => r.id === targetCommentId);
          if (replyIndex > -1) {
            const reply = (commentsArr[i].replies as Comment[])[replyIndex];
            reply.likes = reply.likes || { count: 0, reactedBy: [] };
            const likedIndex = reply.likes.reactedBy.indexOf(currentReactorId);
            if (likedIndex > -1) {
              reply.likes.reactedBy.splice(likedIndex, 1);
              reply.likes.count--;
            } else {
              reply.likes.reactedBy.push(currentReactorId);
              reply.likes.count++;
            }
            return true;
          }
        }
      }
      return false;
    };

    findAndUpdateComment(newOrderState.comments);
    setOrder(newOrderState);

    const result = await toggleOrderCommentReactionAction(order.id, targetCommentId, isReply, parentCommentIdIfReply, currentReactorId, 'like');

    if ('error' in result) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      setOrder(originalOrder);
    } else {
      setOrder(result);
    }
  };

  const renderTextWithMentions = (text: string) => {
    if (!text) return '';
    const mentionRegex = /@([\w\s.-]+)/g; // Matches @ followed by one or more word chars, spaces, dots, or hyphens
    const parts = text.split(mentionRegex);

    return parts.map((part, index) => {
      if (index % 2 === 1) { // This is a username part
        return <strong key={index} className="text-primary font-semibold">{part}</strong>;
      }
      return part;
    });
  };


  const handleReplyTextChangeForMention = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCurrentReplyText(text);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbolIndex !== -1) {
      const potentialQuery = textBeforeCursor.substring(lastAtSymbolIndex + 1);
      // Check if the characters after @ are valid for a query (e.g., no space immediately after @)
      // and if we are not in the middle of a word
      const charAfterAt = text.charAt(lastAtSymbolIndex + 1);
      const charBeforeAt = lastAtSymbolIndex > 0 ? text.charAt(lastAtSymbolIndex -1) : ' ';


      if ( (charBeforeAt === ' ' || lastAtSymbolIndex === 0) && charAfterAt !== ' ' && /^[a-zA-Z0-9_]*$/.test(potentialQuery) ) {
         // Only trigger if @ is start of word and query is alphanumeric/underscore
        setMentionQuery(potentialQuery);
        setActiveMentionStartIndex(lastAtSymbolIndex);

        const clientOption = { id: 'client-mention', name: order.companyName, role: 'Client' as 'Client' };
        const usersToSearch = [clientOption, ...(allUsersForMentions || [])];


        const filtered = usersToSearch.filter(user =>
          user.name.toLowerCase().includes(potentialQuery.toLowerCase()) ||
          user.role.toLowerCase().includes(potentialQuery.toLowerCase())
        ).slice(0, 7);
        setMentionSuggestions(filtered);
        return;
      }
    }
    // If no active mention, reset
    setMentionQuery(null);
    setActiveMentionStartIndex(null);
    setMentionSuggestions([]);
  };

  const handleMentionSelect = (userNameToInsert: string) => {
    if (activeMentionStartIndex === null || !replyTextareaRef.current) return;

    const text = currentReplyText;
    const queryLength = mentionQuery?.length || 0;

    const textBefore = text.substring(0, activeMentionStartIndex);
    // Find where the text *after* the mention query would start
    // This needs to consider the full query length to correctly splice
    const textAfter = text.substring(activeMentionStartIndex + 1 + queryLength);


    const newText = `${textBefore}@${userNameToInsert.replace(/\s+/g, '')} ${textAfter}`;
    setCurrentReplyText(newText);

    // Set cursor position
    const newCursorPosition = activeMentionStartIndex + 1 + userNameToInsert.replace(/\s+/g, '').length + 1;

    // Needs a slight delay for the state update to propagate to the textarea value
    setTimeout(() => {
        if (replyTextareaRef.current) {
            replyTextareaRef.current.focus();
            replyTextareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
    }, 0);


    setMentionQuery(null);
    setActiveMentionStartIndex(null);
    setMentionSuggestions([]);
  };


  const renderComment = (comment: Comment, isReply = false, parentCommentId?: string) => {
    if (comment.isInternal && !currentUser) return null;
    if (comment.isInternal && currentUser && !['ADMIN', 'SYSTEM_ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'].includes(currentUser.role)) return null;

    const reactorId = getReactorId();
    const hasLiked = reactorId && comment.likes?.reactedBy.includes(reactorId);
    const userToDisplay = comment.userId && allUsersForMentions ? allUsersForMentions.find(u => u.id === comment.userId) : null;
    const avatarSrc = userToDisplay?.avatarUrl || undefined;
    const avatarFallback = getInitials(comment.userName);

    const currentVisibleReplies = (comment.replies || []).filter(reply =>
        !(reply.isInternal && !currentUser) &&
        !(reply.isInternal && currentUser && !['ADMIN', 'SYSTEM_ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'].includes(currentUser.role))
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const isExpanded = expandedReplies[comment.id] || false;
    const repliesToRender = isExpanded || currentVisibleReplies.length <= MAX_INITIAL_REPLIES_TO_SHOW
        ? currentVisibleReplies
        : currentVisibleReplies.slice(0, MAX_INITIAL_REPLIES_TO_SHOW);


    return (
      <div key={comment.id} className={`flex items-start space-x-2.5 sm:space-x-3 ${isReply ? 'ml-6 sm:ml-10' : ''}`}>
        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-primary/30 shadow-sm flex-shrink-0 mt-1">
          <AvatarImage src={avatarSrc} alt={comment.userName} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{avatarFallback}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="bg-muted px-3.5 py-2.5 rounded-xl shadow-sm border border-border/20 group hover:border-primary/20 transition-colors">
            <div className="flex items-baseline space-x-1.5">
              <p className="text-sm font-semibold text-foreground">{comment.userName}</p>
              {comment.userRole && comment.userRole !== 'Client' && (
                <span className="text-xs text-muted-foreground">
                  ({comment.userRole === 'DESIGNER_REPRESENTATIVE' ? 'Designer Rep' : comment.userRole})
                </span>
              )}
            </div>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-0.5">{renderTextWithMentions(comment.text)}</p>
          </div>
          <div className="flex items-center space-x-2.5 mt-1.5 pl-1 text-xs">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleToggleLike(comment.id, isReply, parentCommentId)}
              className={`font-medium px-1.5 py-0.5 rounded-sm transition-colors ${hasLiked ? 'text-primary bg-primary/10 hover:bg-primary/20 font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
              title={hasLiked ? "Unlike" : "Like"}
              disabled={!reactorId}
            >
              Like
            </motion.button>
            <span className="text-muted-foreground">&middot;</span>
            <button
              onClick={() => {
                const replyingToThis = replyingTo?.formUnderId === comment.id;
                setReplyingTo(replyingToThis ? null : {
                  parentId: isReply ? parentCommentId! : comment.id,
                  targetName: comment.userName,
                  formUnderId: comment.id
                });
                setCurrentReplyText(replyingToThis ? '' : `@${comment.userName.replace(/\s+/g, '')} `);
                if (!replyingToThis && replyTextareaRef.current) {
                    setTimeout(() => replyTextareaRef.current?.focus(), 0);
                }
              }}
              className="font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 px-1.5 py-0.5 rounded-sm transition-colors"
            >
              Reply
            </button>
            <span className="text-muted-foreground">&middot;</span>
            <span className="text-muted-foreground" title={formatDate(comment.timestamp)}>
              {isClient ? formatDistanceToNowStrict(new Date(comment.timestamp), { addSuffix: true }) : <Skeleton className="h-3 w-10 inline-block" />}
            </span>
            {comment.likes && comment.likes.count > 0 && (
              <>
                <span className="text-muted-foreground">&middot;</span>
                <div className="flex items-center text-muted-foreground">
                  <ThumbsUp className={`h-3.5 w-3.5 mr-0.5 ${hasLiked ? 'text-primary fill-primary/20' : 'text-muted-foreground/70'}`} />
                  {comment.likes.count}
                </div>
              </>
            )}
          </div>

          {replyingTo?.formUnderId === comment.id && (
            <Popover open={mentionQuery !== null} onOpenChange={(open) => { if(!open) setMentionQuery(null); }}>
              <PopoverAnchor asChild>
                <form onSubmit={(e) => { e.preventDefault(); handleReplySubmit(replyingTo!.parentId); }} className="mt-2.5 flex items-start space-x-2.5 pl-1">
                  <Avatar className="h-7 w-7 border border-border/40 flex-shrink-0 mt-0.5 shadow-sm">
                    <AvatarImage src={currentUser?.avatarUrl || (clientReactorId ? `https://placehold.co/28x28.png?text=${getInitials(currentUser?.name || "CL")}` : undefined)} alt="Current user avatar" />
                    <AvatarFallback className="bg-muted text-xs font-semibold">{getInitials(currentUser?.name || "CL")}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      ref={replyTextareaRef}
                      placeholder={`Write a reply to ${replyingTo.targetName}...`}
                      value={currentReplyText}
                      onChange={handleReplyTextChangeForMention}
                      className="min-h-[60px] text-sm bg-background/70 border-border/50 focus:border-primary rounded-lg shadow-inner p-2.5"
                      disabled={isSubmittingReply}
                      rows={2}
                    />
                     <div className="flex justify-end items-center mt-1.5">
                        {mentionQuery !== null && mentionSuggestions.length === 0 && <span className="text-xs text-muted-foreground mr-auto">No matches found</span>}
                        <Button type="button" variant="ghost" size="sm" className="text-xs h-7 px-2.5 mr-1.5 text-muted-foreground hover:text-foreground" onClick={() => setReplyingTo(null)} disabled={isSubmittingReply}>Cancel</Button>
                        <Button type="submit" size="sm" disabled={isSubmittingReply || !currentReplyText.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-7 px-3 rounded-md">
                            {isSubmittingReply ? "Sending..." : "Send Reply"}
                        </Button>
                    </div>
                  </div>
                </form>
              </PopoverAnchor>
              {mentionSuggestions.length > 0 && (
                 <PopoverContent
                    className="w-[250px] p-0"
                    side="top"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()} // Keep focus on textarea
                >
                    <Command>
                        <CommandList>
                        {mentionSuggestions.map((user) => (
                            <CommandItem
                            key={user.id}
                            value={user.name + user.role} // For Command's internal filtering if CommandInput was used
                            onSelect={() => handleMentionSelect(user.name)}
                            className="cursor-pointer flex items-center gap-2"
                            >
                             <Avatar className="h-6 w-6 text-xs">
                                <AvatarImage src={(user as User).avatarUrl || undefined} />
                                <AvatarFallback className="bg-muted text-xs">{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">({user.role === 'DESIGNER_REPRESENTATIVE' ? 'DR' : user.role})</span>
                            </CommandItem>
                        ))}
                        </CommandList>
                    </Command>
                </PopoverContent>
              )}
            </Popover>
          )}

          {repliesToRender.length > 0 && (
            <div className="mt-3 space-y-3">
              {repliesToRender.map(reply => renderComment(reply, true, comment.id))}
            </div>
          )}
           {!isReply && currentVisibleReplies.length > MAX_INITIAL_REPLIES_TO_SHOW && (
             <Button
                variant="link"
                size="sm"
                onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: !isExpanded }))}
                className="text-xs font-medium text-primary hover:text-primary/80 mt-2 pl-1"
            >
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                {isExpanded ? 'Hide Replies' : `View ${currentVisibleReplies.length - MAX_INITIAL_REPLIES_TO_SHOW} more replies`}
            </Button>
           )}
        </div>
      </div>
    );
  };


  const publicCommentsAndRepliesCount = order.comments.reduce((acc, comment) => {
    if (!(comment.isInternal && !currentUser) && !(comment.isInternal && currentUser && !['ADMIN', 'SYSTEM_ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'].includes(currentUser.role))) {
      acc++;
      if (comment.replies) {
        acc += comment.replies.filter(reply => !(reply.isInternal && !currentUser) && !(reply.isInternal && currentUser && !['ADMIN', 'SYSTEM_ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'].includes(currentUser.role))).length;
      }
    }
    return acc;
  }, 0);

  const lastStatusUpdateTimestamp = order.statusHistory.length > 0 ? order.statusHistory[order.statusHistory.length - 1].timestamp : order.createdAt;

  return (
    <main className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      <Card className="shadow-2xl overflow-hidden border-border/40 bg-card hover:shadow-primary/10 transition-shadow duration-300 rounded-xl">
        <CardHeader className="bg-card p-6 sm:p-8 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6">
            <Package className="h-16 w-16 sm:h-20 sm:w-20 text-primary mb-4 sm:mb-0 flex-shrink-0 p-3 bg-primary/10 rounded-lg border border-primary/20" />
            <div>
              <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-semibold text-card-foreground">Order ID: <span className="text-primary font-bold">{order.id}</span></CardTitle>
              <CardDescription className="text-md text-muted-foreground mt-1 sm:mt-1.5">
                Tracking information for {order.companyName}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-2 text-foreground flex items-center">
              {getStatusIcon(order.currentStatus, "h-8 w-8")}
              Current Status
            </h3>
            <p className="text-3xl sm:text-4xl font-bold ml-[40px] mt-1" style={{ color: currentStatusInfo.color }}>
              {currentStatusInfo.name}
            </p>
            <div className="text-sm text-muted-foreground mt-1.5 ml-[40px]">
               Last updated: {isClient ? formatDate(lastStatusUpdateTimestamp) : <Skeleton className="h-4 w-48 inline-block" />}
            </div>
          </div>

          <Separator className="my-6 sm:my-8 bg-border/30" />

          <div>
            <h3 className="text-xl font-semibold mb-4 sm:mb-5 text-foreground">Order Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-4 sm:gap-y-5 text-sm sm:text-base">
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-4 md:gap-y-0">
                  <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20 hover:shadow-md hover:border-primary/30 transition-all">
                    <div className="p-2 bg-primary/10 rounded-full border border-primary/20 flex-shrink-0">
                        <Building className="h-5 w-5 text-primary " />
                    </div>
                    <div>
                      <span className="font-medium text-foreground block text-xs uppercase tracking-wider text-muted-foreground">Company</span> {order.companyName}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20 hover:shadow-md hover:border-primary/30 transition-all">
                    <div className="p-2 bg-primary/10 rounded-full border border-primary/20 flex-shrink-0">
                        <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground block text-xs uppercase tracking-wider text-muted-foreground">Phone</span> {order.phoneNumber}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20 hover:shadow-md hover:border-primary/30 transition-all md:col-span-2">
                <div className="p-2 bg-primary/10 rounded-full border border-primary/20 flex-shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="font-medium text-foreground block text-xs uppercase tracking-wider text-muted-foreground">Address</span> {order.address}
                </div>
              </div>

              {Array.isArray(order.orderItems) && order.orderItems.length > 0 ? (
                 order.orderItems.map((item, index) => (
                  <div key={item.id || index} className="md:col-span-2 flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20 hover:shadow-md hover:border-primary/30 transition-all">
                      <div className="p-2 bg-primary/10 rounded-full border border-primary/20 flex-shrink-0">
                      <Layers className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                      <span className="font-medium text-foreground block text-xs uppercase tracking-wider text-muted-foreground">
                          Service Item {order.orderItems.length > 1 ? `#${index + 1}` : ''}
                      </span>
                      <span className="font-semibold text-card-foreground">{item.model}</span> - {item.quantity} Pcs ({item.lamination})
                      </div>
                  </div>
                  ))
              ) : (
                  <div className="md:col-span-2 flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20">
                  <div className="p-2 bg-primary/10 rounded-full border border-primary/20 flex-shrink-0">
                      <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                      <span className="font-medium text-foreground block text-xs uppercase tracking-wider text-muted-foreground">Service Details</span>
                      Not specified
                  </div>
                  </div>
              )}


               <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20 hover:shadow-md hover:border-primary/30 transition-all">
                  <div className="p-2 bg-primary/10 rounded-full border border-primary/20 flex-shrink-0">
                    <CalendarDays className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="font-medium text-foreground block text-xs uppercase tracking-wider text-muted-foreground">Order Placed</span> {isClient ? formatDate(order.createdAt) : <Skeleton className="h-4 w-32" />}
                  </div>
                </div>

                {order.designerRepresentativeName && (
                    <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/20 hover:shadow-md hover:border-primary/30 transition-all">
                        <div className="p-2 bg-primary/10 rounded-full border border-primary/20 flex-shrink-0">
                            <UserCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <span className="font-medium text-foreground block text-xs uppercase tracking-wider text-muted-foreground">Assigned Designer</span> {order.designerRepresentativeName}
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
                      <div className="text-xs sm:text-sm text-muted-foreground flex items-center flex-wrap mt-0.5">
                        <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 opacity-70 flex-shrink-0" />
                        {isClient ? formatDate(entry.timestamp) : <Skeleton className="h-4 w-32" />}
                        <span className="mx-1.5 hidden sm:inline">&bull;</span>
                        <span className="block sm:inline w-full sm:w-auto mt-0.5 sm:mt-0">{entry.changedByUserName}</span>
                      </div>
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
            <MessageCircle className="h-8 w-8 sm:h-10 sm:w-10 text-primary flex-shrink-0 p-1.5 bg-primary/10 rounded-lg border border-primary/20" />
            <CardTitle className="text-xl sm:text-2xl font-semibold text-card-foreground">Comments & Updates ({publicCommentsAndRepliesCount})</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground mt-1 ml-[44px] sm:ml-[56px]">Share updates or ask questions about this order.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 space-y-5">
          <div className="space-y-4 sm:space-y-5 max-h-[600px] overflow-y-auto pr-2 sm:pr-3 custom-scrollbar">
             {order.comments
              .filter(comment => !(comment.isInternal && !currentUser) && !(comment.isInternal && currentUser && !['ADMIN', 'SYSTEM_ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'].includes(currentUser.role)))
              .map((comment) => renderComment(comment))}
            {publicCommentsAndRepliesCount === 0 && (
                <div className="text-center py-8 sm:py-10">
                  <Image src="https://placehold.co/150x112.png" alt="No comments yet" data-ai-hint="empty message" width={150} height={112} className="mx-auto rounded-lg opacity-50 shadow-sm" />
                  <p className="mt-4 sm:mt-5 text-muted-foreground text-md sm:text-lg">No public comments yet.</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Be the first to add one using the form below!</p>
                </div>
            )}
          </div>
          <Separator className="my-6 sm:my-8 bg-border/30" />
          <form onSubmit={handleCommentSubmit} className="flex items-start space-x-3">
            <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-primary/30 shadow-sm flex-shrink-0 mt-0.5">
               <AvatarImage src={currentUser?.avatarUrl || (clientReactorId ? `https://placehold.co/40x40.png?text=${getInitials(currentUser?.name || "CL")}` : undefined)} alt="Your avatar" />
               <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{getInitials(currentUser?.name || "CL")}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                  id="comment"
                  placeholder="Write a public comment..."
                  className="min-h-[80px] sm:min-h-[100px] text-sm sm:text-base mb-2.5 p-3 bg-background/70 border-border/70 rounded-lg shadow-inner focus:border-primary focus:ring-1 focus:ring-primary"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={isSubmittingComment}
                  rows={3}
              />
              <div className="flex justify-end">
                <Button
                    type="submit"
                    size="default"
                    className="shadow-md hover:shadow-primary/30 transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm py-2 px-5 rounded-lg transform hover:scale-[1.02]"
                    disabled={isSubmittingComment || !newComment.trim()}
                >
                  {isSubmittingComment ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" /> Posting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" /> Post Comment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

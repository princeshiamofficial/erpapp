"use client";

import React, { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Send, MessageSquare, Package, CalendarDays, Clock, CheckCircle, Info, Phone, Building, MapPin, Layers, Heart, CornerDownRight, ChevronDown, ChevronUp, MessageCircle, UserCheck, FileText, Landmark, Edit } from "lucide-react";
import Image from "next/image";
import type { Comment, CustomStatus, TrackingLink, User, UserRole, OrderItem } from "@/types";
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
  allUsersForMentions?: User[];
  areCommentsVisible: boolean;
}

const CLIENT_AVATAR_URL = 'https://i.ibb.co/7dphf0LX/avatar-with-a-young-face-pictures-of-men-vector-46356734.jpg';

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
};

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format(value);
};

const MAX_INITIAL_REPLIES_TO_SHOW = 1;


export function OrderDetailsClient({ order: initialOrder, allStatuses, allUsersForMentions = [], areCommentsVisible }: OrderDetailsClientProps) {
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

  useEffect(() => {
    if (Array.isArray(allUsersForMentions)) {
        // console.log("OrderDetailsClient: Received allUsersForMentions (first 5):", allUsersForMentions.slice(0, 5).map(u => ({id: u.id, name: u.name, role: u.role, avatarUrl: u.avatarUrl ? 'Exists' : 'None'})));
    } else {
        // console.warn("OrderDetailsClient: allUsersForMentions prop is not an array. Received:", allUsersForMentions);
    }
  }, [allUsersForMentions]);


  useEffect(() => {
    setIsClient(true);
    setOrder(initialOrder);
    // console.log('OrderDetailsClient received order:', JSON.stringify(initialOrder, null, 2));


    let storedReactorId = localStorage.getItem('CLIENT_REACTOR_ID_KEY');
    if (!storedReactorId) {
      storedReactorId = uuidv4();
      localStorage.setItem('CLIENT_REACTOR_ID_KEY', storedReactorId);
    }
    setClientReactorId(storedReactorId);

  }, [initialOrder]);

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
      userName: currentUser ? currentUser.name : (order.companyName || "Client"),
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
       if (typeof Notification !== 'undefined' && Notification.permission === "granted") {
        showBrowserNotification("Comment Posted", { body: "Your comment was successfully submitted." });
      }
    }
    setIsSubmittingComment(false);
  };

  const handleReplySubmit = async () => {
    if (!replyingTo || !currentReplyText.trim()) {
      toast({ title: "Cannot submit empty reply", variant: "destructive" });
      return;
    }
    setIsSubmittingReply(true);
    let result;

    if (currentUser) {
      result = await submitReplyAction(
        order.id,
        replyingTo.parentId,
        currentReplyText,
        false, 
        currentUser
      );
    } else {
      result = await submitClientReplyAction(
        order.id,
        replyingTo.parentId,
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
       if (typeof Notification !== 'undefined' && Notification.permission === "granted") {
        showBrowserNotification("Reply Posted", { body: "Your reply was successfully submitted." });
      }
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
        const currentComment = commentsArr[i];
        if (currentComment.id === (isReply ? parentCommentIdIfReply : targetCommentId)) {
          const targetItem = isReply
            ? (currentComment.replies || []).find(r => r.id === targetCommentId)
            : currentComment;

          if (targetItem) {
            targetItem.likes = targetItem.likes || { count: 0, reactedBy: [] };
            const likedIndex = targetItem.likes.reactedBy.indexOf(currentReactorId);
            if (likedIndex > -1) {
              targetItem.likes.reactedBy.splice(likedIndex, 1);
              targetItem.likes.count--;
            } else {
              targetItem.likes.reactedBy.push(currentReactorId);
              targetItem.likes.count++;
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
    return text.split(/(@[^\s@]+)/g).map((part, index) => {
      if (index % 2 === 1 && part.startsWith('@')) {
        return <strong key={index} className="text-primary font-semibold">{part.substring(1)}</strong>;
      }
      return part;
    });
  };


  const handleReplyTextChangeForMention = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCurrentReplyText(text);

    const cursorPosition = e.target.selectionStart;
    if (cursorPosition === null) {
      setMentionQuery(null);
      setActiveMentionStartIndex(null);
      setMentionSuggestions([]);
      return;
    }
    
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbolIndex !== -1) {
        const potentialQuery = textBeforeCursor.substring(lastAtSymbolIndex + 1);
        // Allow query to be empty (just "@") or start with characters
        if (/^[^\s@]*/.test(potentialQuery)) { 
            setMentionQuery(potentialQuery);
            setActiveMentionStartIndex(lastAtSymbolIndex);
            
            const clientOption = { id: 'client-mention', name: (order.companyName || "Client"), role: 'Client' as 'Client' };
             const usersToSearch = (Array.isArray(allUsersForMentions) ? [clientOption, ...allUsersForMentions] : [clientOption]);
            
            const filtered = usersToSearch.filter(user =>
                (user.name.toLowerCase().includes(potentialQuery.toLowerCase()) ||
                 (user.role && user.role.toLowerCase().includes(potentialQuery.toLowerCase())))
            ).slice(0, 7);
            setMentionSuggestions(filtered);
            return;
        }
    }
    setMentionQuery(null);
    setActiveMentionStartIndex(null);
    setMentionSuggestions([]);
  };


  const handleMentionSelect = (userNameToInsert: string) => {
    if (activeMentionStartIndex === null || !replyTextareaRef.current) return;

    const text = currentReplyText;
    const mentionTag = userNameToInsert.replace(/\s+/g, ''); 
    
    const textBeforeAt = text.substring(0, activeMentionStartIndex);
    
    // Determine the end of the partial mention based on cursor position
    const queryLength = mentionQuery?.length || 0;
    const currentMentionEndIndex = activeMentionStartIndex + 1 + queryLength;
    const textAfterMentionEnd = text.substring(currentMentionEndIndex);

    const newText = `${textBeforeAt}@${mentionTag} ${textAfterMentionEnd.trimStart()}`;
    setCurrentReplyText(newText);
    
    const newCursorPosition = activeMentionStartIndex + 1 + mentionTag.length + 1;

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

    let avatarSrc: string | undefined = undefined;
    let avatarDataAiHint = "user initials avatar";
    let userToDisplay: User | undefined | null = null;

    if (comment.userRole === 'Client') {
      avatarSrc = CLIENT_AVATAR_URL;
      avatarDataAiHint = "client avatar";
    } else if (comment.userId && Array.isArray(allUsersForMentions)) {
      userToDisplay = allUsersForMentions.find(u => u.id === comment.userId);
      if (userToDisplay?.avatarUrl) {
        avatarSrc = userToDisplay.avatarUrl;
        avatarDataAiHint = "user uploaded avatar";
      }
    }
    const avatarFallback = getInitials(comment.userName || "User");


    const currentVisibleReplies = (comment.replies || []).filter(reply =>
      !(reply.isInternal && !currentUser) &&
      !(reply.isInternal && currentUser && !['ADMIN', 'SYSTEM_ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'].includes(currentUser.role))
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const isRepliesExpanded = expandedReplies[comment.id] || false;
    const repliesToRender = isRepliesExpanded || currentVisibleReplies.length <= MAX_INITIAL_REPLIES_TO_SHOW
      ? currentVisibleReplies
      : currentVisibleReplies.slice(0, MAX_INITIAL_REPLIES_TO_SHOW);


    return (
      <div key={comment.id} className={`flex space-x-2.5 sm:space-x-3 ${isReply ? 'ml-8 sm:ml-10' : ''}`}>
        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-primary/30 shadow-sm flex-shrink-0 mt-0.5">
           <AvatarImage src={avatarSrc} alt={comment.userName} data-ai-hint={avatarDataAiHint} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{avatarFallback}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div
            onDoubleClick={() => handleToggleLike(comment.id, isReply, parentCommentId)}
            className="bg-muted dark:bg-muted/60 px-3.5 py-2.5 rounded-xl shadow-sm group transition-colors border border-transparent"
          >
            <div className="flex items-baseline space-x-1.5">
              <p className="text-sm font-semibold text-foreground">{comment.userName}</p>
              {comment.userRole && comment.userRole !== 'Client' && (
                <span className="text-xs text-muted-foreground">
                  ({comment.userRole === 'DESIGNER_REPRESENTATIVE' ? 'DR' : comment.userRole.replace(/_/g, ' ')})
                </span>
              )}
            </div>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-0.5">{renderTextWithMentions(comment.text)}</p>
          </div>
          <div className="flex items-center space-x-2 mt-1.5 pl-1 text-xs">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleToggleLike(comment.id, isReply, parentCommentId)}
              className={`font-medium px-1.5 py-0.5 rounded-sm transition-colors flex items-center gap-1 group/likebtn ${hasLiked ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20 font-semibold' : 'text-muted-foreground hover:bg-muted/50 hover:text-red-500'
                }`}
              title={hasLiked ? "Unlike" : "Like"}
              disabled={!reactorId}
            >
              <motion.span
                animate={{ scale: hasLiked && reactorId ? [1, 1.4, 1, 1.2, 1] : 1 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                key={`${comment.id}-${hasLiked ? 'liked' : 'unliked'}`}
              >
                <Heart className={`h-4 w-4 ${hasLiked ? 'fill-red-500 text-red-500' : 'fill-transparent text-muted-foreground group-hover/likebtn:text-red-500'}`} />
              </motion.span>
              <span className="text-xs">Like</span>
              {comment.likes && comment.likes.count > 0 && (
                <span className="text-xs ml-0.5">({comment.likes.count})</span>
              )}
            </motion.button>

            <span className="text-muted-foreground">&middot;</span>
            <button
              onClick={() => {
                 const isOpeningNewReplyForm = !replyingTo || replyingTo.formUnderId !== comment.id;
                 const targetUserNameForMention = comment.userName.replace(/\s+/g, '');
                 setReplyingTo(isOpeningNewReplyForm ? {
                   parentId: isReply ? parentCommentId! : comment.id,
                   targetName: comment.userName,
                   formUnderId: comment.id 
                 } : null);

                 if (isOpeningNewReplyForm) {
                   setCurrentReplyText(`@${targetUserNameForMention} `);
                   setTimeout(() => replyTextareaRef.current?.focus(), 0);
                 } else {
                   setCurrentReplyText('');
                 }
              }}
              className="font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 px-1.5 py-0.5 rounded-sm transition-colors"
            >
              Reply
            </button>
            <span className="text-muted-foreground">&middot;</span>
            <span className="text-muted-foreground" title={isClient ? formatDate(comment.timestamp) : 'Loading date...'}>
              {isClient ? formatDistanceToNowStrict(new Date(comment.timestamp), { addSuffix: true }) : <Skeleton className="h-3 w-10 inline-block" />}
            </span>
          </div>

          {replyingTo?.formUnderId === comment.id && (
            <Popover open={mentionQuery !== null && mentionSuggestions.length > 0} onOpenChange={(open) => { if (!open) { setMentionQuery(null); setActiveMentionStartIndex(null); setMentionSuggestions([]); } }}>
              <PopoverAnchor asChild>
                <form onSubmit={(e) => { e.preventDefault(); handleReplySubmit(); }} className="mt-2.5 flex items-start space-x-2.5 pl-0 sm:pl-1">
                  <Avatar className="h-7 w-7 border border-border/40 flex-shrink-0 mt-0.5 shadow-sm">
                    <AvatarImage src={currentUser?.avatarUrl || (clientReactorId ? CLIENT_AVATAR_URL : undefined)} alt="Current user avatar" data-ai-hint={currentUser?.avatarUrl ? "user uploaded avatar" : (clientReactorId ? "client avatar" : "user initials avatar")} />
                    <AvatarFallback className="bg-muted text-xs font-semibold">{getInitials(currentUser?.name || (clientReactorId ? (order.companyName || "Client") : "U"))}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      ref={replyTextareaRef}
                      placeholder={`Write a reply to ${replyingTo.targetName}...`}
                      value={currentReplyText}
                      onChange={handleReplyTextChangeForMention}
                      className="min-h-[50px] sm:min-h-[60px] text-sm bg-background/70 border-border/50 focus:border-primary rounded-lg shadow-inner p-2.5"
                      disabled={isSubmittingReply}
                      rows={2}
                    />
                    <div className="flex justify-end items-center mt-1.5">
                      {mentionQuery !== null && mentionSuggestions.length === 0 && activeMentionStartIndex !== null && <span className="text-xs text-muted-foreground mr-auto">No matches found</span>}
                      <Button type="button" variant="ghost" size="sm" className="text-xs h-7 px-2.5 mr-1.5 text-muted-foreground hover:text-foreground" onClick={() => { setReplyingTo(null); setCurrentReplyText(''); }} disabled={isSubmittingReply}>Cancel</Button>
                      <Button type="submit" size="sm" disabled={isSubmittingReply || !currentReplyText.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-7 px-3 rounded-md">
                        {isSubmittingReply ? "Sending..." : "Send Reply"}
                      </Button>
                    </div>
                  </div>
                </form>
              </PopoverAnchor>
              {mentionQuery !== null && mentionSuggestions.length > 0 && (
                <PopoverContent
                  key={mentionQuery + (activeMentionStartIndex ?? '') + 'popover'}
                  className="w-[250px] p-0"
                  side="top"
                  align="start"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <Command>
                    <CommandList>
                      {mentionSuggestions.map((user) => (
                        <CommandItem
                          key={user.id + (activeMentionStartIndex ?? '')}
                          value={user.name + user.role}
                          onSelect={() => handleMentionSelect(user.name)}
                          className="cursor-pointer flex items-center gap-2"
                        >
                          <Avatar className="h-6 w-6 text-xs">
                            <AvatarImage src={user.role === 'Client' ? CLIENT_AVATAR_URL : (user as User).avatarUrl || undefined} />
                            <AvatarFallback className="bg-muted text-xs">{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{user.name}</span>
                          <span className="text-xs text-muted-foreground">({user.role === 'DESIGNER_REPRESENTATIVE' ? 'DR' : user.role.replace(/_/g, ' ')})</span>
                        </CommandItem>
                      ))}
                    </CommandList>
                    {mentionSuggestions.length === 0 && mentionQuery && (
                      <CommandEmpty>No users found matching "@{mentionQuery}"</CommandEmpty>
                    )}
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
              onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: !isRepliesExpanded }))}
              className="text-xs font-medium text-primary hover:text-primary/80 mt-2 pl-1"
            >
              {isRepliesExpanded ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
              {isRepliesExpanded ? 'Hide Replies' : `View ${currentVisibleReplies.length - MAX_INITIAL_REPLIES_TO_SHOW} more ${currentVisibleReplies.length - MAX_INITIAL_REPLIES_TO_SHOW === 1 ? 'reply' : 'replies'}`}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const publicCommentsAndRepliesCount = order.comments.reduce((acc, comment) => {
    if (!(comment.isInternal && !currentUser) && !(comment.isInternal && currentUser && !['ADMIN', 'SYSTEM_ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'].includes(currentUser.role))) {
      acc++;
      const visibleReplies = (comment.replies || []).filter(reply =>
        !(reply.isInternal && !currentUser) &&
        !(reply.isInternal && currentUser && !['ADMIN', 'SYSTEM_ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'].includes(currentUser.role))
      );
      acc += visibleReplies.length;
    }
    return acc;
  }, 0);

  const lastStatusUpdateEntry = order.statusHistory.length > 0 ? order.statusHistory[order.statusHistory.length - 1] : null;
  const lastStatusUpdateTimestamp = lastStatusUpdateEntry ? lastStatusUpdateEntry.timestamp : order.createdAt;
  const lastUpdatedBy = lastStatusUpdateEntry ? lastStatusUpdateEntry.changedByUserName : order.crmUserName;


  const orderSubtotal = Array.isArray(order.orderItems) ? order.orderItems.reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0) : 0;
  const effectiveAdvancePayment = order.advancePayment || 0;
  const amountDue = orderSubtotal - effectiveAdvancePayment;


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
          
          <div className="border border-border/30 rounded-lg p-6 shadow-sm bg-secondary/20 dark:bg-card-foreground/5">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b border-border/30">
              <div>
                <h2 className="text-3xl font-bold text-primary mb-2 flex items-center">
                  <FileText className="h-8 w-8 mr-3" /> INVOICE
                </h2>
                <p className="text-muted-foreground">Color Hut Inc.</p>
                <p className="text-muted-foreground text-sm">123 Creative Lane, Design City, DC 54321</p>
                <p className="text-muted-foreground text-sm">contact@colorhut.dev | (555) 123-4567</p>
              </div>
              <div className="text-left sm:text-right mt-4 sm:mt-0">
                <p className="text-lg font-semibold">Invoice #: <span className="text-foreground">{order.id}</span></p>
                <div className="text-sm text-muted-foreground">
                  Date: {isClient ? new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : <Skeleton className="h-4 w-32 inline-block" />}
                </div>
                 {lastStatusUpdateEntry && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Updated: {isClient ? `${lastUpdatedBy} on ${new Date(lastStatusUpdateTimestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : <Skeleton className="h-3 w-28" />}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-md font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Bill To:</h4>
              <p className="text-lg font-semibold text-foreground">{order.companyName}</p>
              <p className="text-foreground/90">{order.address}</p>
              <p className="text-foreground/90">Phone: {order.phoneNumber}</p>
            </div>
            
            {Array.isArray(order.orderItems) && order.orderItems.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-foreground flex items-start">
                   Order Items
                </h3>
                <div className="overflow-x-auto rounded-lg border border-border/30 bg-background shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Model</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Quantity</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Lamination</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Unit Price</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Line Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.orderItems.map((item, index) => (
                        <TableRow key={item.id || index} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium text-card-foreground">{item.model}</TableCell>
                          <TableCell className="text-center text-card-foreground">{item.quantity}</TableCell>
                          <TableCell className="text-card-foreground">{item.lamination}</TableCell>
                          <TableCell className="text-right text-card-foreground">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right font-semibold text-card-foreground">{formatCurrency(item.lineItemTotalPrice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-8 pt-6 border-t border-border/30">
              <div className="w-full max-w-xs sm:max-w-sm relative">
                <div className="flex justify-between mb-2">
                  <span className="text-md font-semibold text-muted-foreground">Subtotal:</span>
                  <span className="text-md font-bold text-foreground">{formatCurrency(orderSubtotal)}</span>
                </div>
                {(effectiveAdvancePayment > 0) && (
                  <div className="flex justify-between mb-2">
                    <span className="text-md text-muted-foreground">Advance Payment:</span>
                    <span className="text-md text-foreground">{formatCurrency(effectiveAdvancePayment)}</span>
                  </div>
                )}

                {orderSubtotal > 0 && amountDue <= 0 ? (
                  <div className="mt-3 pt-3 border-t border-dashed border-border/40 relative flex justify-end">
                    <div className="absolute -left-8 -top-4 sm:-left-12 sm:-top-6 transform -rotate-[15deg] border-4 border-green-500 text-green-500 font-bold uppercase text-3xl sm:text-4xl px-3 py-1 rounded-md shadow-lg bg-white/80 dark:bg-black/80 backdrop-blur-sm">
                      PAID
                    </div>
                  </div>
                ) : amountDue > 0 ? (
                  <>
                    <Separator className="my-2 bg-border/50" />
                    <div className="flex justify-between">
                      <span className="text-lg font-bold text-primary">Amount Due:</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(amountDue)}</span>
                    </div>
                  </>
                ) : null }

                 {(order.paymentMethod) && (
                  <div className={`flex justify-between mt-2 pt-2 ${ (orderSubtotal > 0 && amountDue <= 0) ? 'border-transparent' : 'border-t border-dashed border-border/40'}`}>
                    <span className="text-md text-muted-foreground">Payment Method:</span>
                    <span className="text-md text-foreground flex items-center gap-1.5">
                      <Landmark className="h-4 w-4 text-muted-foreground/80" />{order.paymentMethod}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {order.designerRepresentativeName && (
              <div className="mt-6 pt-4 border-t border-border/20 text-sm text-muted-foreground">
                <p className="flex items-center"><UserCheck className="h-4 w-4 mr-2 text-green-500" /> Assigned Designer: {order.designerRepresentativeName}</p>
              </div>
            )}
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

      {areCommentsVisible && (
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
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
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
            <form onSubmit={handleCommentSubmit} className="mt-2.5 flex items-start space-x-2.5">
              <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-primary/30 shadow-sm flex-shrink-0 mt-0.5">
                <AvatarImage src={currentUser?.avatarUrl || (clientReactorId ? CLIENT_AVATAR_URL : undefined)} alt="Your avatar" data-ai-hint={currentUser?.avatarUrl ? "user uploaded avatar" : (clientReactorId ? "client avatar" : "user initials avatar")} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{getInitials(currentUser?.name || (clientReactorId ? (order.companyName || "Client") : "U"))}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  id="comment"
                  ref={textareaRef}
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
      )}
    </main>
  );
}

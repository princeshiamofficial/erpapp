
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paperclip, Reply, Send, X, Loader2, BookText } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { useAuth } from '@/contexts/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import { parseISO } from 'date-fns';
import type { CaseStudyMessage } from '@/types';
import { getMessagesAction, addMessageAction } from '@/app/(app)/casestudy/actions';
import { Skeleton } from '../ui/skeleton';


interface CaseStudyDialogProps {
  children: React.ReactNode;
}

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};


const ChatMessage = ({ msg, isCurrentUser, onReply }: { msg: CaseStudyMessage, isCurrentUser: boolean, onReply: () => void }) => (
  <div className={`group flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
    <Avatar className="h-8 w-8 border">
      <AvatarImage src={msg.userAvatarUrl || undefined} alt={msg.userName} />
      <AvatarFallback>{getInitials(msg.userName)}</AvatarFallback>
    </Avatar>
    <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
      <div className={`relative flex items-center gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
        <div className={`max-w-xs rounded-2xl p-3 ${isCurrentUser ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
          <p className="text-sm font-semibold">{msg.userName}</p>
           {msg.replyingTo && (
             <div className="text-xs italic bg-black/10 dark:bg-white/10 p-1.5 rounded-md mt-1 mb-2 border-l-2 border-primary/50">
               <p className="font-semibold">{msg.replyingTo.name}</p>
               <p className="truncate">"{msg.replyingTo.message}"</p>
             </div>
           )}
          <p className="text-sm">{msg.message}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onReply}>
          <Reply className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      <span className="text-xs text-muted-foreground mt-1">{formatDistanceToNowStrict(parseISO(msg.timestamp), { addSuffix: true })}</span>
    </div>
  </div>
);

export function CaseStudyDialog({ children }: CaseStudyDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CaseStudyMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ name: string; message: string } | null>(null);
  const { currentUser } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<'CR' | 'DR' | 'LR'>('CR');
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);


  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';

  const fetchMessages = useCallback(async (isAutoUpdate = false) => {
    if (!isOpen) return;
    if (!isAutoUpdate) setIsLoading(true);
    try {
      const fetchedMessages = await getMessagesAction(selectedTeam);
      setMessages(fetchedMessages);
    } catch (error) {
      if (!isAutoUpdate) {
        toast({ title: "Error", description: "Could not load case study messages.", variant: "destructive" });
      }
      console.error("Failed to fetch case study messages:", error);
    } finally {
      if (!isAutoUpdate) setIsLoading(false);
    }
  }, [isOpen, selectedTeam, toast]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (isOpen) {
      const intervalId = setInterval(() => {
        fetchMessages(true);
      }, 30000); // 30 seconds

      return () => clearInterval(intervalId);
    }
  }, [isOpen, fetchMessages]);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    setIsSending(true);
    
    const result = await addMessageAction(selectedTeam, newMessage, replyingTo, currentUser);
    
    if (result.success && result.message) {
      setMessages(prev => [...prev, result.message!]);
      setNewMessage('');
      setReplyingTo(null);
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsSending(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Case Study Discussion</DialogTitle>
          <div className="flex items-center justify-between">
            <DialogDescription>
              A group chat about a recent successful project.
            </DialogDescription>
             {isAdmin && (
                <Select value={selectedTeam} onValueChange={(value) => setSelectedTeam(value as 'CR' | 'DR' | 'LR')}>
                    <SelectTrigger className="w-[150px] h-8 text-xs">
                        <SelectValue placeholder="Select Team" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="CR">CR Team</SelectItem>
                        <SelectItem value="DR">DR Team</SelectItem>
                        <SelectItem value="LR">LR Team</SelectItem>
                    </SelectContent>
                </Select>
            )}
          </div>
        </DialogHeader>
        <div className="flex flex-col h-[60vh]">
          <ScrollArea className="flex-1 p-4 pt-0" ref={scrollAreaRef}>
             {isLoading ? (
               <div className="space-y-6 pt-4">
                 {[...Array(3)].map((_, i) => (
                   <div key={i} className={`flex items-start gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex flex-col gap-1 w-2/3">
                        <Skeleton className="h-4 w-1/4"/>
                        <Skeleton className="h-10 w-full" />
                      </div>
                   </div>
                 ))}
               </div>
             ) : messages.length > 0 ? (
                <div className="space-y-6 pt-4">
                  {messages.map((msg) => (
                    <ChatMessage 
                      key={msg.id} 
                      msg={msg} 
                      isCurrentUser={msg.userId === currentUser?.id} 
                      onReply={() => setReplyingTo({ name: msg.userName, message: msg.message })} 
                    />
                  ))}
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <BookText className="h-16 w-16 opacity-30 mb-4" />
                    <p className="font-medium">No Discussions Yet</p>
                    <p className="text-sm">Be the first to start a conversation for the {selectedTeam} team.</p>
                </div>
             )}
          </ScrollArea>
          <Separator />
          <div className="p-4 bg-background">
             {replyingTo && (
              <div className="bg-muted p-2 rounded-t-lg border-b border-border/50 text-xs text-muted-foreground relative">
                <div className="flex items-center">
                  <Reply className="h-3 w-3 mr-2" />
                  <p>Replying to <span className="font-semibold text-foreground">{replyingTo.name}</span></p>
                </div>
                <p className="pl-5 truncate italic">"{replyingTo.message}"</p>
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setReplyingTo(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="relative">
              <Input 
                placeholder="Type a message..." 
                className={`pr-20 ${replyingTo ? 'rounded-t-none' : ''}`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
              />
              <div className="absolute inset-y-0 right-0 flex items-center">
                <Button variant="ghost" size="icon" disabled={isSending}>
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-primary hover:text-primary/90" onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                  {isSending ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

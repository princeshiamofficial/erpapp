
"use client";

import React, { useState } from 'react';
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
import { Paperclip, Reply, Send, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { useAuth } from '@/contexts/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface CaseStudyDialogProps {
  children: React.ReactNode;
}

const ChatMessage = ({ name, message, time, isCurrentUser, onReply }: { name: string, message: string, time: string, isCurrentUser: boolean, onReply: () => void }) => (
  <div className={`group flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
    <Avatar className="h-8 w-8 border">
      <AvatarFallback>{name.charAt(0)}</AvatarFallback>
    </Avatar>
    <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
      <div className={`relative flex items-center gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
        <div className={`max-w-xs rounded-2xl p-3 ${isCurrentUser ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
          <p className="text-sm">{message}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onReply}>
          <Reply className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      <span className="text-xs text-muted-foreground mt-1">{time}</span>
    </div>
  </div>
);

export function CaseStudyDialog({ children }: CaseStudyDialogProps) {
  const [replyingTo, setReplyingTo] = useState<{ name: string; message: string } | null>(null);
  const { currentUser } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState('all');

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';

  return (
    <Dialog>
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
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-[150px] h-8 text-xs">
                        <SelectValue placeholder="Select Team" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        <SelectItem value="CR Team">CR Team</SelectItem>
                        <SelectItem value="DR Team">DR Team</SelectItem>
                        <SelectItem value="LR Team">LR Team</SelectItem>
                    </SelectContent>
                </Select>
            )}
          </div>
        </DialogHeader>
        <div className="flex flex-col h-[60vh]">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              <ChatMessage name="Alice" message="Hey team, let's discuss the 'Vibrant Vistas' campaign." time="10:00 AM" isCurrentUser={false} onReply={() => setReplyingTo({ name: 'Alice', message: "Hey team, let's discuss the 'Vibrant Vistas' campaign." })} />
              <ChatMessage name="Bob" message="Great idea! The client was thrilled with the results. We saw a 200% increase in engagement." time="10:01 AM" isCurrentUser={false} onReply={() => setReplyingTo({ name: 'Bob', message: "Great idea! The client was thrilled with the results." })} />
              <ChatMessage name="You" message="I think the key was the A/B testing we did on the ad copy. It really helped us dial in the messaging." time="10:03 AM" isCurrentUser={true} onReply={() => setReplyingTo({ name: 'You', message: "I think the key was the A/B testing we did on the ad copy."})} />
              <ChatMessage name="Alice" message="Agreed. And the design team's visuals were stunning. They really captured the brand's new direction." time="10:04 AM" isCurrentUser={false} onReply={() => setReplyingTo({ name: 'Alice', message: "Agreed. And the design team's visuals were stunning."})} />
              <ChatMessage name="Charlie" message="I'm joining now. I have the final report here, I'll share it." time="10:05 AM" isCurrentUser={false} onReply={() => setReplyingTo({ name: 'Charlie', message: "I'm joining now. I have the final report here, I'll share it."})} />
            </div>
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
              <Input placeholder="Type a message..." className={`pr-20 ${replyingTo ? 'rounded-t-none' : ''}`} />
              <div className="absolute inset-y-0 right-0 flex items-center">
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-primary hover:text-primary/90">
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

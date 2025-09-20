
"use client";

import React from 'react';
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
import { Paperclip, Send } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';

interface CaseStudyDialogProps {
  children: React.ReactNode;
}

const ChatMessage = ({ name, message, time, isCurrentUser }: { name: string, message: string, time: string, isCurrentUser: boolean }) => (
  <div className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
    <Avatar className="h-8 w-8 border">
      <AvatarFallback>{name.charAt(0)}</AvatarFallback>
    </Avatar>
    <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-xs rounded-2xl p-3 ${isCurrentUser ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
        <p className="text-sm">{message}</p>
      </div>
      <span className="text-xs text-muted-foreground mt-1">{time}</span>
    </div>
  </div>
);

export function CaseStudyDialog({ children }: CaseStudyDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Case Study Discussion</DialogTitle>
          <DialogDescription>
            A group chat about a recent successful project.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col h-[60vh]">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              <ChatMessage name="Alice" message="Hey team, let's discuss the 'Vibrant Vistas' campaign." time="10:00 AM" isCurrentUser={false} />
              <ChatMessage name="Bob" message="Great idea! The client was thrilled with the results. We saw a 200% increase in engagement." time="10:01 AM" isCurrentUser={false} />
              <ChatMessage name="You" message="I think the key was the A/B testing we did on the ad copy. It really helped us dial in the messaging." time="10:03 AM" isCurrentUser={true} />
              <ChatMessage name="Alice" message="Agreed. And the design team's visuals were stunning. They really captured the brand's new direction." time="10:04 AM" isCurrentUser={false} />
              <ChatMessage name="Charlie" message="I'm joining now. I have the final report here, I'll share it." time="10:05 AM" isCurrentUser={false} />
            </div>
          </ScrollArea>
          <Separator />
          <div className="p-4 bg-background">
            <div className="relative">
              <Input placeholder="Type a message..." className="pr-20" />
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

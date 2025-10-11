
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetFooter
} from '@/components/ui/sheet';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Bot, Send, User as UserIcon, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';


interface AssistantSheetProps {
  children: React.ReactNode;
}

const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + (names[names.length - 1] ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

const mockMessages = [
    { sender: 'assistant', text: 'Hello! How can I assist you with your app today?' },
];

export function AssistantSheet({ children }: AssistantSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(mockMessages);
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Mock AI response
    setTimeout(() => {
      const aiResponse = { sender: 'assistant', text: `This is a mock response for: "${userMessage.text}". I am not yet connected to a live AI model.` };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0 border-t-4 border-primary">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Assistant
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
           <div className="p-4 space-y-6">
                <AnimatePresence>
                    {messages.map((msg, index) => (
                        <motion.div
                            key={index}
                            layout
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className={cn(
                                "flex items-start gap-3",
                                msg.sender === 'user' ? "justify-end" : "justify-start"
                            )}
                        >
                            {msg.sender === 'assistant' && (
                                <Avatar className="h-8 w-8 border-2 border-primary/30">
                                    <AvatarFallback className="bg-primary/10"><Bot className="h-5 w-5 text-primary"/></AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                "max-w-xs sm:max-w-md p-3 rounded-2xl",
                                msg.sender === 'user' ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
                            )}>
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            </div>
                            {msg.sender === 'user' && (
                                <Avatar className="h-8 w-8 border-2">
                                    <AvatarImage src={currentUser?.avatarUrl || undefined} />
                                    <AvatarFallback>{getInitials(currentUser?.name || 'U')}</AvatarFallback>
                                </Avatar>
                            )}
                        </motion.div>
                    ))}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-start gap-3 justify-start"
                        >
                             <Avatar className="h-8 w-8 border-2 border-primary/30">
                                <AvatarFallback className="bg-primary/10"><Bot className="h-5 w-5 text-primary"/></AvatarFallback>
                            </Avatar>
                            <div className="max-w-xs sm:max-w-md p-3 rounded-2xl bg-muted rounded-bl-none">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
           </div>
        </ScrollArea>
        <SheetFooter className="p-4 border-t bg-background">
          <form onSubmit={handleSendMessage} className="w-full flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the assistant..."
              className="flex-1 h-12 text-base rounded-full px-5"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" className="h-12 w-12 rounded-full" disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

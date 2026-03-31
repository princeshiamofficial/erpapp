
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Bot, Send, User as UserIcon, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { assistant } from '@/ai/flows/assistant-flow';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useIsMobile } from '@/hooks/use-mobile';


interface AssistantSheetProps {
  children: React.ReactNode;
}

const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + (names[names.length - 1] ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

const initialMessages = [
    { sender: 'assistant', text: 'Hello! How can I assist you with your app today? You can ask me about an order by its ID or company name.' },
];

export function AssistantSheet({ children }: AssistantSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(initialMessages as any[]);
  const [history, setHistory] = useState<any[]>([]); // New history state for OpenRouter
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser } = useAuth();
  const isMobile = useIsMobile();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await assistant({ 
        query: userMessage.text,
        history: history 
      });

      const aiResponse = { 
        sender: 'assistant', 
        text: typeof response.content === 'object' 
            ? JSON.stringify(response.content) 
            : (response.content || ""), 
        reasoning: typeof response.reasoning_details === 'object' 
            ? JSON.stringify(response.reasoning_details, null, 2) 
            : response.reasoning_details 
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setHistory(response.history); // Update with new history from server
    } catch (error) {
        console.error("Error calling assistant flow:", error);
        const errorResponse = { sender: 'assistant', text: "Sorry, I encountered an error. Please try again." };
        setMessages(prev => [...prev, errorResponse]);
    } finally {
        setIsLoading(false);
    }
  };

  const renderContent = () => (
    <div className="flex flex-col h-full bg-background/95 backdrop-blur-xl">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
           <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping h-8 w-8 -z-10" />
                    <Avatar className="h-10 w-10 border-2 border-primary shadow-lg shadow-primary/20">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary-foreground text-primary-foreground">
                            <Bot className="h-6 w-6" />
                        </AvatarFallback>
                    </Avatar>
                </div>
                <div>
                   <h2 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                        AI Assistant
                   </h2>
                   <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        Online Support
                   </div>
                </div>
           </div>
           <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/50">
                <Sparkles className="h-5 w-5 text-primary" />
           </Button>
        </div>

        <ScrollArea className="flex-1" ref={scrollAreaRef}>
           <div className="p-6 space-y-8">
                <AnimatePresence mode="popLayout" initial={false}>
                    {messages.map((msg, index) => (
                        <motion.div
                            key={index}
                            layout
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                            className={cn(
                                "flex items-end gap-3",
                                msg.sender === 'user' ? "flex-row-reverse" : "flex-row"
                            )}
                        >
                            <Avatar className={cn(
                                "h-9 w-9 border-2 ring-1 ring-white/50",
                                msg.sender === 'assistant' ? "border-primary/20" : "border-border"
                            )}>
                                {msg.sender === 'assistant' ? (
                                    <AvatarFallback className="bg-muted shadow-inner"><Bot className="h-5 w-5 text-primary"/></AvatarFallback>
                                ) : (
                                    <>
                                        <AvatarImage src={currentUser?.avatarUrl || undefined} />
                                        <AvatarFallback className="bg-primary/5">{getInitials(currentUser?.name || 'U')}</AvatarFallback>
                                    </>
                                )}
                            </Avatar>

                            <div className={cn(
                                "flex flex-col gap-1.5 max-w-[80%] sm:max-w-md",
                                msg.sender === 'user' ? "items-end" : "items-start"
                            )}>
                                {msg.reasoning && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="w-full text-[11px] text-muted-foreground/80 bg-muted/40 p-3 rounded-2xl border border-border/10 italic shadow-sm"
                                    >
                                        <div className="font-bold mb-1 flex items-center gap-1.5 text-primary/70">
                                            <div className="flex gap-0.5">
                                                <span className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                                <span className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                                <span className="h-1 w-1 rounded-full bg-primary animate-bounce" />
                                            </div>
                                            Internal Reasoning
                                        </div>
                                        <div className="line-clamp-2 hover:line-clamp-none transition-all duration-500 cursor-help">
                                            {msg.reasoning}
                                        </div>
                                    </motion.div>
                                )}
                                <div className={cn(
                                    "p-4 rounded-3xl shadow-sm prose prose-sm dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:my-2",
                                    msg.sender === 'user' 
                                        ? "bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground rounded-br-none" 
                                        : "bg-muted/80 backdrop-blur-sm rounded-bl-none border border-border/5"
                                )}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                                </div>
                                <span className="text-[9px] text-muted-foreground px-1 font-medium">
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, x: -10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            className="flex items-end gap-3"
                        >
                             <Avatar className="h-9 w-9 border-2 border-primary/20">
                                <AvatarFallback className="bg-muted shadow-inner">
                                    <Bot className="h-5 w-5 text-primary animate-pulse" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="p-4 rounded-3xl bg-muted/50 rounded-bl-none border border-border/5 shadow-inner">
                                <div className="flex gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                    <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                    <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
           </div>
        </ScrollArea>

        <div className="p-6 border-t bg-muted/30 backdrop-blur-sm">
          <form onSubmit={handleSendMessage} className="w-full relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 rounded-full blur opacity-40 group-focus-within:opacity-100 transition duration-1000 group-focus-within:duration-200" />
            <div className="relative flex items-center gap-3 bg-background border rounded-full px-5 h-14 ring-1 ring-border/5 shadow-2xl focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about Color Hut..."
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-base p-0"
                  disabled={isLoading}
                />
                <Button 
                    type="submit" 
                    size="icon" 
                    className="h-10 w-10 rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-transform" 
                    disabled={isLoading || !input.trim()}
                >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
            </div>
          </form>
          <div className="mt-3 text-center">
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em] font-bold">Powered by Color Hut AI • Arcee Trinity</p>
          </div>
        </div>
    </div>
  );

  if (isMobile) {
    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>{children}</SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0 border-t-4 border-primary">
            <SheetHeader className="sr-only">
              <SheetTitle>AI Assistant</SheetTitle>
            </SheetHeader>
            {renderContent()}
          </SheetContent>
        </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col p-0 overflow-hidden border-t-4 border-primary">
        <DialogHeader className="sr-only">
          <DialogTitle>AI Assistant</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

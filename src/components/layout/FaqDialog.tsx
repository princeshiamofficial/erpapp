
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '../ui/input';
import { Search, PlusCircle, Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/types';
import { getFaqs, type Faq } from '@/lib/faq-service';
import { addFaqAction } from '@/app/(app)/faq/actions';
import { Skeleton } from '../ui/skeleton';

interface FaqDialogProps {
  children: React.ReactNode;
}

const ALL_USER_ROLES: UserRole[] = ["CRM", "DESIGNER_REPRESENTATIVE", "LR"];

function AddFaqDialog({ isOpen, onOpenChange, onFaqAdded }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onFaqAdded: () => void }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'ALL'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      toast({ title: "Validation Error", description: "Question and Answer fields are required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const result = await addFaqAction(question, answer, selectedRole);

    if (result.success) {
      toast({ title: "Success", description: "New FAQ has been added." });
      setIsSubmitting(false);
      onFaqAdded(); // This will trigger a refetch in the parent
      onOpenChange(false);
    } else {
      toast({ title: "Error", description: result.error || "Could not add FAQ.", variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New FAQ</DialogTitle>
          <DialogDescription>
            Create a new question and answer pair. You can restrict its visibility to a specific role.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="faq-question">Question</Label>
            <Input id="faq-question" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Enter the question" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="faq-answer">Answer</Label>
            <Textarea id="faq-answer" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Provide the answer" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="faq-role">Visible To</Label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole | 'ALL')}>
              <SelectTrigger id="faq-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                 <SelectGroup>
                    <SelectItem value="ALL">All Roles</SelectItem>
                    {ALL_USER_ROLES.map(role => (
                      <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>
                    ))}
                 </SelectGroup>
              </SelectContent>
            </Select>
          </div>
           <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Adding...</> : "Add FAQ"}
              </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FaqDialog({ children }: FaqDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [allFaqs, setAllFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchFaqs = useCallback(async () => {
    setIsLoading(true);
    try {
      const faqs = await getFaqs();
      setAllFaqs(faqs);
    } catch (error) {
      toast({ title: "Error", description: "Could not load FAQs.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  // Fetch FAQs when the dialog is opened for the first time
  const handleDialogOpen = (open: boolean) => {
    if (open && allFaqs.length === 0) {
      fetchFaqs();
    }
  }


  const filteredFaqs = useMemo(() => {
    // Filter by role first
    const roleFiltered = allFaqs.filter(faq => {
      if (faq.role === 'ALL') return true;
      if (currentUser?.role && faq.role === currentUser.role) return true;
      if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN') return true; // Admins see all
      return false;
    });

    if (!searchTerm) {
      return roleFiltered;
    }
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return roleFiltered.filter(
      faq =>
        faq.question.toLowerCase().includes(lowercasedSearchTerm) ||
        faq.answer.toLowerCase().includes(lowercasedSearchTerm)
    );
  }, [searchTerm, allFaqs, currentUser]);
  
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';

  return (
    <>
      <Dialog onOpenChange={handleDialogOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 bg-gray-50 dark:bg-gray-900">
          <DialogHeader className="p-6 pb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                Dialogue
              </DialogTitle>
              <div className="flex w-full sm:w-auto items-center gap-2">
                  <div className="relative flex-grow sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                          placeholder="Search questions..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="pl-10 h-10 rounded-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      />
                  </div>
                  {isAdmin && (
                      <Button variant="outline" size="sm" className="h-10 rounded-full shrink-0" onClick={() => setIsAddDialogOpen(true)}>
                          <PlusCircle className="h-4 w-4 mr-1 sm:mr-2"/>
                          <span className="hidden sm:inline">Add New</span>
                      </Button>
                  )}
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="p-6 pt-0">
              {isLoading ? (
                 <div className="w-full space-y-3">
                   {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                 </div>
              ) : filteredFaqs.length > 0 ? (
                <Accordion type="single" collapsible className="w-full space-y-3">
                  {filteredFaqs.map((faq, index) => (
                    <AccordionItem 
                      key={faq.id} 
                      value={`item-${index}`} 
                      className="bg-white dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-200/80 dark:border-gray-700/50"
                    >
                      <AccordionTrigger className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-200 hover:no-underline [&>svg]:text-primary">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="px-6 text-gray-600 dark:text-gray-300">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <p className="font-semibold">No questions found.</p>
                  <p className="text-sm">Try adjusting your search term or check back later.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <AddFaqDialog isOpen={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onFaqAdded={fetchFaqs} />
    </>
  );
}

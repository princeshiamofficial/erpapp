
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquarePlus, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FollowUpUpdateDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (notes: string) => void;
  status: string;
  businessName: string;
}

export function FollowUpUpdateDialog({ 
  isOpen, 
  onOpenChange, 
  onConfirm,
  status,
  businessName
}: FollowUpUpdateDialogProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!notes.trim()) return;
    setIsSubmitting(true);
    await onConfirm(notes);
    setIsSubmitting(false);
    setNotes('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton 
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="sm:max-w-[480px] p-0 border-none bg-slate-50 overflow-hidden rounded-[2rem] shadow-2xl"
      >
        <div className="relative">
          {/* Decorative Header Background */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-orange-500/10 via-primary/5 to-transparent pointer-events-none" />
          
          <div className="px-8 pt-10 pb-6 relative z-10">
            <DialogHeader className="space-y-1">
              <div className="space-y-1">
                <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
                  Add Activity Update
                </DialogTitle>
                <DialogDescription className="text-[13px] text-slate-500 leading-relaxed max-w-[90%]">
                  Recording a new update for <span className="font-bold text-slate-900">{businessName}</span>. 
                  This will be added to the <span className="font-bold text-orange-600 px-1.5 py-0.5 bg-orange-50 rounded-md">{status}</span> timeline.
                </DialogDescription>
              </div>
            </DialogHeader>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="py-4 space-y-4"
            >
              <div className="group relative">
                <Textarea
                  id="update-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What happened? Describe the outcome..."
                  className="resize-none min-h-[160px] w-full bg-white border-slate-200 focus:border-orange-300 focus:ring-4 focus:ring-orange-500/5 transition-all rounded-2xl p-5 text-sm leading-relaxed shadow-sm group-hover:shadow-md"
                  required
                />
                  <div className="absolute bottom-4 right-4 pointer-events-none opacity-20 group-focus-within:opacity-40 transition-opacity">
                    <MessageSquarePlus className="h-5 w-5 text-slate-400" />
                  </div>
              </div>
            </motion.div>

            <DialogFooter className="pt-2 gap-3 sm:gap-0">
              <Button 
                variant="ghost" 
                onClick={() => onOpenChange(false)} 
                disabled={isSubmitting} 
                className="rounded-2xl font-bold text-slate-500 hover:bg-slate-200/50 h-12 px-6"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={isSubmitting || !notes.trim()}
                className="rounded-2xl font-bold h-12 px-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25 border-none transition-all active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  "Save Update"
                )}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

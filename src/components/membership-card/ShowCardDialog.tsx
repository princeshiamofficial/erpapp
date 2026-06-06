"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Card, TrackingLink } from "@/types";
import { format, parseISO } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { motion, useMotionValue, animate } from 'framer-motion';
import confetti from 'canvas-confetti';

interface ShowCardDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  card: Card | null;
  allOrders: TrackingLink[];
  showConfetti?: boolean;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), 'MM/yy');
  } catch (e) {
    return "N/A";
  }
};

export function ShowCardDialog({ isOpen, onOpenChange, card, allOrders, showConfetti = false }: ShowCardDialogProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Separate motion values for tilt (X axis) and flip (Y axis)
  const tiltX = useMotionValue(0);
  const flipY = useMotionValue(0);

  // Fire confetti when dialog opens with showConfetti flag
  useEffect(() => {
    if (isOpen && showConfetti) {
      // Reset flip state on new open
      setIsFlipped(false);
      flipY.set(0);

      // Small delay so dialog is visible first
      const t = setTimeout(() => {
        const duration = 2800;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#f59e0b', '#fbbf24', '#fde68a', '#ffffff', '#f97316'],
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#f59e0b', '#fbbf24', '#fde68a', '#ffffff', '#f97316'],
          });
          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      }, 200);

      return () => clearTimeout(t);
    }
  }, [isOpen, showConfetti]);

  // Reset flip when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIsFlipped(false);
      flipY.set(0);
    }
  }, [isOpen]);

  // Track cursor movement on card area
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const mouseY = event.clientY - rect.top - cy;
    const mouseX = event.clientX - rect.left - cx;
    tiltX.set((mouseY / cy) * -12);
  };

  // Reset tilt when mouse leaves
  const handleMouseLeave = () => {
    animate(tiltX, 0, { type: "spring", stiffness: 200, damping: 20 });
  };

  // Flip handler
  const handleFlip = () => {
    const target = isFlipped ? 0 : 180;
    animate(flipY, target, { type: "spring", stiffness: 160, damping: 22 });
    setIsFlipped(prev => !prev);
  };

  if (!card) return null;

  const cardNo = (Array.isArray(card.giftItemNames) ? card.giftItemNames : [card.giftItemName]).join(', ');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton={true} className="bg-transparent border-none shadow-none p-0 max-w-fit outline-none flex flex-col justify-center items-center gap-6">
        <DialogTitle className="sr-only">Loyalty Card Preview</DialogTitle>
        <DialogDescription className="sr-only">
          Visual representation of member card ID: {card.giftIdDisplay}
        </DialogDescription>

        {/* Card Mockup Container */}
        <div
          style={{ perspective: "1000px" }}
          className="relative w-[380px] aspect-[1.586/1]"
        >
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              rotateX: tiltX,
              rotateY: flipY,
              transformStyle: "preserve-3d",
            }}
            className="relative w-full h-full rounded-2xl text-white shadow-2xl select-none cursor-pointer"
          >
            {/* FRONT SIDE */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden border border-white/10"
              style={{
                backfaceVisibility: "hidden",
                backgroundImage: "url('/mc/font.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                transform: "translateZ(0px)",
              }}
            >
              {/* Card Number */}
              <div
                className="absolute font-card-no tracking-[0.15em] text-amber-400 font-bold select-all leading-none whitespace-nowrap"
                style={{ transform: "translateZ(50px) translateX(-50%)", top: "61%", left: "50%", fontSize: "1.29rem" }}
              >
                {cardNo || "0000 0000 0000 0000"}
              </div>
            </div>

            {/* BACK SIDE */}
            <div
              className="absolute inset-0 rounded-2xl py-6 px-6 flex flex-col justify-between overflow-hidden border border-white/10"
              style={{
                backfaceVisibility: "hidden",
                backgroundImage: "url('/mc/back.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                transform: "rotateY(180deg) translateZ(0px)",
              }}
            >
            </div>
          </motion.div>
        </div>

        {/* Flip Button Control */}
        <button
          onClick={handleFlip}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-full transition-all shadow-md active:scale-95 hover:border-slate-600"
        >
          <motion.span
            animate={{ rotate: isFlipped ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 22 }}
            className="flex items-center"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </motion.span>
          {isFlipped ? "Show Front" : "Flip Card"}
        </button>
      </DialogContent>
    </Dialog>
  );
}

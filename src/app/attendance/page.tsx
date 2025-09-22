
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Clock, Fingerprint, Home, History, Power, Lock, ArrowDown, ArrowUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

const SlideToConfirm = ({ onConfirm, status }: { onConfirm: () => void, status: 'Checked In' | 'Checked Out' }) => {
    const [unlocked, setUnlocked] = useState(false);
    const x = useMotionValue(0);
    const sliderRef = useRef<HTMLDivElement>(null);
    const [sliderWidth, setSliderWidth] = useState(0);
    const handleSize = 64; // Corresponds to h-16, w-16
    
    useEffect(() => {
        if (sliderRef.current) {
            setSliderWidth(sliderRef.current.offsetWidth);
        }
    }, [sliderRef]);

    const handleDragEnd = () => {
        if (x.get() > sliderWidth - handleSize - 20) { // A bit of tolerance
            setUnlocked(true);
            onConfirm();
            setTimeout(() => {
              x.set(0);
              setUnlocked(false);
            }, 1000);
        } else {
            x.set(0);
        }
    };
    
    const isCheckIn = status === 'Checked Out';
    const text = isCheckIn ? "Slide to Check In" : "Slide to Check Out";
    const bgColor = isCheckIn ? "bg-green-600" : "bg-red-600";
    const handleColor = isCheckIn ? "bg-green-700" : "bg-red-700";

    return (
        <div 
          ref={sliderRef}
          className={cn("relative w-full h-20 rounded-full text-white font-semibold text-lg flex items-center justify-center overflow-hidden", bgColor)}
        >
            <motion.div
                className={cn("absolute left-1 top-1 h-16 w-16 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing", handleColor)}
                style={{ x }}
                drag="x"
                dragConstraints={{ left: 0, right: sliderWidth - handleSize }}
                onDragEnd={handleDragEnd}
                dragElastic={0.1}
            >
                <Fingerprint className="h-8 w-8" />
            </motion.div>
            <AnimatePresence>
              {!unlocked && x.get() < 50 && (
                <motion.span
                    initial={{ opacity: 1, x: 0 }}
                    animate={{ opacity: 1 - (x.get() / (sliderWidth * 0.5)), x: x.get() * 0.1 }}
                    exit={{ opacity: 0 }}
                    className="select-none pointer-events-none"
                >
                    {text}
                </motion.span>
              )}
            </AnimatePresence>
        </div>
    );
};


export default function CheckInOutPage() {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<'Checked In' | 'Checked Out'>('Checked Out');
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleActionConfirm = () => {
    if (status === 'Checked Out') {
      handleCheckIn();
    } else {
      handleCheckOut();
    }
    // The slider handles its own visual state, but we close the sheet after a short delay
    setTimeout(() => setIsSheetOpen(false), 500);
  };

  const handleCheckIn = () => {
    if (status === 'Checked In') return;
    const now = new Date();
    setStatus('Checked In');
    setCheckInTime(now);
    setCheckOutTime(null); // Reset checkout time on new check-in
    toast({
      title: "Checked In Successfully",
      description: `You checked in at ${format(now, 'h:mm:ss a')}.`,
    });
  };

  const handleCheckOut = () => {
    if (status === 'Checked Out' || !checkInTime) return;
    const now = new Date();
    setStatus('Checked Out');
    setCheckOutTime(now);
    toast({
      title: "Checked Out Successfully",
      description: `You checked out at ${format(now, 'h:mm:ss a')}.`,
    });
  };

  const calculateHoursWorked = () => {
    if (checkInTime && checkOutTime) {
      const hours = differenceInHours(checkOutTime, checkInTime);
      const minutes = differenceInMinutes(checkOutTime, checkInTime) % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    if (checkInTime && status === 'Checked In') {
        const hours = differenceInHours(new Date(), checkInTime);
        const minutes = differenceInMinutes(new Date(), checkInTime) % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    return '00:00';
  };
  
  const getGreeting = useCallback(() => {
    if (!isClient) return 'Loading...';
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, [currentTime, isClient]);
  
  const name = currentUser?.name.split(' ')[0] || 'User';
  const ActionIcon = status === 'Checked Out' ? Lock : Power;

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 pb-28">
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            Hey {name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{getGreeting()}, mark your attendance.</p>
        </div>
        <Avatar className="h-12 w-12 border-2 border-primary">
          <AvatarImage src={currentUser?.avatarUrl || undefined} alt={currentUser?.name} />
          <AvatarFallback>{getInitials(currentUser?.name)}</AvatarFallback>
        </Avatar>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-grow w-full">
        <div className="text-center mb-10">
          <p className="text-5xl sm:text-6xl font-bold text-gray-800 dark:text-gray-200 font-mono tracking-tighter">
            {isClient ? format(currentTime, 'h:mm a') : '--:--'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isClient ? format(currentTime, "eeee, MMMM d, yyyy") : 'Loading...'}
          </p>
        </div>

        <motion.div
          key={status}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative"
        >
          <Button
            className={cn(
              "h-48 w-48 sm:h-56 sm:w-56 rounded-full text-2xl font-bold flex flex-col items-center justify-center transition-all duration-300 transform",
              "shadow-[inset_4px_4px_8px_rgba(255,255,255,0.4),_inset_-4px_-4px_8px_rgba(0,0,0,0.1),_8px_8px_16px_rgba(0,0,0,0.1)]",
              "hover:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3),_inset_-2px_-2px_4px_rgba(0,0,0,0.15),_4px_4px_8px_rgba(0,0,0,0.1)]",
              status === 'Checked Out' ? 'bg-white hover:bg-gray-50 text-gray-700' : 'bg-red-500 hover:bg-red-600 text-white'
            )}
            onClick={() => setIsSheetOpen(true)}
          >
            <ActionIcon className="h-20 w-20 mb-2" />
            {status === 'Checked Out' ? 'Check In' : 'Check Out'}
          </Button>
        </motion.div>
      </div>

      {/* Bottom Panel */}
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <ArrowDown className="h-3 w-3" /> Check-in
          </div>
          <p className="font-bold text-lg text-green-600">
            {checkInTime ? format(checkInTime, 'h:mm a') : '--:--'}
          </p>
        </div>
        <div className="border-l border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="h-3 w-3" /> Total Hrs
          </div>
          <p className="font-bold text-lg text-gray-800 dark:text-gray-200">
            {isClient ? calculateHoursWorked() : '--:--'}
          </p>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
             <ArrowUp className="h-3 w-3" /> Check-out
          </div>
          <p className="font-bold text-lg text-red-600">
            {checkOutTime ? format(checkOutTime, 'h:mm a') : '--:--'}
          </p>
        </div>
      </div>
      
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="w-full max-w-lg mx-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-center text-xl">Confirm Action</SheetTitle>
            <SheetDescription className="text-center">
              Slide to {status === 'Checked Out' ? 'check in' : 'check out'}.
            </SheetDescription>
          </SheetHeader>
          <div className="py-8 text-center">
            <SlideToConfirm onConfirm={handleActionConfirm} status={status} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

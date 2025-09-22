
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Clock, Fingerprint, Home, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { motion, useAnimationControls } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const LONG_PRESS_DURATION = 1000; // 1 second

export default function CheckInOutPage() {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<'Checked In' | 'Checked Out'>('Checked Out');
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  const [isPressing, setIsPressing] = useState(false);
  const progressControls = useAnimationControls();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = () => {
    if (status === 'Checked Out') {
      handleCheckIn();
    } else {
      handleCheckOut();
    }
  };
  
  const startPress = () => {
    setIsPressing(true);
    progressControls.start({
      pathLength: 1,
      transition: { duration: LONG_PRESS_DURATION / 1000, ease: "linear" }
    });
    timerRef.current = setTimeout(() => {
      handleAction();
      setIsPressing(false); // Action triggered, reset pressing state
    }, LONG_PRESS_DURATION);
  };
  
  const stopPress = () => {
    setIsPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    progressControls.start({
      pathLength: 0,
      transition: { duration: 0.2 }
    });
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
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, [currentTime]);
  
  const name = currentUser?.name.split(' ')[0] || 'User';

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 pb-28">
      {/* Header */}
      <div className="w-full max-w-md text-left">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          Hey {name}!
        </h1>
        {isClient && <p className="text-gray-600 dark:text-gray-400">{getGreeting()}, mark your attendance.</p>}
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-grow w-full">
        <div className="text-center mb-10">
          <p className="text-5xl sm:text-6xl font-bold text-gray-800 dark:text-gray-200 font-mono tracking-tighter">
            {isClient ? format(currentTime, 'h:mm:ss a') : '--:--:--'}
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
          <motion.svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <motion.circle
              cx="50"
              cy="50"
              r="48"
              stroke="#FFFFFF"
              strokeWidth="4"
              fill="transparent"
              initial={{ pathLength: 0 }}
              animate={progressControls}
            />
          </motion.svg>
          <Button
            className={cn(
              "h-48 w-48 sm:h-56 sm:w-56 rounded-full text-2xl font-bold flex flex-col items-center justify-center transition-all duration-300 transform",
              "shadow-[inset_4px_4px_8px_rgba(255,255,255,0.5),_inset_-4px_-4px_8px_rgba(0,0,0,0.1),_8px_8px_16px_rgba(0,0,0,0.2)]",
              status === 'Checked Out' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
            )}
            onMouseDown={startPress}
            onMouseUp={stopPress}
            onMouseLeave={stopPress}
            onTouchStart={startPress}
            onTouchEnd={stopPress}
          >
            <Fingerprint className="h-20 w-20 mb-2" />
            {status === 'Checked Out' ? 'Check In' : 'Check Out'}
          </Button>
        </motion.div>
      </div>

      {/* Bottom Panel */}
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Check-in</p>
          <p className="font-bold text-lg text-green-600">
            {checkInTime ? format(checkInTime, 'h:mm a') : '--:--'}
          </p>
        </div>
        <div className="border-l border-r border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Hours</p>
          <p className="font-bold text-lg text-gray-800 dark:text-gray-200">
            {isClient ? calculateHoursWorked() : '--:--'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Check-out</p>
          <p className="font-bold text-lg text-red-600">
            {checkOutTime ? format(checkOutTime, 'h:mm a') : '--:--'}
          </p>
        </div>
      </div>
    </div>
  );
}

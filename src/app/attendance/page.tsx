
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Clock, Fingerprint, Home, History, Power, Lock, ArrowDown, ArrowUp, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInHours, differenceInMinutes, parse, differenceInSeconds, parseISO, isToday } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getOfficeLocations, type CompanyLocation } from '@/lib/office-location-service';
import { getOfficeTimes, type OfficeTime } from '@/lib/office-time-service';
import { saveAttendanceAction } from '@/app/(app)/hrm/attendance/actions';
import { getAttendanceMark } from '@/lib/attendance-service';

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

const ATTENDANCE_STORAGE_KEY = 'colorHutAttendanceMark';

const SlideToConfirm = ({ onConfirm, status, disabled }: { onConfirm: () => void, status: 'Checked In' | 'Checked Out', disabled: boolean }) => {
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
        if (disabled) {
            x.set(0);
            return;
        }
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
    const bgColor = isCheckIn ? (disabled ? "bg-gray-400" : "bg-green-600") : (disabled ? "bg-gray-400" : "bg-red-600");
    const handleColor = isCheckIn ? (disabled ? "bg-gray-500" : "bg-green-700") : (disabled ? "bg-gray-500" : "bg-red-700");

    return (
        <div 
          ref={sliderRef}
          className={cn(
            "relative w-full h-20 rounded-full text-white font-semibold text-lg flex items-center justify-center overflow-hidden transition-colors", 
            bgColor
          )}
        >
            <motion.div
                className={cn("absolute left-1 top-1 h-16 w-16 rounded-full flex items-center justify-center", handleColor, disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing")}
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
                    {disabled ? (isCheckIn ? 'Check-in unavailable' : 'Check-out unavailable') : text}
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
  const [locationStatus, setLocationStatus] = useState('Requesting location...');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [officeLocations, setOfficeLocations] = useState<CompanyLocation[]>([]);
  const [officeTimes, setOfficeTimes] = useState<OfficeTime[]>([]);
  
  const canPerformAction = useMemo(() => {
    const isLocationOkForCheckIn = locationStatus === 'Inside Office Location';
    const isLocationPermissionGranted = !locationStatus.includes('denied') && !locationStatus.includes('unavailable') && !locationStatus.includes('timed out');
    
    if (status === 'Checked Out') { // Trying to check in
        return isLocationOkForCheckIn;
    }
    if (status === 'Checked In') { // Trying to check out
        return isLocationPermissionGranted;
    }
    return false;
  }, [status, locationStatus]);

  const saveStateToLocalStorage = (newState: any) => {
    if (currentUser) {
      const dataToStore = {
        userId: currentUser.id,
        date: new Date().toISOString().split('T')[0],
        ...newState,
      };
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(dataToStore));
    }
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // in metres
  }

  useEffect(() => {
    setIsClient(true);

    // 1. Try to load from localStorage first
    const storedMark = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    if (storedMark) {
        try {
            const mark = JSON.parse(storedMark);
            // Check if the stored data is for the current user and is for today
            if (mark.userId === currentUser?.id && isToday(parseISO(mark.date))) {
                setStatus(mark.status);
                if (mark.checkInTime) setCheckInTime(parseISO(mark.checkInTime));
                if (mark.checkOutTime) setCheckOutTime(parseISO(mark.checkOutTime));
            } else {
                localStorage.removeItem(ATTENDANCE_STORAGE_KEY); // Clear stale data
            }
        } catch (e) {
            console.error("Failed to parse attendance mark from localStorage", e);
            localStorage.removeItem(ATTENDANCE_STORAGE_KEY);
        }
    }
    
    // 2. Then, fetch initial data from the database
    const fetchInitialData = async () => {
      try {
        if (currentUser) {
            const mark = await getAttendanceMark(currentUser.id);
            if (mark) {
                setStatus(mark.status);
                if (mark.lastCheckInTime) setCheckInTime(parseISO(mark.lastCheckInTime));
                if (mark.lastCheckOutTime) setCheckOutTime(parseISO(mark.lastCheckOutTime));
                saveStateToLocalStorage({
                  status: mark.status,
                  checkInTime: mark.lastCheckInTime,
                  checkOutTime: mark.lastCheckOutTime,
                });
            }
        }

        const [locations, times] = await Promise.all([getOfficeLocations(), getOfficeTimes()]);
        setOfficeLocations(locations);
        setOfficeTimes(times);
        
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              setCurrentLocation({ lat: latitude, lng: longitude });
              let isInside = false;
              if (locations.length > 0) {
                for (const office of locations) {
                  const distance = getDistance(latitude, longitude, office.latitude, office.longitude);
                  if (distance <= office.radius) { isInside = true; break; }
                }
              }
              setLocationStatus(isInside ? 'Inside Office Location' : 'Outside Office Location');
            },
            (error) => {
              switch (error.code) {
                case error.PERMISSION_DENIED: setLocationStatus('Location permission denied.'); break;
                case error.POSITION_UNAVAILABLE: setLocationStatus('Location information is unavailable.'); break;
                case error.TIMEOUT: setLocationStatus('Location request timed out.'); break;
                default: setLocationStatus('An unknown error occurred.'); break;
              }
            }
          );
        } else {
          setLocationStatus('Geolocation is not supported by this browser.');
        }
      } catch (error) {
        setLocationStatus('Could not load office locations or times.');
        console.error("Failed to fetch office data:", error);
      }
    };
    fetchInitialData();
  }, [currentUser]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const handleActionConfirm = () => {
    if (status === 'Checked Out') {
      handleCheckIn();
    } else {
      handleCheckOut();
    }
    setTimeout(() => setIsSheetOpen(false), 500);
  };
  
  const handleCheckIn = async () => {
    if (!canPerformAction) {
        let errorMsg = 'Check-in is currently unavailable.';
        if (locationStatus === 'Outside Office Location') errorMsg = "You must be inside an office location to check in.";
        else if (locationStatus.includes('denied')) errorMsg = "Location permission is required to check in.";
        else if (locationStatus !== 'Inside Office Location') errorMsg = "Could not verify your location. Please ensure location services are enabled and you are at the office.";
        
        toast({ title: "Check-in Failed", description: errorMsg, variant: "destructive" });
        setIsSheetOpen(false);
        return;
    }
    if (status === 'Checked In' || !currentUser) return;

    const now = new Date();
    
    let isLate = false;
    let checkInMessage = 'You checked in on time.';
    if (officeTimes.length > 0) {
      const dayShift = officeTimes.find(t => t.shift === 'Day');
      if (dayShift) {
        const [hours, minutes] = dayShift.startTime.split(':').map(Number);
        const officeStartTime = new Date(now);
        officeStartTime.setHours(hours, minutes, 0, 0);
        const gracePeriodMinutes = dayShift.graceTime || 0;
        const graceEndTime = new Date(officeStartTime.getTime() + gracePeriodMinutes * 60000);
        if (now > graceEndTime) { isLate = true; checkInMessage = `You are late. Check-in was at ${format(now, 'h:mm:ss a')}.`; }
      }
    }

    const recordData = {
      checkInTime: now.toISOString(),
      status: isLate ? 'Late' as const : 'On Time' as const,
      location: locationStatus,
      checkInLocation: currentLocation,
    };
    const result = await saveAttendanceAction(currentUser, recordData);
    if (result.success) {
        setStatus('Checked In');
        setCheckInTime(now);
        setCheckOutTime(null);
        saveStateToLocalStorage({
          status: 'Checked In',
          checkInTime: now.toISOString(),
          checkOutTime: null,
        });
        toast({
          title: isLate ? "Checked In (Late)" : "Checked In Successfully",
          description: checkInMessage,
          variant: isLate ? "destructive" : "default",
        });
    } else {
        toast({ title: "Check-in Failed", description: result.error, variant: "destructive" });
    }
  };

  const handleCheckOut = async () => {
    if (!canPerformAction) {
        toast({ title: "Check-out Failed", description: "Location permission is required to check out.", variant: "destructive" });
        setIsSheetOpen(false);
        return;
    }
    if (status === 'Checked Out' || !checkInTime || !currentUser) return;
    const now = new Date();
    
    const workedSeconds = differenceInSeconds(now, checkInTime);
    const hours = Math.floor(workedSeconds / 3600);
    const minutes = Math.floor((workedSeconds % 3600) / 60);
    const hoursWorked = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const recordData = {
      checkInTime: checkInTime.toISOString(), // Required for document ID
      checkOutTime: now.toISOString(),
      hoursWorked: hoursWorked,
      checkOutLocation: currentLocation,
    };
    const result = await saveAttendanceAction(currentUser, recordData);
    if(result.success) {
        setStatus('Checked Out');
        setCheckOutTime(now);
        saveStateToLocalStorage({
          status: 'Checked Out',
          checkInTime: checkInTime.toISOString(),
          checkOutTime: now.toISOString(),
        });
        toast({
          title: "Checked Out Successfully",
          description: `You checked out at ${format(now, 'h:mm:ss a')}. Total hours: ${hoursWorked}.`,
        });
    } else {
        toast({ title: "Check-out Failed", description: result.error, variant: "destructive" });
    }
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {locationStatus}
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
            <SlideToConfirm onConfirm={handleActionConfirm} status={status} disabled={!canPerformAction} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

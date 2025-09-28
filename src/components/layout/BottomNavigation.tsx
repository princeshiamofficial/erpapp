
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    Home, 
    BarChart3, 
    User as UserIcon,
    History,
    Fingerprint,
    Bell,
    CalendarPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from '@/contexts/auth-context';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const navItems = [
  // Notice is now handled separately to trigger a sheet
  { href: "/attendance/history", label: "History", icon: History },
  { href: "/attendance", label: "Attendance", icon: Fingerprint, isCentral: true },
  // Leave is now handled separately to trigger a sheet
  { href: "/attendance/profile", label: "Profile", icon: UserIcon },
];

const notifications = [
    { id: 1, user: "Admin", message: "System maintenance is scheduled for tonight at 2 AM.", time: "1h ago", avatar: "https://i.pravatar.cc/150?u=admin" },
    { id: 2, user: "HR Department", message: "Reminder: Please complete your quarterly self-assessment by Friday.", time: "4h ago", avatar: "https://i.pravatar.cc/150?u=hr" },
    { id: 3, user: "Project Manager", message: "The project deadline for 'Phoenix' has been extended by two days.", time: "1d ago", avatar: "https://i.pravatar.cc/150?u=pm" },
    { id: 4, user: "IT Support", message: "A new security update has been applied. No action is required.", time: "2d ago", avatar: "https://i.pravatar.cc/150?u=it" },
    { id: 5, user: "Admin", message: "Welcome to the new attendance system!", time: "3d ago", avatar: "https://i.pravatar.cc/150?u=admin" },
];

const leaveTypes = [
  "Annual Leave",
  "Sick Leave",
  "Parental Leave",
  "Half-day Leave",
  "Medical Leave",
  "Privilege Leave",
  "Probationary Leave",
];


export function BottomNavigation() {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const { currentUser, isLoading } = useAuth();
  const [isNoticeSheetOpen, setIsNoticeSheetOpen] = useState(false);
  const [isLeaveSheetOpen, setIsLeaveSheetOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState("");


  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || isLoading) {
    // Render a static placeholder on the server to avoid hydration mismatch
    return (
      <div className="fixed bottom-0 left-0 w-full h-16 bg-background/80 md:hidden z-50"></div>
    );
  }
  
  if (!currentUser) {
      return null;
  }

  // Do not show on non-attendance pages
  if (!pathname.startsWith('/attendance')) {
    return null;
  }
  
  const noticeItem = { href: "#", label: "Notice", icon: Bell };
  const leaveItem = { href: "#", label: "Leave", icon: CalendarPlus };
  const isActive = (href: string) => pathname === href;


  return (
    <>
      <div className="fixed bottom-0 left-0 w-full h-16 bg-background/95 backdrop-blur-md border-t border-border/40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden z-50">
        <div className="flex justify-around items-center h-full max-w-md mx-auto">
            {/* Notice Button */}
            <Button
                variant="ghost"
                onClick={() => setIsNoticeSheetOpen(true)}
                className="relative flex flex-col items-center justify-center w-14 h-14 text-muted-foreground transition-colors p-0 hover:bg-transparent hover:text-primary/80"
                aria-label={noticeItem.label}
            >
                <noticeItem.icon className="h-6 w-6 mb-0.5" />
                <span className="text-xs font-medium">{noticeItem.label}</span>
            </Button>

            {/* Other Nav Items */}
            {navItems.map((item) => {
            const active = isActive(item.href);
            if (item.isCentral) {
                return (
                <div key={item.href} className="relative w-16 h-16">
                    <Link
                    href={item.href}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 transform hover:scale-110 transition-transform"
                    aria-label={item.label}
                    >
                    <item.icon className="h-7 w-7" />
                    </Link>
                </div>
                );
            }
            return (
                <Link
                key={item.href}
                href={item.href}
                className={cn(
                    "relative flex flex-col items-center justify-center w-14 h-14 text-muted-foreground transition-colors",
                    active ? "text-primary" : "hover:text-primary/80"
                )}
                aria-label={item.label}
                >
                <AnimatePresence>
                    {active && (
                    <motion.div
                        layoutId="active-nav-indicator"
                        className="absolute inset-x-0 bottom-0 h-1 bg-primary rounded-t-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                    )}
                </AnimatePresence>
                <item.icon className="h-6 w-6 mb-0.5" />
                <span className="text-xs font-medium">{item.label}</span>
                </Link>
            );
            })}
             {/* Leave Button */}
            <Button
                variant="ghost"
                onClick={() => setIsLeaveSheetOpen(true)}
                className="relative flex flex-col items-center justify-center w-14 h-14 text-muted-foreground transition-colors p-0 hover:bg-transparent hover:text-primary/80"
                aria-label={leaveItem.label}
            >
                <leaveItem.icon className="h-6 w-6 mb-0.5" />
                <span className="text-xs font-medium">{leaveItem.label}</span>
            </Button>
        </div>
      </div>
      
       <Sheet open={isNoticeSheetOpen} onOpenChange={setIsNoticeSheetOpen}>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl flex flex-col">
            <SheetHeader className="text-left px-2">
              <SheetTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary"/>Notifications</SheetTitle>
              <SheetDescription>Recent updates and announcements.</SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-4 py-4">
                    {notifications.map(notif => (
                        <div key={notif.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50">
                             <Avatar className="h-9 w-9 border">
                                <AvatarImage src={notif.avatar} alt={notif.user}/>
                                <AvatarFallback>{notif.user.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="text-sm font-medium">{notif.user}</p>
                                <p className="text-sm text-muted-foreground">{notif.message}</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">{notif.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
          </SheetContent>
      </Sheet>
      
      <Sheet open={isLeaveSheetOpen} onOpenChange={setIsLeaveSheetOpen}>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl flex flex-col">
            <SheetHeader className="text-left px-2">
              <SheetTitle className="flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-primary"/>Leave Request</SheetTitle>
              <SheetDescription>Submit a new leave request for approval.</SheetDescription>
            </SheetHeader>
            <form className="flex-1 flex flex-col pt-4">
                <div className="space-y-4 flex-1 px-2">
                    <div className="space-y-1">
                        <Label htmlFor="leave-type">Leave Type</Label>
                        <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
                            <SelectTrigger id="leave-type">
                                <SelectValue placeholder="Select a leave type" />
                            </SelectTrigger>
                            <SelectContent>
                                {leaveTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="start-date">Start Date</Label>
                            <Input id="start-date" type="date" />
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="end-date">End Date</Label>
                            <Input id="end-date" type="date" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea id="reason" placeholder="Please provide a brief reason for your leave..." className="min-h-[100px]" />
                    </div>
                </div>
                <SheetFooter className="p-4 mt-auto">
                    <Button type="submit" className="w-full">Submit Request</Button>
                </SheetFooter>
            </form>
          </SheetContent>
      </Sheet>
    </>
  );
}

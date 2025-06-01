
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { initializeFCM, requestNotificationPermission } from '@/lib/notification-utils';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function NotificationBell() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const setupFCM = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      await initializeFCM();
    }
  }, []);

  useEffect(() => {
    if (permission === 'granted') {
      setupFCM();
    }
  }, [permission, setupFCM]);

  const handleBellClick = async () => {
    if (!isClient) return;

    if (permission === 'granted') {
      toast({ title: "Notifications Active", description: "You are set to receive notifications." });
      // Optionally, re-run initializeFCM if needed, e.g., to refresh token or re-attach listeners
      // await initializeFCM(); 
    } else if (permission === 'denied') {
      toast({
        title: "Notifications Blocked",
        description: "Please enable notifications in your browser settings to receive updates.",
        variant: "destructive",
        duration: 7000,
      });
    } else { // 'default' or null
      const newPermission = await requestNotificationPermission();
      if (newPermission) {
        setPermission(newPermission);
        if (newPermission === 'granted') {
            await setupFCM(); // Initialize FCM after permission is granted
        }
      }
    }
  };

  if (!isClient) {
    return (
      <Button variant="ghost" size="icon" className="text-muted-foreground h-10 w-10" disabled>
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  const getIconAndTooltip = () => {
    switch (permission) {
      case 'granted':
        return { icon: <BellRing className="h-5 w-5 text-primary animate-pulse" />, tooltip: "Notifications Enabled" };
      case 'denied':
        return { icon: <BellOff className="h-5 w-5 text-destructive" />, tooltip: "Notifications Blocked (Click to see instructions)" };
      default:
        return { icon: <Bell className="h-5 w-5" />, tooltip: "Enable Notifications" };
    }
  };

  const { icon, tooltip } = getIconAndTooltip();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={handleBellClick} className="text-foreground hover:bg-accent hover:text-accent-foreground h-10 w-10">
            {icon}
            <span className="sr-only">{tooltip}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-primary text-primary-foreground text-xs">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { initializeFCM, requestNotificationPermission } from '@/lib/notification-utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context'; 
import { storeUserFCMTokenAction } from '@/app/(app)/users/actions'; 
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
  const { currentUser } = useAuth(); 

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const setupFCMAndStoreToken = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const token = await initializeFCM(); // This function now only returns token or null
      if (token && currentUser?.id) {
        console.log(`[NotificationBell] FCM token ${token} obtained for user ${currentUser.id}. Storing...`);
        const result = await storeUserFCMTokenAction(currentUser.id, token);
        if (result.success) {
          console.log("[NotificationBell] FCM token stored successfully.");
          // No toast here to avoid being too noisy on every load if permission is granted
        } else {
          toast({ title: "Token Storage Failed", description: result.error || "Could not store FCM token.", variant: "destructive" });
        }
      } else if (token) {
         console.log(`[NotificationBell] FCM token ${token} obtained, but no current user to associate with.`);
      }
      // If token is null, initializeFCM already showed a toast.
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (permission === 'granted') {
      setupFCMAndStoreToken();
    }
  }, [permission, setupFCMAndStoreToken]);

  const handleBellClick = async () => {
    if (!isClient) return;

    if (permission === 'granted') {
      console.log("[NotificationBell] Clicked, permission already granted. Re-running FCM setup to ensure token freshness and storage.");
      toast({ title: "Notifications Active", description: "Push notifications are enabled for your account.", duration: 3000});
      await setupFCMAndStoreToken(); 
    } else if (permission === 'denied') {
      toast({
        title: "Notifications Blocked",
        description: "Please enable notifications in your browser settings to receive updates.",
        variant: "destructive",
        duration: 7000,
      });
      if (currentUser?.id) {
        await storeUserFCMTokenAction(currentUser.id, null); // Clear token if previously granted then denied
      }
    } else { // 'default' or null
      const newPermission = await requestNotificationPermission(); // This shows toasts based on outcome
      if (newPermission) {
        setPermission(newPermission); // Update local state
        if (newPermission === 'granted') {
            await setupFCMAndStoreToken(); 
        } else if (newPermission === 'denied' && currentUser?.id) {
            await storeUserFCMTokenAction(currentUser.id, null); 
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
        return { icon: <BellOff className="h-5 w-5 text-destructive" />, tooltip: "Notifications Blocked (Click for info)" };
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

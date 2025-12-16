
"use client";

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase'; 
import { toast } from '@/hooks/use-toast';
import { storeUserFCMTokenAction } from '@/app/(app)/users/actions'; 
import { getGlobalSettings } from './settings-service';

export async function sendTelegramMessage(message: string): Promise<boolean> {
  try {
    const settings = await getGlobalSettings();
    const token = settings.telegramBotToken;
    const chatIds = settings.telegramChatIds;

    if (!token || !chatIds || chatIds.length === 0) {
      console.warn("Telegram settings (bot token or chat IDs) are not configured. Skipping notification.");
      return false;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    
    let allSuccessful = true;
    for (const chatId of chatIds) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
          }),
        });

        const responseData = await response.json();
        if (responseData.ok) {
          console.log(`Telegram message sent successfully to chat ID: ${chatId}.`);
        } else {
          allSuccessful = false;
          console.error(`Failed to send Telegram message to chat ID: ${chatId}:`, responseData.description);
        }
      } catch (error) {
        allSuccessful = false;
        console.error(`Error sending Telegram message to chat ID: ${chatId}:`, error);
      }
    }
    return allSuccessful;
  } catch (error) {
    console.error("Error sending Telegram messages:", error);
    return false;
  }
}

export const requestNotificationPermission = async (): Promise<NotificationPermission | null> => {
  console.log("[NotificationUtils] requestNotificationPermission called");
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn("[NotificationUtils] Notifications not supported by this browser.");
    toast({ title: "Notifications Not Supported", description: "This browser does not support desktop notifications.", variant: "destructive" });
    return null;
  }
  try {
    console.log("[NotificationUtils] Requesting permission via Notification.requestPermission()...");
    const permission = await Notification.requestPermission();
    console.log("[NotificationUtils] Permission result -", permission);
    if (permission === 'granted') {
      toast({ title: "Notifications Enabled!", description: "You will now receive updates." });
    } else if (permission === 'denied') {
      toast({ title: "Notifications Blocked", description: "Please enable notifications in browser settings if you wish to receive them.", variant: "destructive", duration: 7000 });
    } else {
      toast({ title: "Notifications Dismissed", description: "You can enable notifications later if you change your mind." });
    }
    return permission;
  } catch (error) {
    console.error('[NotificationUtils] Error requesting notification permission:', error);
    toast({ title: "Permission Error", description: "Could not request notification permission.", variant: "destructive" });
    return null;
  }
};

export const initializeFCM = async (): Promise<string | null> => {
  console.log("[NotificationUtils] initializeFCM called");
  const isSupportedClient = typeof window !== 'undefined' && (await isSupported());
  if (!isSupportedClient) {
      console.log("[NotificationUtils] Firebase Messaging not supported in this browser environment.");
      return null;
  }
  
  const fcmMessaging = getMessaging(app);
  console.log("[NotificationUtils] Firebase Messaging instance obtained.");

  try {
    const permission = Notification.permission;
    if (permission !== 'granted') {
      console.log('[NotificationUtils] Notification permission not granted yet. Token cannot be retrieved.');
      return null;
    }
    console.log("[NotificationUtils] Notification permission is granted.");
    
    // Unregister all existing service workers to prevent conflicts
    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
            console.log(`[NotificationUtils] Unregistering ${registrations.length} existing service worker(s)...`);
            for (const registration of registrations) {
                await registration.unregister();
                console.log(`[NotificationUtils] Unregistered service worker with scope: ${registration.scope}`);
            }
        }
    }


    console.log("[NotificationUtils] Registering new service worker: /firebase-messaging-sw.js with scope: /");
    const swRegistration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" }
    );
    console.log("[NotificationUtils] Service worker registered. SW Registration object:", swRegistration);
    
    const vapidKey = "BGt_M4sREAGV_a2B0vSj2dftZ2F8hDm4i0qJ1D4eR8c_4Xz6jF0vYQ0w-aJzG4pB5jN4oR3z-Z9X_y0v-Y2Z_0E"; 
    if (!vapidKey) {
        console.error("[NotificationUtils] VAPID key is missing.");
        toast({ title: "Configuration Error", description: "VAPID key for push notifications is not set.", variant: "destructive" });
        return null;
    }

    console.log("[NotificationUtils] Attempting to get FCM token using active SW registration and VAPID key.");

    const currentToken = await getToken(fcmMessaging, {
      serviceWorkerRegistration: swRegistration,
      vapidKey: vapidKey, 
    });

    if (currentToken) {
      console.log('[NotificationUtils] >>> FCM TOKEN ACQUIRED:', currentToken);
    } else {
      console.warn('[NotificationUtils] No registration token available. Check VAPID key, SW console for errors.');
      // This part is now commented out to hide the toast
      // toast({ title: "Token Error", description: "Could not get notification token. Check console.", variant: "destructive", duration: 10000 });
      return null;
    }

    onMessage(fcmMessaging, (payload) => {
      console.log('[NotificationUtils] === Foreground message received ===', payload);
      
      const { title, body, icon, badge } = payload.notification || {};
      const { click_action, ...data } = payload.data || {};
      
      const notificationTitle = title || "Color Hut Message";
      const notificationOptions: NotificationOptions = {
        body: body || "You have a new update.",
        icon: icon || '/icons/icon-192x192.png',
        badge: badge || '/icons/icon-72x72.png',
        data: { click_action: click_action || window.location.origin, ...data },
      };
      
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(notificationTitle, notificationOptions);
      });

      toast({
        title: `Update: ${notificationTitle}`,
        description: body,
        duration: 10000,
      });
    });

    return currentToken;

  } catch (error: any) {
    console.error('[NotificationUtils] FATAL Error during FCM Initialization:', error);
    let description = "Could not set up push notifications. Check console for detailed error.";
     if (error.code === 'messaging/failed-service-worker-registration' || error.message?.includes('ServiceWorker')) {
        description = "Service Worker registration failed. Please check the console for errors in firebase-messaging-sw.js.";
    } else if (error.code === 'messaging/invalid-vapid-key') {
        description = "Invalid VAPID Key provided. Please check your environment variables.";
    } else if (error.name === 'AbortError') {
        description = "Push service registration was aborted. This can happen if the browser is not HTTPS, in incognito, or due to a service worker conflict."
    }
    // This part is now commented out to hide the toast
    // toast({ title: "Notification Setup Failed", description, variant: "destructive", duration: 15000 });
    return null;
  }
};

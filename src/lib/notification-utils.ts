
"use client";

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase'; 
import { toast } from '@/hooks/use-toast';

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
  if (typeof window === 'undefined') {
    console.log("[NotificationUtils] Cannot initialize FCM in non-browser environment.");
    return null;
  }

  const messagingSupported = await isSupported();
  if (!messagingSupported) {
    console.log("[NotificationUtils] Firebase Messaging not supported in this browser.");
    toast({ title: "Notifications Not Supported", description: "Push notifications are not supported by your browser.", variant: "destructive" });
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

    console.log("[NotificationUtils] Attempting to register service worker: /firebase-messaging-sw.js with scope: /");
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    console.log("[NotificationUtils] Service worker registration attempt complete. SW Registration object:", swRegistration);
    
    console.log("[NotificationUtils] Waiting for service worker to become active using navigator.serviceWorker.ready...");
    const activeSwRegistration = await navigator.serviceWorker.ready; 
    console.log("[NotificationUtils] Service worker is active and ready. Active SW Registration:", activeSwRegistration);
    
    const VAPID_KEY = "BCEAg-Aq5Kb_qJ_9VQNYrMJ2uLC1Aht5gsqfSjfnYkIVjCLAD6Y-HwALizBLvoPT--UApnUeSmr8K1Qc5BcIvrs";
    console.log("[NotificationUtils] Attempting to get FCM token using active SW registration and VAPID key:", VAPID_KEY);

    const currentToken = await getToken(fcmMessaging, {
      serviceWorkerRegistration: activeSwRegistration,
      vapidKey: VAPID_KEY, 
    });

    if (currentToken) {
      console.log('[NotificationUtils] >>> FCM TOKEN ACQUIRED (USE THIS FOR TESTING):', currentToken);
      // Toast for successful token acquisition is now handled in NotificationBell
      // toast({ title: "Notifications Active", description: "Ready to receive push notifications." });
    } else {
      console.warn('[NotificationUtils] No registration token available. Check VAPID key in Firebase project and SW console for errors.');
      toast({ title: "Token Error", description: "Could not get notification token. Ensure VAPID key is correct and SW is active. Check console.", variant: "destructive", duration: 10000 });
      return null;
    }

    // Foreground message listener
    onMessage(fcmMessaging, (payload) => {
      console.log('[NotificationUtils] === Foreground message received ===. Full payload:', JSON.stringify(payload, null, 2));
      
      const notificationData = payload.notification || {};
      const customData = payload.data || {};

      const notificationTitle = notificationData.title || customData.title || "New Color Hut Message";
      const notificationBody = notificationData.body || customData.body || "You have a new update.";
      
      let notificationIcon = customData.iconUrl || notificationData.icon || customData.icon;
      if (notificationIcon && !notificationIcon.startsWith('http') && !notificationIcon.startsWith('/')) {
        notificationIcon = window.location.origin + (notificationIcon.startsWith('.') ? notificationIcon.substring(1) : '/' + notificationIcon);
      } else if (!notificationIcon) {
        notificationIcon = window.location.origin + '/icons/icon-192x192.png'; // Default main icon
      }
      
      const notificationBadge = customData.badgeUrl || customData.badge || window.location.origin + '/icons/icon-72x72.png'; // Default badge icon
      const notificationSound = customData.soundUrl || customData.sound || 'https://audio-previews.elements.envatousercontent.com/files/393057177/preview.mp3';
      
      const clickAction = customData.click_action || customData.targetUrl || notificationData.click_action || window.location.origin;

      const notificationOptions: NotificationOptions = {
        body: notificationBody,
        icon: notificationIcon,
        badge: notificationBadge,
        data: { click_action: clickAction, ...customData },
        tag: notificationData.tag || customData.tag || payload.messageId || 'colorhut-fg-notif-' + Date.now(),
      };
      console.log("[NotificationUtils] Foreground notification options prepared:", JSON.stringify(notificationOptions, null, 2));
      
      if (notificationSound) {
          try {
            const audio = new Audio(notificationSound as string);
            audio.play().catch(e => console.warn("[NotificationUtils] Foreground notification sound playback failed:", e));
          } catch (e) {
            console.error("[NotificationUtils] Error playing foreground notification sound:", e);
          }
      }
      
      navigator.serviceWorker.ready.then(registration => {
        console.log("[NotificationUtils] Attempting to show foreground notification via SW registration's showNotification method with options:", JSON.stringify(notificationOptions));
        registration.showNotification(notificationTitle, notificationOptions)
         .then(() => console.log("[NotificationUtils] Foreground notification shown via SW registration successfully."))
         .catch(err => {
            console.error("[NotificationUtils] Error showing foreground notification via SW registration:", err);
            toast({ title: "Notification Display Error", description: `FG (SW Show): ${err.message}`, variant: "destructive" });
         });
      }).catch(err => {
        console.error("[NotificationUtils] Error getting SW registration for foreground notification display:", err);
        toast({ title: "SW Reg Error", description: `FG (SW Ready): ${err.message}`, variant: "destructive" });
      });

      toast({
        title: `FG: ${notificationTitle}`,
        description: notificationBody,
        duration: 10000,
      });
    });
    return currentToken; // Return the token

  } catch (error: any) {
    console.error('[NotificationUtils] FATAL Error during FCM Initialization:', error);
    let description = "Could not set up push notifications. Check console for detailed error.";
    if (error.name === 'InvalidStateError' && error.message.includes('PushManager')) {
        description = "PushManager Invalid State: Possible inactive Service Worker or VAPID key issue. Ensure provided VAPID key is correct for this Firebase project.";
    } else if (error.code === 'messaging/failed-service-worker-registration' || (error.message && (error.message.includes('ServiceWorker script evaluation failed') || error.message.includes("Failed to register a ServiceWorker")) ) ) {
        description = "Service Worker Reg/Eval Failed: '/firebase-messaging-sw.js' might be inaccessible, have JS errors, or incorrect Firebase config inside it. Check SW console.";
    } else if (error.code === 'messaging/invalid-vapid-key' || (error.message && (error.message.toLowerCase().includes('applicationserverkey') || error.message.toLowerCase().includes('vapid key')))) {
        description = "Invalid VAPID Key: The VAPID key used is incorrect or not recognized by the push service. Verify key in Firebase Console and the one provided.";
    } else if (error.code === 'messaging/sw-registration-expected' || (error.message && error.message.includes("No active Service Worker")) || error.message.includes("Subscription failed - no active Service Worker")) {
        description = "No Active Service Worker: SW registration might have failed or it's not active and ready for push subscriptions. Check SW console.";
    } else if (error.code === 'messaging/permission-default') {
        description = "Notification Permission Default: Click the bell icon to grant permission.";
    } else if (error.code === 'messaging/permission-denied') {
        description = "Notification Permission Denied: Enable notifications in browser settings for this site.";
    } else if (error.message) {
        description = `Error: ${error.message} (Code: ${error.code || 'N/A'})`;
    }
    toast({ title: "FCM Setup Error", description: description, variant: "destructive", duration: 25000 });
    return null; // Return null on error
  }
};


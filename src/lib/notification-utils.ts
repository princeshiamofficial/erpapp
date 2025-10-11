
"use client";

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase'; 
import { toast } from '@/hooks/use-toast';
import { storeUserFCMTokenAction } from '@/app/(app)/users/actions';

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
    // No toast here, as NotificationBell might call this and want to handle it
    return null;
  }
  
  const fcmMessaging = getMessaging(app);
  console.log("[NotificationUtils] Firebase Messaging instance obtained.");

  try {
    const permission = Notification.permission;
    if (permission !== 'granted') {
      console.log('[NotificationUtils] Notification permission not granted yet. Token cannot be retrieved.');
      // No toast here, requestNotificationPermission handles this feedback.
      return null;
    }
    console.log("[NotificationUtils] Notification permission is granted.");

    console.log("[NotificationUtils] Attempting to register service worker: /firebase-messaging-sw.js with scope: /");
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    console.log("[NotificationUtils] Service worker registration attempt complete. SW Registration object:", swRegistration);
    
    console.log("[NotificationUtils] Waiting for service worker to become active using navigator.serviceWorker.ready...");
    const activeSwRegistration = await navigator.serviceWorker.ready; 
    console.log("[NotificationUtils] Service worker is active and ready. Active SW Registration:", activeSwRegistration);
    
    const VAPID_KEY = "BMLD4tBKrzeVD7gh99dJGpWPDmcUPEuc23879zSSPVkG_swfL7M00xw-agMVnZdFqU8HhzFkApNdbUOPRyYsLDc";
    console.log("[NotificationUtils] Attempting to get FCM token using active SW registration and VAPID key.");

    const currentToken = await getToken(fcmMessaging, {
      serviceWorkerRegistration: activeSwRegistration,
      vapidKey: VAPID_KEY, 
    });

    if (currentToken) {
      console.log('[NotificationUtils] >>> FCM TOKEN ACQUIRED (USE THIS FOR TESTING):', currentToken);
      // No toast here for successful token acquisition as it's a common operation
    } else {
      console.warn('[NotificationUtils] No registration token available. Check VAPID key in Firebase project and SW console for errors. Ensure SW is active.');
      // toast({ title: "Notification Token Error", description: "Could not get notification token. Check VAPID key & SW. See console for details.", variant: "destructive", duration: 10000 });
      return null;
    }

    // Foreground message listener
    onMessage(fcmMessaging, (payload) => {
      console.log('[NotificationUtils] === Foreground message received ===. Raw payload:', JSON.stringify(payload, null, 2));
      
      const notificationData = payload.data || {}; 
      const fcmNotification = payload.notification || {};

      const notificationTitle = notificationData.title || fcmNotification.title || "Color Hut Message";
      const notificationBody = notificationData.body || fcmNotification.body || "You have a new update.";
      
      let notificationIcon = notificationData.iconUrl || notificationData.icon || fcmNotification.icon || '/icons/icon-192x192.png';
      if (notificationIcon && !notificationIcon.startsWith('http') && !notificationIcon.startsWith('/')) {
          notificationIcon = window.location.origin + (notificationIcon.startsWith('.') ? notificationIcon.substring(1) : '/' + notificationIcon);
      } else if (notificationIcon && !notificationIcon.startsWith('http')) {
          notificationIcon = window.location.origin + notificationIcon;
      }

      let notificationBadge = notificationData.badgeUrl || notificationData.badge || '/icons/icon-72x72.png';
      if (notificationBadge && !notificationBadge.startsWith('http') && !notificationBadge.startsWith('/')) {
          notificationBadge = window.location.origin + (notificationBadge.startsWith('.') ? notificationBadge.substring(1) : '/' + notificationBadge);
      } else if (notificationBadge && !notificationBadge.startsWith('http')) {
          notificationBadge = window.location.origin + notificationBadge;
      }
      
      const clickAction = notificationData.click_action || notificationData.targetUrl || fcmNotification.click_action || window.location.origin;
      
      const notificationOptions: NotificationOptions = {
        body: notificationBody,
        icon: notificationIcon,
        badge: notificationBadge,
        data: { 
          click_action: clickAction,
          ...notificationData
        },
        tag: notificationData.tag || fcmNotification.tag || payload.messageId || 'colorhut-fg-notif-' + Date.now(),
        renotify: true, 
        requireInteraction: true, 
      };
      
      const customSoundUrl = notificationData.customSoundUrl;
      if (customSoundUrl) {
          console.log("[NotificationUtils] Custom sound URL found in foreground data payload:", customSoundUrl);
          try {
            const audio = new Audio(customSoundUrl as string);
            audio.play().catch(e => console.warn("[NotificationUtils] Foreground custom sound playback failed:", e));
          } catch (e) {
            console.error("[NotificationUtils] Error playing foreground custom sound:", e);
          }
      } else {
        console.log("[NotificationUtils] No customSoundUrl in foreground data. Browser default sound may apply if notification is shown.");
      }
      
      console.log("[NotificationUtils] Foreground notification options prepared (after custom sound handling):", JSON.stringify(notificationOptions, null, 2));
      
      navigator.serviceWorker.ready.then(registration => {
        console.log("[NotificationUtils] Attempting to show foreground notification via SW registration's showNotification method with options:", JSON.stringify(notificationOptions));
        registration.showNotification(notificationTitle, notificationOptions)
         .then(() => console.log("[NotificationUtils] Foreground notification shown via SW registration successfully."))
         .catch(err => {
            console.error("[NotificationUtils] Error showing foreground notification via SW registration:", err);
            toast({ title: "Notif Display Error", description: `FG (SW Show): ${''+err.message}`, variant: "destructive" });
         });
      }).catch(err => {
        console.error("[NotificationUtils] Error getting SW registration for foreground notification display:", err);
        toast({ title: "SW Reg Error", description: `FG (SW Ready): ${''+err.message}`, variant: "destructive" });
      });

      // This toast is for app-level feedback, separate from the actual system notification.
      toast({
        title: `FG Update: ${notificationTitle}`,
        description: notificationBody,
        duration: 10000,
      });
    });
    return currentToken;

  } catch (error: any) {
    console.error('[NotificationUtils] FATAL Error during FCM Initialization:', error);
    let description = "Could not set up push notifications. Check console for detailed error.";
    if (error.name === 'InvalidStateError' && error.message.includes('PushManager')) {
        description = `PushManager Invalid State: Possible inactive SW or VAPID key. Ensure provided VAPID key is correct. Error: ${error.message}`;
    } else if (error.code === 'messaging/failed-service-worker-registration' || (error.message && (error.message.includes('ServiceWorker script evaluation failed') || error.message.includes("Failed to register a ServiceWorker")) ) ) {
        description = "Service Worker Reg/Eval Failed: '/firebase-messaging-sw.js' issue. Check SW console & config.";
    } else if (error.code === 'messaging/invalid-vapid-key' || (error.message && (error.message.toLowerCase().includes('applicationserverkey') || error.message.toLowerCase().includes('vapid key')))) {
        description = "Invalid VAPID Key: Verify key in Firebase Console and used in code.";
    } else if (error.code === 'messaging/sw-registration-expected' || (error.message && error.message.includes("No active Service Worker")) || error.message.includes("Subscription failed - no active Service Worker")) {
        description = "No Active SW: SW registration might have failed or it's not active. Check SW console.";
    } else if (error.code === 'messaging/permission-default') {
        description = "Notification Permission Default: Click the bell icon to grant permission.";
    } else if (error.code === 'messaging/permission-denied') {
        description = "Notification Permission Denied: Enable notifications in browser settings for this site.";
    } else if (error.message) {
        description = `Error: ${error.message} (Code: ${error.code || 'N/A'})`;
    }
    // We cannot use the useToast hook here. The caller should handle displaying this error.
    console.error("FCM Setup Error:", description);
    return null;
  }
};

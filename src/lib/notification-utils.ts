
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

export const initializeFCM = async () => {
  console.log("[NotificationUtils] initializeFCM called");
  if (typeof window === 'undefined') {
    console.log("[NotificationUtils] Cannot run in non-browser environment.");
    return;
  }

  const messagingSupported = await isSupported();
  if (!messagingSupported) {
    console.log("[NotificationUtils] Firebase Messaging not supported in this browser.");
    toast({ title: "Notifications Not Supported", description: "Push notifications are not supported by your browser.", variant: "destructive" });
    return;
  }

  const fcmMessaging = getMessaging(app);
  console.log("[NotificationUtils] Firebase Messaging instance obtained.");

  try {
    const permission = Notification.permission;
    if (permission !== 'granted') {
      console.log('[NotificationUtils] Notification permission not granted yet. User needs to grant permission.');
      return;
    }
    console.log("[NotificationUtils] Notification permission is granted.");

    console.log("[NotificationUtils] Attempting to register service worker: /firebase-messaging-sw.js with scope: /");
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    console.log("[NotificationUtils] Service worker registration attempt complete. SW Registration object:", swRegistration);

    console.log("[NotificationUtils] Waiting for service worker to become active using navigator.serviceWorker.ready...");
    const activeSwRegistration = await navigator.serviceWorker.ready; 
    console.log("[NotificationUtils] Service worker is active and ready. Active SW Registration:", activeSwRegistration);
    
    console.log("[NotificationUtils] Attempting to get FCM token using active SW registration.");
    // VAPID key should be automatically handled by Firebase if project is configured.
    const currentToken = await getToken(fcmMessaging, {
      serviceWorkerRegistration: activeSwRegistration,
    });

    if (currentToken) {
      console.log('[NotificationUtils] FCM Token acquired:', currentToken);
      // TODO: Send this token to your app server and store it.
    } else {
      console.warn('[NotificationUtils] No registration token available. This can happen if permission was denied at a higher level or VAPID key/project config issues.');
    }

    onMessage(fcmMessaging, (payload) => {
      console.log('[NotificationUtils] Foreground message received. Full payload:', JSON.stringify(payload, null, 2));
      
      const notificationTitle = payload.notification?.title || "New Color Hut Message";
      const notificationBody = payload.notification?.body || "You have a new update.";
      
      let notificationIcon = payload.notification?.icon;
      if (notificationIcon && !notificationIcon.startsWith('http') && !notificationIcon.startsWith('/')) {
        notificationIcon = window.location.origin + (notificationIcon.startsWith('.') ? notificationIcon.substring(1) : '/' + notificationIcon);
      } else if (!notificationIcon) {
        notificationIcon = window.location.origin + '/icons/icon-192x192.png'; // Default icon
      }
      
      const notificationBadge = window.location.origin + '/icons/icon-72x72.png'; // Default badge for system tray

      const clickAction = payload.data?.click_action || payload.data?.targetUrl || window.location.origin;

      const notificationOptions: NotificationOptions = {
        body: notificationBody,
        icon: notificationIcon,
        badge: notificationBadge,
        sound: payload.data?.soundUrl || 'https://audio-previews.elements.envatousercontent.com/files/393057177/preview.mp3',
        data: {
           click_action: clickAction,
          ...(payload.data || {})
        },
        tag: payload.notification?.tag || payload.messageId || 'colorhut-fg-notification-' + Date.now(),
      };
      console.log("[NotificationUtils] Foreground notification options prepared:", JSON.stringify(notificationOptions));
      
      if (notificationOptions.sound) {
          try {
            const audio = new Audio(notificationOptions.sound as string);
            audio.play().catch(e => console.warn("[NotificationUtils] Foreground notification sound playback failed:", e));
          } catch (e) {
            console.error("[NotificationUtils] Error playing foreground notification sound:", e);
          }
      }
      
      navigator.serviceWorker.ready.then(registration => {
        console.log("[NotificationUtils] Attempting to show foreground notification via SW registration's showNotification method with options:", notificationOptions);
        registration.showNotification(notificationTitle, notificationOptions)
         .then(() => console.log("[NotificationUtils] Foreground notification shown via SW registration successfully."))
         .catch(err => console.error("[NotificationUtils] Error showing foreground notification via SW registration:", err));
      }).catch(err => console.error("[NotificationUtils] Error getting SW registration for foreground notification:", err));

      toast({
        title: notificationTitle,
        description: notificationOptions.body as string,
      });
    });

  } catch (error: any) {
    console.error('[NotificationUtils] Error initializing FCM:', error);
    let description = "Could not set up push notifications. Check console for details.";
     if (error.name === 'InvalidStateError' && error.message.includes('PushManager')) {
        description = "PushManager is in an invalid state. This might be due to an inactive Service Worker or missing VAPID key in Firebase project. Ensure your VAPID key is set in Firebase Console > Project Settings > Cloud Messaging > Web Push certificates.";
    } else if (error.code === 'messaging/failed-service-worker-registration' || (error.message && error.message.includes('ServiceWorker script evaluation failed'))) {
        description = "The push notification service worker failed to register or evaluate. Ensure '/firebase-messaging-sw.js' is accessible at the root and contains valid JavaScript. Check the Service Worker console for errors.";
    } else if (error.code === 'messaging/invalid-vapid-key' || (error.message && (error.message.toLowerCase().includes('applicationserverkey') || error.message.toLowerCase().includes('vapid key')))) {
        description = "The VAPID key (application server key) seems to be invalid or not configured correctly in your Firebase project settings. Please verify it in the Firebase console under Project Settings > Cloud Messaging > Web Push certificates.";
    } else if (error.code === 'messaging/sw-registration-expected' || (error.message && error.message.includes("No active Service Worker"))) {
        description = "Service worker registration was expected but not found, or no service worker is active. Manual registration might have failed or the SW is not active.";
    } else if (error.code === 'messaging/permission-default') {
        description = "Notification permission is set to default. Please click the bell icon to grant permission.";
    } else if (error.code === 'messaging/permission-denied') {
        description = "Notification permission has been denied. Please enable notifications in your browser settings for this site.";
    } else if (error.message) {
        description = error.message;
    }
    toast({ title: "FCM Initialization Error", description: description, variant: "destructive", duration: 15000 });
  }
};

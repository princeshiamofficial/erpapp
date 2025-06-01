"use client";

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase'; 
import { toast } from '@/hooks/use-toast';


export const requestNotificationPermission = async (): Promise<NotificationPermission | null> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn("requestNotificationPermission: Notifications not supported by this browser.");
    toast({ title: "Notifications Not Supported", description: "This browser does not support desktop notifications.", variant: "destructive" });
    return null;
  }
  try {
    console.log("requestNotificationPermission: Requesting permission...");
    const permission = await Notification.requestPermission();
    console.log("requestNotificationPermission: Permission result -", permission);
    if (permission === 'granted') {
      toast({ title: "Notifications Enabled!", description: "You will now receive updates." });
    } else if (permission === 'denied') {
      toast({ title: "Notifications Blocked", description: "Please enable notifications in browser settings if you wish to receive them.", variant: "destructive", duration: 7000 });
    } else {
      toast({ title: "Notifications Dismissed", description: "You can enable notifications later if you change your mind." });
    }
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    toast({ title: "Permission Error", description: "Could not request notification permission.", variant: "destructive" });
    return null;
  }
};

export const initializeFCM = async () => {
  if (typeof window === 'undefined') {
    console.log("initializeFCM: Cannot run in non-browser environment.");
    return;
  }

  const messagingSupported = await isSupported();
  if (!messagingSupported) {
    console.log("Firebase Messaging not supported in this browser.");
    toast({ title: "Notifications Not Supported", description: "Push notifications are not supported by your browser.", variant: "destructive" });
    return;
  }

  const fcmMessaging = getMessaging(app);

  try {
    const permission = Notification.permission;
    if (permission !== 'granted') {
      console.log('initializeFCM: Notification permission not granted yet. User needs to click the bell or grant permission.');
      return;
    }

    console.log("initializeFCM: Attempting to register service worker: /firebase-messaging-sw.js with scope: /");
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    console.log("initializeFCM: Service worker registration successful. Scope:", swRegistration.scope);

    console.log("initializeFCM: Waiting for service worker to become active...");
    await navigator.serviceWorker.ready; // Wait for the service worker to be active
    console.log("initializeFCM: Service worker is active and ready. Active SW Registration:", swRegistration.active);
    
    console.log("initializeFCM: Attempting to get FCM token using active SW registration.");
    // VAPID key is intentionally OMITTED here.
    // The Firebase SDK should automatically use the VAPID key from your firebaseConfig if the project is set up correctly.
    const currentToken = await getToken(fcmMessaging, {
      serviceWorkerRegistration: swRegistration,
    });

    if (currentToken) {
      console.log('FCM Token acquired:', currentToken);
      // TODO: Send this token to your app server and store it.
      // toast({ title: "FCM Token Acquired", description: "Ready for push notifications (token in console)." });
    } else {
      console.warn('initializeFCM: No registration token available. This can happen if permission was denied at a higher level or VAPID key/project config issues.');
      // A more specific error is usually caught by the catch block if getToken itself throws.
    }

    onMessage(fcmMessaging, (payload) => {
      console.log('Foreground message received. ', payload);
      const notificationTitle = payload.notification?.title || "New Notification";
      
      let notificationIcon = payload.notification?.icon;
      if (notificationIcon && !notificationIcon.startsWith('http') && !notificationIcon.startsWith('/')) {
        notificationIcon = window.location.origin + (notificationIcon.startsWith('.') ? notificationIcon.substring(1) : '/' + notificationIcon);
      } else if (!notificationIcon) {
        notificationIcon = window.location.origin + '/icons/icon-192x192.png';
      }

      const notificationOptions: NotificationOptions = {
        body: payload.notification?.body || "You have a new update.",
        icon: notificationIcon,
        badge: window.location.origin + '/icons/icon-72x72.png', // Ensure this exists
        sound: payload.data?.soundUrl || 'https://audio-previews.elements.envatousercontent.com/files/393057177/preview.mp3',
        data: {
           click_action: payload.data?.click_action || payload.data?.targetUrl || window.location.origin,
          ...payload.data
        },
        tag: payload.notification?.tag || payload.messageId || 'colorhut-fg-notification',
      };
      console.log("Foreground notification options:", JSON.stringify(notificationOptions));
      
      if (notificationOptions.sound) {
          try {
            const audio = new Audio(notificationOptions.sound as string);
            audio.play().catch(e => console.warn("Foreground notification sound playback failed:", e));
          } catch (e) {
            console.error("Error playing foreground notification sound:", e);
          }
      }
      
      navigator.serviceWorker.ready.then(registration => {
        console.log("Attempting to show foreground notification via SW registration.");
        registration.showNotification(notificationTitle, notificationOptions)
         .then(() => console.log("Foreground notification shown via SW."))
         .catch(err => console.error("Error showing foreground notification via SW:", err));
      }).catch(err => console.error("Error getting SW registration for foreground notification:", err));

      toast({
        title: notificationTitle,
        description: notificationOptions.body as string,
      });
    });

  } catch (error: any) {
    console.error('Error initializing FCM:', error);
    let description = "Could not set up push notifications. Check console for details.";
    if (error.code === 'messaging/failed-service-worker-registration' || error.message.includes('ServiceWorker script evaluation failed')) {
        description = "The push notification service worker failed to register or evaluate. Ensure '/firebase-messaging-sw.js' is accessible at the root and contains valid JavaScript. Check console for errors from the service worker itself.";
    } else if (error.code === 'messaging/invalid-vapid-key' || (error.message && (error.message.toLowerCase().includes('applicationserverkey') || error.message.toLowerCase().includes('vapid key')))) {
        description = "The VAPID key (application server key) seems to be invalid or not configured correctly in your Firebase project settings. Please verify it in the Firebase console.";
    } else if (error.code === 'messaging/sw-registration-expected') {
        description = "Service worker registration was expected but not found. Manual registration might have failed or the SW is not active.";
    } else if (error.name === 'InvalidStateError' || error.message.includes('no active Service Worker') || error.message.includes('Subscription failed - no active Service Worker')) {
        description = "Push Manager is in an invalid state, or no service worker is active. This can happen if the service worker is not registered, not active, or if there's an issue with browser profiles. Try clearing site data and re-registering the service worker.";
    } else if (error.message) {
        description = error.message;
    }
    toast({ title: "FCM Initialization Error", description: description, variant: "destructive", duration: 15000 });
  }
};


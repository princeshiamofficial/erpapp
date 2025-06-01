
"use client";

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase'; // Import the initialized app
import { toast } from '@/hooks/use-toast';

// VAPID_KEY should be configured in your Firebase project settings (Cloud Messaging > Web configuration)
// The Firebase SDK will automatically use it if the project is set up correctly.
// Do NOT hardcode it here unless absolutely necessary for a non-Firebase push service.
// const VAPID_KEY = "BPH3cIN1er99_rQILWB9PQZzeEeo48jPxsS4eS5FzLKws2vBikUBYRnl-xWtm3kWNLj9y-_kerVqJloF9DwTK2U";

export const requestNotificationPermission = async (): Promise<NotificationPermission | null> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    toast({ title: "Notifications Not Supported", description: "This browser does not support desktop notifications.", variant: "destructive" });
    return null;
  }
  try {
    const permission = await Notification.requestPermission();
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
    const permission = Notification.permission; // Check current permission without re-prompting
    if (permission !== 'granted') {
      console.log('Notification permission not granted yet. User needs to click the bell.');
      // No toast here, user will be prompted by clicking the bell.
      return;
    }

    console.log("Attempting to register service worker: /firebase-messaging-sw.js with scope: /");
    await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    console.log("Service worker registration initiated. Waiting for it to become active...");

    // Wait for the service worker to be ready and active
    const swReg = await navigator.serviceWorker.ready;
    console.log("Service worker is active and ready. Scope:", swReg.scope);
    
    console.log("Attempting to get FCM token using active SW registration.");
    const currentToken = await getToken(fcmMessaging, {
      serviceWorkerRegistration: swReg,
      // VAPID_KEY is intentionally omitted to let Firebase SDK handle it
    });

    if (currentToken) {
      console.log('FCM Token:', currentToken);
      // TODO: Send this token to your app server and store it.
      // toast({ title: "FCM Token Acquired", description: "Ready for push notifications (token in console)." });
    } else {
      console.log('No registration token available. This can happen if permission was denied at a higher level or VAPID key/project config issues.');
      // A more specific error is usually caught by the catch block if getToken itself throws.
    }

    onMessage(fcmMessaging, (payload) => {
      console.log('Message received in foreground. ', payload);
      const notificationTitle = payload.notification?.title || "New Notification";
      const notificationOptions: NotificationOptions = {
        body: payload.notification?.body || "You have a new update.",
        icon: payload.notification?.icon || '/icons/icon-192x192.png',
        sound: payload.data?.soundUrl || 'https://audio-previews.elements.envatousercontent.com/files/393057177/preview.mp3',
        data: payload.data,
        tag: payload.notification?.tag || payload.messageId || undefined,
      };
      
      if (notificationOptions.sound) {
          try {
            const audio = new Audio(notificationOptions.sound as string);
            audio.play().catch(e => console.warn("Foreground notification sound playback failed:", e));
          } catch (e) {
            console.error("Error playing foreground notification sound:", e);
          }
      }
      
      // Ensure service worker is ready before trying to show notification through it
      // This path is mostly for if the onMessage is set up *before* SW is fully active,
      // though generally by this point it should be.
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(notificationTitle, notificationOptions)
         .catch(err => console.error("Error showing foreground notification via SW:", err));
      });

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
    } else if (error.name === 'InvalidStateError' || error.message.includes('no active Service Worker')) {
        description = "Push Manager is in an invalid state, or no service worker is active. This can happen if the service worker is not registered, not active, or if there's an issue with browser profiles. Try clearing site data and re-registering the service worker.";
    } else if (error.message) {
        description = error.message;
    }
    toast({ title: "FCM Initialization Error", description: description, variant: "destructive", duration: 15000 });
  }
};

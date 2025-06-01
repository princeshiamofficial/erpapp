
"use client";

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase'; // Import the initialized app
import { toast } from '@/hooks/use-toast';

// VAPID_KEY is intentionally omitted. Firebase SDK should fetch it from project config.

export const requestNotificationPermission = async (): Promise<NotificationPermission | null> => {
  if (!('Notification' in window)) {
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
  const messagingSupported = await isSupported();
  if (!messagingSupported) {
    console.log("Firebase Messaging not supported in this browser.");
    toast({ title: "Notifications Not Supported", description: "Push notifications are not supported by your browser.", variant: "destructive" });
    return;
  }

  // Get a fresh messaging instance here, ensuring 'app' from firebase.ts is initialized
  const fcmMessaging = getMessaging(app);

  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('Notification permission not granted.');
      return;
    }

    console.log("Attempting to register service worker: /firebase-messaging-sw.js with scope: /");
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    console.log("Service worker registered successfully. Scope:", swRegistration.scope);

    console.log("Attempting to get FCM token using SW registration.");
    // VAPID key is intentionally OMITTED here.
    // The Firebase SDK should automatically use the VAPID key from your firebaseConfig if the project is set up correctly.
    const currentToken = await getToken(fcmMessaging, {
      serviceWorkerRegistration: swRegistration,
    });

    if (currentToken) {
      console.log('FCM Token:', currentToken);
      // TODO: Send this token to your app server and store it.
      // toast({ title: "FCM Token Acquired", description: "Ready for push notifications (token in console)." });
    } else {
      // This typically means permission was denied at a higher level or VAPID key issues in Firebase Project settings.
      console.log('No registration token available. This can happen if permission was denied at a higher level or if the VAPID key setup in your Firebase project is missing/incorrect.');
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
    if (error.code === 'messaging/failed-service-worker-registration') {
        description = "The push notification service worker failed to register. Ensure '/firebase-messaging-sw.js' is accessible at the root and there are no console errors from the service worker itself.";
    } else if (error.code === 'messaging/invalid-vapid-key' || (error.message && error.message.toLowerCase().includes('applicationserverkey'))) {
        description = "The VAPID key (application server key) seems to be invalid or not configured correctly in your Firebase project settings. Please verify it in the Firebase console.";
    } else if (error.code === 'messaging/sw-registration-expected') {
        description = "Service worker registration was expected but not found. Manual registration might have failed.";
    } else if (error.name === 'InvalidStateError') {
        description = "Push Manager is in an invalid state. This can happen if the service worker is not registered or active, or if there's an issue with browser profiles.";
    } else if (error.message) {
        description = error.message;
    }
    toast({ title: "FCM Setup Error", description: description, variant: "destructive", duration: 10000 });
  }
};

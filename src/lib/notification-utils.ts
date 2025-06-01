
"use client";

import { messaging } from '@/lib/firebase'; // Ensure messaging is exported from firebase.ts
import { getToken, onMessage } from 'firebase/messaging';
import { toast } from '@/hooks/use-toast';

// Use the VAPID key explicitly provided by the user.
const VAPID_KEY = "BPH3cIN1er99_rQILWB9PQZzeEeo48jPxsS4eS5FzLKws2vBikUBYRnl-xWtm3kWNLj9y-_kerVqJloF9DwTK2U";

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
      toast({ title: "Notifications Blocked", description: "Please enable notifications in browser settings if you wish to receive them.", variant: "destructive" });
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
  if (!messaging) {
    console.log("Firebase Messaging not available/initialized.");
    return;
  }

  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('Notification permission not granted.');
      return;
    }

    console.log("Attempting to get FCM token with VAPID key:", VAPID_KEY);
    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (currentToken) {
      console.log('FCM Token:', currentToken);
      // TODO: Send this token to your app server and store it.
      // For now, we'll just log it.
      // toast({ title: "FCM Token Acquired", description: "Ready for push notifications (token in console)." });
    } else {
      console.log('No registration token available. This usually means permission was not granted or VAPID key is incorrect.');
      toast({ title: "FCM Error", description: "Could not get FCM token. Ensure notifications are permitted and VAPID key is correct.", variant: "destructive"});
    }

    onMessage(messaging, (payload) => {
      console.log('Message received in foreground. ', payload);
      const notificationTitle = payload.notification?.title || "New Notification";
      const notificationOptions: NotificationOptions = {
        body: payload.notification?.body || "You have a new update.",
        icon: payload.notification?.icon || '/icons/icon-192x192.png', // Ensure you have this icon
        sound: payload.data?.soundUrl || 'https://audio-previews.elements.envatousercontent.com/files/393057177/preview.mp3',
        data: payload.data, // You can pass custom data here
        tag: payload.notification?.tag || payload.messageId || undefined, // Helps group notifications
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
        registration.showNotification(notificationTitle, notificationOptions);
      });

      toast({
        title: notificationTitle,
        description: notificationOptions.body as string,
      });
    });

  } catch (error: any) {
    console.error('Error initializing FCM:', error);
    let description = "Could not set up push notifications.";
    if (error.code === 'messaging/invalid-vapid-key' || (error.message && error.message.toLowerCase().includes('applicationkey'))) {
        description = "The VAPID key seems to be invalid or not configured correctly for this project. Please verify it in the Firebase console.";
    } else if (error.name === 'InvalidStateError') {
        description = "Push Manager is in an invalid state. This can happen if the service worker is not registered or active.";
    } else if (error.message) {
        description = error.message;
    }
    toast({ title: "FCM Initialization Error", description: description, variant: "destructive"});
  }
};

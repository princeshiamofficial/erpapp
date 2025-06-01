
"use client";

import { messaging } from '@/lib/firebase'; // Ensure messaging is exported from firebase.ts
import { getToken, onMessage } from 'firebase/messaging';
import { toast } from '@/hooks/use-toast';

const VAPID_KEY = "BBi_d4_Ld7_kH3_A6ZJ6L1rO9x8bQ8nC7wY8g3wG0H6wXyP9tD6uC2jJ0S9zQ8f4g7vY7yR3jF2xKk"; // Replace with your actual VAPID key from Firebase Console

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

    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (currentToken) {
      console.log('FCM Token:', currentToken);
      // TODO: Send this token to your app server and store it.
      // For now, we'll just log it.
      // toast({ title: "FCM Token Acquired", description: "Ready for push notifications (token in console)." });
    } else {
      console.log('No registration token available. Request permission to generate one.');
      toast({ title: "FCM Error", description: "Could not get FCM token. Ensure notifications are permitted.", variant: "destructive"});
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
      
      // Play sound for foreground notification manually if needed via Notification API
      // The 'sound' option in Notification API has varying support.
      // It's more reliable for system sounds or sounds within the service worker scope.
      // For custom sounds, you might need to play it via an Audio element.
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

  } catch (error) {
    console.error('Error initializing FCM:', error);
    toast({ title: "FCM Initialization Error", description: "Could not set up push notifications.", variant: "destructive"});
  }
};

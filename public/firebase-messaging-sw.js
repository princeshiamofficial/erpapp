
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// Ensure this matches your main Firebase config in src/lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyA-OULKM7hL85JFSGlNs0BHdIuTOVN73-I",
  authDomain: "colorhut-57f5a.firebaseapp.com",
  projectId: "colorhut-57f5a",
  storageBucket: "colorhut-57f5a.firebasestorage.app",
  messagingSenderId: "282903959856",
  appId: "1:282903959856:web:287ace0c706eb0b11990f5",
  measurementId: "G-57S6VYXE7H" // Include if present in your main config
};

try {
  const app = initializeApp(firebaseConfig);
  console.log('[firebase-messaging-sw.js] Firebase app initialized successfully.');
  
  const messaging = getMessaging(app);
  console.log('[firebase-messaging-sw.js] Firebase Messaging instance obtained.');

  onBackgroundMessage(messaging, (payload) => {
    console.log('[firebase-messaging-sw.js] Received background message: ', payload);

    const notificationTitle = payload.notification?.title || "New Message";
    const notificationOptions = {
      body: payload.notification?.body || "You have a new message.",
      icon: payload.notification?.icon || '/icons/icon-192x192.png', // Default icon
      sound: payload.data?.soundUrl || 'https://audio-previews.elements.envatousercontent.com/files/393057177/preview.mp3',
      data: payload.data,
      tag: payload.notification?.tag || payload.messageId || undefined,
    };

    if (self.registration && typeof self.registration.showNotification === 'function') {
      console.log('[firebase-messaging-sw.js] Displaying notification:', notificationTitle, notificationOptions);
      self.registration.showNotification(notificationTitle, notificationOptions)
        .catch(err => console.error("[firebase-messaging-sw.js] Error showing notification:", err));
    } else {
      console.error("[firebase-messaging-sw.js] Service worker registration or showNotification not available.");
    }
  });
  console.log('[firebase-messaging-sw.js] Background message handler set up successfully.');

} catch (error) {
  console.error('[firebase-messaging-sw.js] Error initializing Firebase app or messaging:', error);
}

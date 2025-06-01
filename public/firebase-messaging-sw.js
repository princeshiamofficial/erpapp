
// Import the Firebase SDK for a service worker.
// Make sure you have these files in your `public` folder or adjust paths.
// For Firebase v9+, the import paths are different if you are using the compat libraries.
// This example assumes you are using the compat libraries for easier service worker setup.
try {
  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');
  console.log('Firebase SDK scripts imported successfully in service worker.');
} catch (e) {
  console.error('Error importing Firebase SDK scripts in service worker:', e);
  // If imports fail, the SW won't work, so further execution is pointless.
  // Throwing an error here will make the SW registration fail, which is informative.
  throw e; 
}

// Your web app's Firebase configuration
// THIS MUST EXACTLY MATCH THE CONFIG IN src/lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyA-OULKM7hL85JFSGlNs0BHdIuTOVN73-I",
  authDomain: "colorhut-57f5a.firebaseapp.com",
  projectId: "colorhut-57f5a",
  storageBucket: "colorhut-57f5a.firebasestorage.app",
  messagingSenderId: "282903959856",
  appId: "1:282903959856:web:287ace0c706eb0b11990f5",
  measurementId: "G-57S6VYXE7H"
};

let app;
if (firebase.apps.length === 0) {
  try {
    app = firebase.initializeApp(firebaseConfig);
    console.log('Service Worker: Firebase app initialized successfully.');
  } catch (e) {
    console.error('Service Worker: Error initializing Firebase app:', e);
    throw e; // Fail SW registration if Firebase init fails
  }
} else {
  app = firebase.app(); // if already initialized
  console.log('Service Worker: Firebase app already initialized.');
}


let messaging;
if (app) {
  try {
    messaging = firebase.messaging(app);
    console.log('Service Worker: Firebase Messaging initialized successfully.');
  } catch (e) {
    console.error('Service Worker: Error initializing Firebase Messaging:', e);
    // It's possible messaging isn't supported or init failed.
    // Depending on requirements, you might not want to throw e here if app can function without SW push.
    // For now, we'll log and continue, as the SW might be used for other things.
  }
} else {
  console.error('Service Worker: Firebase app not available for Messaging initialization.');
}

// Optional: Background message handling
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    const notificationTitle = payload.notification?.title || "New Background Notification";
    const notificationOptions = {
      body: payload.notification?.body || "You have a new update in the background.",
      icon: payload.notification?.icon || '/icons/icon-192x192.png', // Ensure this icon exists
      sound: payload.data?.soundUrl || 'https://audio-previews.elements.envatousercontent.com/files/393057177/preview.mp3',
      data: payload.data,
      tag: payload.notification?.tag || payload.messageId || undefined,
    };

    if (notificationOptions.sound) {
      // In a service worker, you can't directly play sound that the user hears immediately like in the foreground.
      // The `sound` property of a notification is a browser feature that plays a system sound if supported.
      // Custom sounds are tricky and often don't work reliably in SW background notifications due to restrictions.
      // For the sound to work via the notification itself, the browser and OS need to support it.
      console.log('Service Worker: Attempting to show notification with sound:', notificationOptions.sound);
    }

    self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => console.log('Service Worker: Background notification shown.'))
      .catch(err => console.error('Service Worker: Error showing background notification:', err));
  });
} else {
  console.warn('Service Worker: Firebase Messaging not initialized, background message handling will not work.');
}

self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
  // Optionally, force the waiting service worker to become the active service worker.
  // self.skipWaiting(); 
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');
  // Optionally, take control of all clients as soon as the SW activates.
  // event.waitUntil(self.clients.claim()); 
});

self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received (this is raw push, typically handled by onBackgroundMessage if using FCM SDK):', event.data?.text());
  // This is for raw push events. If you use FCM's onBackgroundMessage, it often handles this.
  // If you were handling push directly without the FCM onBackgroundMessage handler, you'd do it here.
});

console.log('Service Worker: Script evaluated. Waiting for events.');

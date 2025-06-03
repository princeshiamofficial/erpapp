
// Import and initialize the Firebase SDK
// Ensure you have firebase-app.js and firebase-messaging.js available in this path
// Or use ES6 modules if your bundler supports it for service workers
try {
  self.importScripts(
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js'
  );
} catch (e) {
  console.error("Failed to import Firebase scripts in Service Worker:", e);
  // If importScripts fails, it often means the paths are incorrect or the files are not accessible.
}


// Initialize Firebase
// IMPORTANT: Replace with your app's Firebase config object
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
    console.log("Firebase app initialized in Service Worker.");
  } catch (e) {
    console.error("Error initializing Firebase app in Service Worker:", e);
  }
} else {
  app = firebase.app(); // if already initialized, use that one
  console.log("Firebase app already initialized in Service Worker.");
}

let messaging;
if (app && typeof firebase.messaging === 'function') {
  try {
    messaging = firebase.messaging(app);
    console.log("Firebase Messaging initialized in Service Worker.");
  } catch (e) {
    console.error("Error initializing Firebase Messaging in Service Worker:", e);
  }
} else {
  console.error("Firebase Messaging is not available in Service Worker (app or firebase.messaging is undefined).");
}

// Optional: Handle background messages
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log(
      "[firebase-messaging-sw.js] Received background message ",
      payload
    );

    // Customize notification here
    const notificationTitle = payload.data?.title || payload.notification?.title || "Color Hut Notification";
    const notificationOptions = {
      body: payload.data?.body || payload.notification?.body || "You have a new message.",
      icon: payload.data?.iconUrl || payload.data?.icon || payload.notification?.icon || "/icons/icon-192x192.png",
      badge: payload.data?.badgeUrl || payload.data?.badge || "/icons/icon-72x72.png", // Optional: for Android
      data: { 
        click_action: payload.data?.click_action || payload.data?.targetUrl || self.location.origin, // Default to origin if not specified
        ...payload.data 
      },
      tag: payload.data?.tag || payload.notification?.tag || 'colorhut-bg-notif-' + Date.now(),
      renotify: payload.data?.renotify === 'true' || true, // Default to true to replace old notifs with same tag
      requireInteraction: payload.data?.requireInteraction === 'true' || false, // Default to false
    };

    console.log("[firebase-messaging-sw.js] Showing notification with title:", notificationTitle, "and options:", notificationOptions);

    // Attempt to play sound if customSoundUrl is present in data
    if (payload.data && payload.data.customSoundUrl) {
        console.log("[firebase-messaging-sw.js] Custom sound URL found in background data payload:", payload.data.customSoundUrl);
        // Note: Playing sound directly in SW can be unreliable. Better to set sound property in notificationOptions if supported,
        // or handle sound on client-side when notification is clicked/received.
        // For simplicity, we're adding to options; actual playback depends on browser support for 'sound' in SW notifications.
        // notificationOptions.sound = payload.data.customSoundUrl; // This is not standard, but some might try it
    }


    return self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => console.log("[firebase-messaging-sw.js] Notification shown successfully."))
      .catch(err => console.error("[firebase-messaging-sw.js] Error showing notification:", err));
  });
} else {
  console.log("[firebase-messaging-sw.js] Firebase messaging not initialized, background message handler not set.");
}

self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click Received.', event);
  event.notification.close(); // Close the notification

  const clickAction = event.notification.data?.click_action || '/'; // Default to root if no action defined

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a tab open with the target URL
      for (const client of clientList) {
        // Check if the client URL matches the target URL (ignoring query params/hash for simplicity here)
        const clientCleanUrl = new URL(client.url).origin + new URL(client.url).pathname;
        const targetCleanUrl = new URL(clickAction, self.location.origin).origin + new URL(clickAction, self.location.origin).pathname;

        if (clientCleanUrl === targetCleanUrl && 'focus' in client) {
          console.log('[firebase-messaging-sw.js] Found open tab, focusing:', client.url);
          return client.focus();
        }
      }
      // If no open tab is found, open a new one
      if (clients.openWindow) {
        console.log('[firebase-messaging-sw.js] No open tab found, opening new window to:', clickAction);
        return clients.openWindow(clickAction);
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[firebase-messaging-sw.js] Push subscription changed (e.g., token refreshed).', event);
  // TODO: Send new subscription to server if needed, or prompt user to re-enable
  // This event is rare but important for maintaining an active subscription.
});

self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installing.');
  // event.waitUntil(self.skipWaiting()); // Optional: force activate new SW immediately
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated.');
  // event.waitUntil(clients.claim()); // Optional: take control of uncontrolled clients
});

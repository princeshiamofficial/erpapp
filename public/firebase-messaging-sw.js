
// firebase-messaging-sw.js

// IMPORTANT: THIS FILE SHOULD BE IN YOUR `public` DIRECTORY

// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase libraries
// are not available in the service worker.
self.importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
self.importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
// IMPORTANT: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyA-OULKM7hL85JFSGlNs0BHdIuTOVN73-I",
  authDomain: "colorhut-57f5a.firebaseapp.com",
  projectId: "colorhut-57f5a",
  storageBucket: "colorhut-57f5a.firebasestorage.app",
  messagingSenderId: "282903959856",
  appId: "1:282903959856:web:287ace0c706eb0b11990f5",
  measurementId: "G-57S6VYXE7H"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

console.log('[SW] Firebase Messaging Service Worker V3 registered and initialized.');
console.log('[SW] Firebase App Config Project ID:', firebase.app().options.projectId);


messaging.onBackgroundMessage((payload) => {
  console.log('[SW] === Background message received ===. Raw payload:', JSON.stringify(payload, null, 2));

  // Customize notification here
  const notificationData = payload.data || {}; // Prefer data payload
  const fcmNotification = payload.notification || {}; // Fallback to standard notification payload

  const notificationTitle = notificationData.title || fcmNotification.title || "Color Hut Update";
  const notificationBody = notificationData.body || fcmNotification.body || "You have a new message.";
  
  // Icon handling: Prefer data.iconUrl, then data.icon, then notification.icon, then default.
  let iconUrl = notificationData.iconUrl || notificationData.icon || fcmNotification.icon || '/icons/icon-192x192.png';
  // Ensure icon URL is absolute if it's a relative path from public
  if (iconUrl && !iconUrl.startsWith('http') && !iconUrl.startsWith('/')) {
      iconUrl = self.registration.scope + (iconUrl.startsWith('.') ? iconUrl.substring(1) : iconUrl);
  } else if (iconUrl && !iconUrl.startsWith('http')) {
      iconUrl = self.registration.scope.slice(0, -1) + iconUrl; // registration.scope might end with '/'
  }

  // Badge handling: Prefer data.badgeUrl, then data.badge, then default.
  let badgeUrl = notificationData.badgeUrl || notificationData.badge || '/icons/icon-72x72.png';
   if (badgeUrl && !badgeUrl.startsWith('http') && !badgeUrl.startsWith('/')) {
      badgeUrl = self.registration.scope + (badgeUrl.startsWith('.') ? badgeUrl.substring(1) : badgeUrl);
  } else if (badgeUrl && !badgeUrl.startsWith('http')) {
      badgeUrl = self.registration.scope.slice(0, -1) + badgeUrl;
  }

  const clickAction = notificationData.click_action || notificationData.targetUrl || fcmNotification.click_action || self.registration.scope;

  const notificationOptions = {
    body: notificationBody,
    icon: iconUrl,
    badge: badgeUrl, // For Android PWA behavior mostly
    data: { // Pass all data fields for click_action handling
        click_action: clickAction, // Standard field for PWA click handling
        ...notificationData // Include any other custom data fields
    },
    tag: notificationData.tag || fcmNotification.tag || payload.messageId || 'colorhut-bg-notif-' + Date.now(), // Unique tag
    renotify: notificationData.renotify === 'true' || fcmNotification.renotify === true || false, // Allow re-notification if specified
    requireInteraction: notificationData.requireInteraction === 'true' || fcmNotification.requireInteraction === true || false,
    // Custom sound from data payload, if present
    ...(notificationData.customSoundUrl && { sound: notificationData.customSoundUrl }),
  };
  
  console.log('[SW] Showing notification with Title:', notificationTitle, 'Options:', JSON.stringify(notificationOptions, null, 2));

  self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => console.log('[SW] Background notification shown successfully.'))
    .catch(err => console.error('[SW] Error showing background notification:', err));
});


// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click Received. Event:', event);
  event.notification.close(); // Close the notification

  const notificationData = event.notification.data || {};
  const clickAction = notificationData.click_action || self.registration.scope;

  console.log('[SW] Click Action URL:', clickAction);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        // If client's URL is the base URL and clickAction is also base, or if they match exactly
        if (client.url === clickAction && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open with the target URL, open a new one
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});

self.addEventListener('install', (event) => {
  console.log('[SW] Service worker installing...');
  event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activating...');
  event.waitUntil(self.clients.claim()); // Become available to all pages
});


// Log when push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed. Event:', event);
  // Here you might want to re-send the new subscription to your server
  // For now, just logging it.
  if (event.newSubscription) {
    console.log('[SW] New subscription:', event.newSubscription.endpoint);
    // TODO: Send event.newSubscription.toJSON() to your server to update the token
  }
  if (event.oldSubscription) {
    console.log('[SW] Old subscription:', event.oldSubscription.endpoint);
  }
});

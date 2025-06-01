
// IMPORTANT: Make sure this file is in the public directory and accessible at /firebase-messaging-sw.js

// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

console.log('[SW] Service Worker script evaluating...');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
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

try {
  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
    console.log('[SW] Firebase app initialized in Service Worker.');
  } else {
    firebase.app(); // if already initialized, use that one
    console.log('[SW] Firebase app already initialized in Service Worker.');
  }
} catch (e) {
  console.error('[SW] Error initializing Firebase app in Service Worker:', e);
}

let messaging;
try {
  if (firebase.messaging.isSupported()) {
    messaging = firebase.messaging();
    console.log('[SW] Firebase Messaging initialized in Service Worker.');
  } else {
    console.log('[SW] Firebase Messaging is not supported in this service worker context.');
  }
} catch (e) {
  console.error('[SW] Error initializing Firebase Messaging in Service Worker:', e);
}

self.addEventListener('push', (event) => {
  console.log('[SW] === Push event received ===. Raw event object:', event);

  let payload;
  if (event.data) {
    console.log('[SW] Push event has data. Attempting to parse...');
    try {
      payload = event.data.json();
      console.log('[SW] Push event data (JSON parsed successfully):', JSON.stringify(payload, null, 2));
    } catch (e) {
      console.error('[SW] Error parsing push event data as JSON:', e);
      console.log('[SW] Raw event data (text attempt):', event.data.text ? event.data.text() : 'N/A');
      // Fallback notification if parsing fails
      payload = { 
        notification: { 
          title: 'Push Data Error', 
          body: 'Could not parse incoming push data. Check SW console.' 
        },
        data: {} // Ensure data object exists
      };
    }
  } else {
    console.log('[SW] Push event contained NO data. This is unusual for FCM. Displaying generic notification.');
    payload = { 
      notification: { 
        title: 'Generic Push Title', 
        body: 'You have a new update!' 
      },
      data: {} // Ensure data object exists
    };
  }

  // Safely access notification properties
  const notificationData = payload.notification || {};
  const customData = payload.data || {};

  const notificationTitle = notificationData.title || customData.title || 'Color Hut Notification';
  const notificationBody = notificationData.body || customData.body || 'Check for new updates.';
  
  let notificationIcon = notificationData.icon || customData.iconUrl || customData.icon;
  if (notificationIcon && !notificationIcon.startsWith('http') && !notificationIcon.startsWith('/')) {
    notificationIcon = self.origin + (notificationIcon.startsWith('.') ? notificationIcon.substring(1) : '/' + notificationIcon);
  } else if (!notificationIcon) {
    notificationIcon = self.origin + '/icons/icon-192x192.png'; // Default icon
  }

  const notificationBadge = customData.badgeUrl || customData.badge || self.origin + '/icons/icon-72x72.png';
  const notificationSound = customData.soundUrl || customData.sound || 'https://audio-previews.elements.envatousercontent.com/files/393057177/preview.mp3';
  
  const clickAction = customData.click_action || notificationData.click_action || customData.targetUrl || self.origin;

  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: notificationBadge,
    sound: notificationSound, // Note: sound support varies by browser/OS
    vibrate: [200, 100, 200],
    data: { // Ensure data is an object for click_action handling
      click_action: clickAction,
      ...customData // Spread the rest of customData
    },
    tag: notificationData.tag || customData.tag || payload.messageId || 'colorhut-push-' + Date.now()
  };

  console.log('[SW] Preparing to show notification. Title:', notificationTitle, 'Options:', JSON.stringify(notificationOptions, null, 2));

  if (!self.registration) {
    console.error("[SW] self.registration is not available. Cannot show notification.");
    return;
  }

  const notificationPromise = self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => {
      console.log('[SW] Notification shown successfully via self.registration.showNotification.');
    })
    .catch((err) => {
      console.error('[SW] Error showing notification via self.registration.showNotification:', err);
    });

  event.waitUntil(notificationPromise);
});


self.addEventListener('notificationclick', (event) => {
  console.log('[SW] === Notification click Received ===. Event:', event);
  event.notification.close(); 

  const clickActionUrl = event.notification.data?.click_action || self.origin;
  console.log(`[SW] Click action URL from notification data: '${clickActionUrl}'`);

  if (clickActionUrl) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          // Use new URL(client.url).pathname to compare paths if origins might differ (e.g. dev vs prod)
          // For simplicity, direct URL check:
          if (client.url === clickActionUrl && 'focus' in client) {
            console.log(`[SW] Found existing client with URL ${clickActionUrl}. Focusing it.`);
            try {
              return client.focus();
            } catch (focusError) {
              console.error(`[SW] Error focusing client:`, focusError);
              // Fallback to opening new window if focus fails
              if (clients.openWindow) return clients.openWindow(clickActionUrl);
            }
          }
        }
        if (clients.openWindow) {
          console.log(`[SW] No existing client found or focus failed. Opening new window to: ${clickActionUrl}`);
          return clients.openWindow(clickActionUrl);
        }
        console.log('[SW] clients.openWindow is not available.');
        return Promise.resolve();
      }).catch(err => {
        console.error('[SW] Error handling notification click:', err);
      })
    );
  } else {
    console.log('[SW] No click_action URL found in notification data. Opening origin.');
    if (clients.openWindow) {
       event.waitUntil(clients.openWindow(self.origin));
    }
  }
});

self.addEventListener('install', (event) => {
  console.log('[SW] Service worker installing...');
  event.waitUntil(self.skipWaiting()); // Ensures the new service worker activates immediately
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activating...');
  event.waitUntil(clients.claim()); // Allows an active service worker to take control of current page/clients immediately
});

console.log('[SW] Service Worker script evaluation complete. Event listeners for push, notificationclick, install, activate are set up.');

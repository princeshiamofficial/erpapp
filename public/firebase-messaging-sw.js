
// Import and configure the Firebase SDK
// These scripts are designed to be imported using importScripts() in a service worker.
try {
  self.importScripts(
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js'
  );
  console.log('[SW] Firebase SDK scripts imported successfully.');
} catch (e) {
  console.error('[SW] Failed to import Firebase SDK scripts:', e);
  // If scripts fail to import, SW won't work, so further execution is pointless.
  throw e; 
}

// IMPORTANT: Replace this with your app's Firebase project configuration.
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
    console.log('[SW] Firebase app initialized successfully.');
  } catch (e) {
    console.error('[SW] Firebase app initialization failed:', e);
    throw e;
  }
} else {
  app = firebase.app();
  console.log('[SW] Firebase app already initialized.');
}

let messaging;
if (app) {
  try {
    messaging = firebase.messaging(app);
    console.log('[SW] Firebase Messaging initialized successfully.');
  } catch (e) {
    console.error('[SW] Firebase Messaging initialization failed:', e);
    // Messaging might not be critical for SW to load, but push won't work.
  }
}

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing.');
  // event.waitUntil(self.skipWaiting()); // Optional: activate new SW immediately
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating.');
  // event.waitUntil(self.clients.claim()); // Optional: take control of open clients immediately
});

self.addEventListener('push', (event) => {
  console.log('[SW] Push event received.');

  if (!event.data) {
    console.warn('[SW] Push event received but no data.');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
    console.log('[SW] Push payload (JSON):', JSON.stringify(payload, null, 2));
  } catch (e) {
    console.error('[SW] Failed to parse push data as JSON:', e);
    // Try as text if JSON fails, though Firebase usually sends JSON
    const textData = event.data.text();
    console.log('[SW] Push payload (Text):', textData);
    payload = { notification: { title: "New Message", body: textData || "You have a new update." } };
  }

  const notificationTitle = payload.notification?.title || 'Color Hut Update';
  const notificationBody = payload.notification?.body || 'You have a new message from Color Hut.';
  
  let notificationIcon = payload.notification?.icon;
  if (notificationIcon && !notificationIcon.startsWith('http') && !notificationIcon.startsWith('/')) {
    // Relative path from payload, make it absolute
    notificationIcon = self.origin + (notificationIcon.startsWith('.') ? notificationIcon.substring(1) : '/' + notificationIcon);
  } else if (!notificationIcon) {
    notificationIcon = self.origin + '/icons/icon-192x192.png'; // Default icon
  }

  const notificationBadge = self.origin + '/icons/icon-72x72.png'; // Default badge

  // click_action should be in the data payload for background notifications
  const clickAction = payload.data?.click_action || payload.data?.targetUrl || self.origin;

  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: notificationBadge, 
    sound: payload.data?.soundUrl || 'https://audio-previews.elements.envatousercontent.com/files/393057177/preview.mp3', // Sound URL
    data: {
      click_action: clickAction,
      ...(payload.data || {}) 
    },
    tag: payload.notification?.tag || payload.messageId || 'colorhut-notification-' + Date.now(),
  };

  console.log('[SW] Prepared notification options:', JSON.stringify(notificationOptions, null, 2));

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => console.log('[SW] Notification shown successfully.'))
      .catch(err => console.error('[SW] Error showing notification:', err))
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click Received. Event:', event);
  event.notification.close(); // Close the notification

  const clickActionUrl = event.notification.data?.click_action;
  console.log('[SW] Click action URL from notification data:', clickActionUrl);

  if (clickActionUrl) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if there's already a tab open with the target URL
        for (const client of clientList) {
          if (client.url === clickActionUrl && 'focus' in client) {
            console.log('[SW] Found existing client for URL, focusing.');
            return client.focus();
          }
        }
        // If no such tab, open a new one
        if (clients.openWindow) {
          console.log('[SW] No existing client, opening new window for URL:', clickActionUrl);
          return clients.openWindow(clickActionUrl);
        }
        console.warn('[SW] clients.openWindow is not available.');
        return Promise.resolve();
      }).catch(err => console.error('[SW] Error handling notification click:', err))
    );
  } else {
    console.log('[SW] No click_action URL found in notification data.');
     // Fallback: open the app's origin if no specific URL
    event.waitUntil(clients.openWindow(self.origin).catch(err => console.error('[SW] Error opening origin on notification click:', err)));
  }
});

console.log('[SW] Service Worker script fully evaluated. Event listeners for install, activate, push, notificationclick are set.');

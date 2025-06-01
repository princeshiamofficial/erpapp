
// Import the Firebase app and messaging services using importScripts
try {
  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');
  console.log('[SW] Firebase scripts imported successfully.');
} catch (e) {
  console.error('[SW] Error importing Firebase scripts:', e);
}

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
  if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
    console.log('[SW] Firebase app initialized successfully.');
  } else if (typeof firebase === 'undefined') {
    console.error('[SW] Firebase object is not defined. Scripts might not have loaded.');
  } else {
    console.log('[SW] Firebase app already initialized or firebase object not ready.');
  }
} catch (e) {
  console.error('[SW] Error initializing Firebase app:', e);
}

let messaging;
try {
  if (typeof firebase !== 'undefined' && typeof firebase.messaging === 'function') {
    messaging = firebase.messaging();
    console.log('[SW] Firebase Messaging initialized.');
  } else {
    console.error('[SW] firebase.messaging is not a function or firebase is undefined.');
  }
} catch (e) {
  console.error('[SW] Error getting Firebase Messaging instance:', e);
}

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing.');
  event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating.');
  event.waitUntil(self.clients.claim()); // Become available to all pages
});

self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);
  let receivedPayload = {};
  try {
    if (event.data) {
      receivedPayload = event.data.json();
      console.log('[SW] Push event data (JSON parsed):', receivedPayload);
    } else {
      console.log('[SW] Push event data is empty.');
    }
  } catch (e) {
    console.error('[SW] Error parsing push event data as JSON:', e);
    receivedPayload = { notification: { title: "Error", body: "Could not parse push data." } };
  }

  const notificationTitle = receivedPayload.notification?.title || 'New Color Hut Update';
  const notificationOptions = {
    body: receivedPayload.notification?.body || 'You have a new message or update.',
    icon: receivedPayload.notification?.icon || (self.origin + '/icons/icon-192x192.png'),
    badge: self.origin + '/icons/icon-72x72.png', // Ensure this badge icon exists
    sound: receivedPayload.data?.soundUrl || 'https://audio-previews.elements.envatousercontent.com/files/393057177/preview.mp3',
    data: {
      click_action: receivedPayload.data?.click_action || receivedPayload.data?.targetUrl || self.origin,
      ...(receivedPayload.data || {})
    },
    tag: receivedPayload.notification?.tag || 'colorhut-notification-' + Date.now()
  };

  console.log('[SW] Showing notification with title:', notificationTitle, 'and options:', JSON.stringify(notificationOptions));

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => console.log('[SW] Notification shown successfully.'))
      .catch(err => console.error('[SW] Error showing notification:', err))
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received:', event);
  event.notification.close();

  const clickAction = event.notification.data?.click_action || self.origin;
  console.log('[SW] Click action URL:', clickAction);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open at the target URL
      for (const client of clientList) {
        if (client.url === clickAction && 'focus' in client) {
          console.log('[SW] Found existing client window for click action. Focusing.');
          return client.focus();
        }
      }
      // If no existing window, open a new one
      if (clients.openWindow) {
        console.log('[SW] No existing client window. Opening new window for:', clickAction);
        return clients.openWindow(clickAction);
      }
      console.log('[SW] clients.openWindow is not available.');
    }).catch(err => {
      console.error('[SW] Error handling notification click:', err);
    })
  );
});

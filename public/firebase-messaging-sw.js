// Import Firebase app and messaging (using compat for service worker)
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// --- IMPORTANT: CONFIGURATION ---
// This firebaseConfig MUST match the one in your src/lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyA-OULKM7hL85JFSGlNs0BHdIuTOVN73-I",
  authDomain: "colorhut-57f5a.firebaseapp.com",
  projectId: "colorhut-57f5a",
  storageBucket: "colorhut-57f5a.firebasestorage.app",
  messagingSenderId: "282903959856",
  appId: "1:282903959856:web:287ace0c706eb0b11990f5",
  measurementId: "G-57S6VYXE7H"
};
// --- END CONFIGURATION ---

try {
  firebase.initializeApp(firebaseConfig);
  console.log('[SW] Firebase initialized in Service Worker.');
} catch (e) {
  console.error('[SW] Error initializing Firebase in Service Worker:', e);
}

let messaging;
try {
  if (firebase.messaging.isSupported()) {
    messaging = firebase.messaging();
    console.log('[SW] Firebase Messaging initialized in Service Worker.');
  } else {
    console.log('[SW] Firebase Messaging is not supported in this browser (service worker context).');
  }
} catch (e) {
  console.error('[SW] Error getting Firebase Messaging instance in Service Worker:', e);
}


// Optional: Set a background message handler
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Received background message (deprecated onBackgroundMessage, use push event): ', payload);
    // This handler is for when the app is in the background or closed.
    // It's generally recommended to handle push events directly.
    // For modern browsers, the 'push' event is preferred.
  });
}

self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);
  let payload;
  try {
    payload = event.data ? event.data.json() : null;
    console.log('[SW] Push event payload:', payload);
  } catch (e) {
    console.error('[SW] Error parsing push event data:', e);
    payload = { // Fallback payload if parsing fails
      notification: {
        title: 'New Notification',
        body: 'You have a new message.',
        icon: '/icons/icon-192x192.png',
      },
      data: {
        click_action: '/',
        soundUrl: 'https://audio-previews.elements.envatousercontent.com/files/393057177/preview.mp3'
      }
    };
  }

  if (!payload || !payload.notification) {
    console.error('[SW] Push payload or payload.notification is missing. Cannot show notification.');
    return;
  }

  const notificationTitle = payload.notification.title || 'Color Hut Notification';
  const notificationBody = payload.notification.body || 'You have a new update from Color Hut.';
  
  // Ensure icon path is absolute or relative to origin
  let notificationIcon = payload.notification.icon;
  if (notificationIcon && !notificationIcon.startsWith('http') && !notificationIcon.startsWith('/')) {
    notificationIcon = self.registration.scope + notificationIcon.replace(/^\.\//, '');
  } else if (!notificationIcon) {
    notificationIcon = self.registration.scope + 'icons/icon-192x192.png';
  }
   console.log('[SW] Using notification icon:', notificationIcon);


  const soundUrl = payload.data?.soundUrl || 'https://audio-previews.elements.envatousercontent.com/files/393057177/preview.mp3';
  
  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: self.registration.scope + 'icons/icon-72x72.png', // Example badge, ensure file exists
    sound: soundUrl, // This might not work on all browsers/OS from SW directly
    tag: payload.notification.tag || payload.messageId || 'colorhut-default-tag',
    data: {
      click_action: payload.data?.click_action || payload.data?.targetUrl || self.registration.scope, // Default to scope root
      ...payload.data // Pass through other data
    }
  };

  console.log('[SW] Notification options prepared:', JSON.stringify(notificationOptions));

  if (soundUrl) {
    try {
      // Note: Playing sound directly from SW before notification is unreliable.
      // The 'sound' option in notificationOptions is preferred but OS/browser dependent.
      // const audio = new Audio(soundUrl);
      // audio.play().catch(e => console.warn('[SW] Sound playback failed in SW:', e));
      // console.log('[SW] Sound playback attempted from SW.');
    } catch (e) {
      console.error('[SW] Error with sound in SW:', e);
    }
  }

  const notificationPromise = self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => {
      console.log('[SW] Notification shown successfully.');
    })
    .catch((err) => {
      console.error('[SW] Error showing notification:', err);
      // Fallback if specific options cause issues (e.g., sound)
      const fallbackOptions = { ...notificationOptions, sound: undefined };
      console.log('[SW] Attempting to show notification with fallback options (no sound).');
      return self.registration.showNotification(notificationTitle, fallbackOptions).catch(e => {
        console.error('[SW] Error showing notification even with fallback options:', e);
      });
    });

  event.waitUntil(notificationPromise);
});


self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click Received.', event.notification);
  const clickedNotification = event.notification;
  clickedNotification.close();

  const targetUrl = clickedNotification.data?.click_action || self.registration.scope;
  console.log('[SW] Notification click_action URL:', targetUrl);

  // This Lints for Promsie type and CLIENTS is not defined, but it is standard SW API.
  // eslint-disable-next-line no-undef
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((clientList) => {
    let focusedClient = null;
    for (let i = 0; i < clientList.length; i++) {
      const client = clientList[i];
      // Attempt to match the client URL. Consider more flexible matching if needed.
      if (client.url === targetUrl && 'focus' in client) {
        try {
          client.focus();
          focusedClient = client;
          break;
        } catch (e) {
          console.warn('[SW] Failed to focus client:', e);
          // Could be that client.url is an empty string for some clients.
        }
      }
    }

    if (focusedClient) {
      console.log('[SW] Focused existing client for URL:', targetUrl);
      return focusedClient;
    }
    // eslint-disable-next-line no-undef
    if (clients.openWindow) {
      console.log('[SW] Opening new window for URL:', targetUrl);
      // eslint-disable-next-line no-undef
      return clients.openWindow(targetUrl);
    }
    console.log('[SW] No client focused or new window opened.');
    return null; // Add a return value for the case where no action is taken
  }).catch(err => {
    console.error("[SW] Error during notification click handling:", err);
  });

  event.waitUntil(promiseChain);
});

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing.');
  // event.waitUntil(self.skipWaiting()); // Optional: Activate new SW immediately
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating.');
  // event.waitUntil(self.clients.claim()); // Optional: Take control of open clients immediately
});

console.log('[SW] Service Worker script loaded and evaluated. Event listeners attached.');

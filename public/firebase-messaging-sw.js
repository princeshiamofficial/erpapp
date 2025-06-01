
// Version: 1.0.9 - Explicit SW Registration and Robust Payload Handling

// Give the service worker a name
const CACHE_NAME = 'colorhut-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png', // Make sure this path is correct
  '/icons/icon-512x512.png'  // Make sure this path is correct
];

// Install a service worker
self.addEventListener('install', event => {
  console.log('[SW] Install event fired. Caching core assets.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Opened cache. Caching URLs:', urlsToCache);
        return cache.addAll(urlsToCache)
          .then(() => console.log('[SW] Core assets cached successfully.'))
          .catch(error => console.error('[SW] Failed to cache core assets:', error));
      })
      .catch(error => console.error('[SW] Error opening cache during install:', error))
  );
  self.skipWaiting();
});

// Cache and return requests
self.addEventListener('fetch', event => {
  // Let the browser handle requests for Firebase assets and other external resources
  if (event.request.url.includes('firebase') || event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).catch(error => {
          console.error('[SW] Fetch failed; returning offline page instead.', error);
          // Add offline fallback page if you have one
        });
      })
  );
});

// Update a service worker
self.addEventListener('activate', event => {
  console.log('[SW] Activate event fired. Clearing old caches if any.');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  console.log('[SW] Activated successfully.');
  event.waitUntil(self.clients.claim());
});


// --- Firebase Push Notification Handling ---
try {
  if (typeof firebase === 'undefined') {
    importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');
    console.log('[SW] Firebase scripts imported via importScripts.');
  } else {
    console.log('[SW] Firebase scripts already available globally.');
  }

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

  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
    console.log('[SW] Firebase app initialized in Service Worker.');
  } else {
    firebase.app(); // if already initialized, use that one
    console.log('[SW] Firebase app already initialized.');
  }

  const messaging = firebase.messaging();
  console.log('[SW] Firebase Messaging instance obtained in Service Worker.');

  messaging.onBackgroundMessage(payload => {
    console.log('[SW] Received background message payload:', JSON.stringify(payload, null, 2));

    const notificationData = payload.data || {}; // Prefer data payload
    const fcmNotification = payload.notification || {};

    const notificationTitle = notificationData.title || fcmNotification.title || 'Color Hut Update';
    const notificationBody = notificationData.body || fcmNotification.body || 'You have a new message.';
    
    let notificationIcon = notificationData.iconUrl || notificationData.icon || fcmNotification.icon || '/icons/icon-192x192.png';
    if (notificationIcon && !notificationIcon.startsWith('http') && !notificationIcon.startsWith('/')) {
        notificationIcon = self.origin + (notificationIcon.startsWith('.') ? notificationIcon.substring(1) : '/' + notificationIcon);
    } else if (!notificationIcon.startsWith('http')) {
        notificationIcon = self.origin + notificationIcon;
    }

    let notificationBadge = notificationData.badgeUrl || notificationData.badge || '/icons/icon-72x72.png';
     if (notificationBadge && !notificationBadge.startsWith('http') && !notificationBadge.startsWith('/')) {
        notificationBadge = self.origin + (notificationBadge.startsWith('.') ? notificationBadge.substring(1) : '/' + notificationBadge);
    } else if (notificationBadge && !notificationBadge.startsWith('http')) {
        notificationBadge = self.origin + notificationBadge;
    }

    const clickAction = notificationData.click_action || notificationData.targetUrl || fcmNotification.click_action || self.origin;

    const notificationOptions = {
      body: notificationBody,
      icon: notificationIcon,
      badge: notificationBadge,
      data: { // Ensure data is an object, even if just for click_action
        click_action: clickAction,
        ...notificationData // Pass through other custom data from payload.data
      },
      tag: notificationData.tag || fcmNotification.tag || payload.messageId || 'colorhut-sw-notif-' + Date.now(),
    };

    console.log('[SW] Preparing to show notification with options:', JSON.stringify(notificationOptions, null, 2));

    try {
      event.waitUntil(
        self.registration.showNotification(notificationTitle, notificationOptions)
          .then(() => console.log('[SW] Notification shown successfully from onBackgroundMessage.'))
          .catch(err => console.error('[SW] Error showing notification from onBackgroundMessage:', err))
      );
    } catch (e) {
        console.error('[SW] Exception caught trying to show notification:', e);
    }
  });
  
  self.addEventListener('push', event => {
    console.log('[SW] Push event received.');
    let payload;
    try {
        payload = event.data ? event.data.json() : { notification: { title: "Fallback Title", body: "Fallback body."}};
        console.log('[SW] Push event data (JSON parsed):', JSON.stringify(payload, null, 2));
    } catch (e) {
        console.error('[SW] Failed to parse push event data as JSON, or no data. Using fallback.', e);
        payload = { notification: { title: "Error Parsing Notification", body: "Could not read notification content." } };
    }

    const notificationData = payload.data || {}; // Prefer data payload
    const fcmNotification = payload.notification || {};

    const title = notificationData.title || fcmNotification.title || 'Color Hut Notification';
    const body = notificationData.body || fcmNotification.body || 'Check for new updates.';
    
    let icon = notificationData.iconUrl || notificationData.icon || fcmNotification.icon || '/icons/icon-192x192.png';
    if (icon && !icon.startsWith('http') && !icon.startsWith('/')) {
        icon = self.origin + (icon.startsWith('.') ? icon.substring(1) : '/' + icon);
    } else if (icon && !icon.startsWith('http')) {
        icon = self.origin + icon;
    }

    let badge = notificationData.badgeUrl || notificationData.badge || '/icons/icon-72x72.png';
    if (badge && !badge.startsWith('http') && !badge.startsWith('/')) {
        badge = self.origin + (badge.startsWith('.') ? badge.substring(1) : '/' + badge);
    } else if (badge && !badge.startsWith('http')) {
        badge = self.origin + badge;
    }
    
    const clickAction = notificationData.click_action || notificationData.targetUrl || fcmNotification.click_action || self.origin;
    
    const options = {
      body: body,
      icon: icon,
      badge: badge,
      data: {
        click_action: clickAction,
        ...notificationData
      },
      tag: notificationData.tag || fcmNotification.tag || payload.messageId || 'colorhut-push-notif-' + Date.now(),
    };

    console.log('[SW] Preparing to show notification from "push" event with options:', JSON.stringify(options, null, 2));
    try {
      event.waitUntil(
        self.registration.showNotification(title, options)
          .then(() => console.log('[SW] Notification shown successfully from "push" event.'))
          .catch(err => console.error('[SW] Error showing notification from "push" event:', err))
      );
    } catch (e) {
        console.error('[SW] Exception caught trying to show notification from "push" event:', e);
    }
  });

  self.addEventListener('notificationclick', event => {
    console.log('[SW] Notification click Received. Event:', event);
    event.notification.close();

    const clickAction = event.notification.data?.click_action || event.notification.data?.targetUrl || event.notification.data?.FCM_MSG?.data?.click_action || self.origin;
    console.log('[SW] Determined click_action:', clickAction);

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          // Check if the client's URL matches the click_action or if it's a more general app URL.
          // You might want to refine this logic based on your app's routing.
          if (client.url === clickAction && 'focus' in client) {
            return client.focus().then(() => client.navigate(clickAction)); // Navigate even if focused
          }
        }
        // If no matching client is found or focused, open a new window.
        if (clients.openWindow) {
          return clients.openWindow(clickAction);
        }
      }).catch(error => {
        console.error('[SW] Error handling notification click:', error);
      })
    );
  });

} catch (error) {
  console.error('[SW] Error setting up Firebase Messaging in Service Worker:', error);
}

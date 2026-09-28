// Firebase Cloud Messaging Service Worker for NSTA PWA
// Provides background push notifications even when the app/browser tab is closed.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBEDKZVPgwOPCccjWdKSShfvSqC3REDa0c",
  authDomain: "iic-nst.firebaseapp.com",
  databaseURL: "https://iic-nst-default-rtdb.firebaseio.com",
  projectId: "iic-nst",
  storageBucket: "iic-nst.firebasestorage.app",
  messagingSenderId: "984309241322",
  appId: "1:984309241322:web:4dae35987732d630e64e93"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Smart Anti-Fatigue Rules:
// 1. Friend requests & direct chat messages -> Instant notification with vibration.
// 2. Daily coins & streak savers -> Gentle notification.
// 3. Community updates & new notes -> Silent update (no loud vibration).
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background push received:', payload);

  const data = payload.data || {};
  const notification = payload.notification || {};

  const type = data.type || 'DEFAULT';
  const title = notification.title || data.title || 'NSTA Study App';
  const body = notification.body || data.body || 'New update available!';
  const icon = notification.icon || data.icon || '/icons/icon-192.png';
  const badge = '/favicon.svg';
  const url = data.url || data.click_action || '/';

  let vibratePattern = [100, 50, 100];
  let tag = 'nsta-general';
  let renotify = true;

  if (type === 'CHAT' || type === 'FRIEND_REQUEST' || type === 'DIRECT_MESSAGE') {
    // High-priority instant alert
    vibratePattern = [200, 100, 200];
    tag = `chat-${data.senderId || 'direct'}`;
    renotify = true;
  } else if (type === 'STREAK' || type === 'DAILY_COIN') {
    // Gentle reminder
    vibratePattern = [80];
    tag = 'streak-reminder';
    renotify = false;
  } else if (type === 'COMMUNITY' || type === 'NOTE_UPDATE') {
    // Silent in-app update - anti-fatigue (no vibration)
    vibratePattern = [];
    tag = 'community-silent';
    renotify = false;
  }

  const notificationOptions = {
    body,
    icon,
    badge,
    tag,
    renotify,
    data: {
      url,
      type,
      ...data
    },
    vibrate: vibratePattern,
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  return self.registration.showNotification(title, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open, focus it and navigate
      for (let client of windowClients) {
        if (client.url && 'focus' in client) {
          if (targetUrl && client.navigate) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

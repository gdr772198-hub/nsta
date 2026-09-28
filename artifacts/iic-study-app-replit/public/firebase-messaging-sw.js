/* NSTA background FCM worker.
 * This worker intentionally uses a separate scope from the Workbox PWA worker.
 * The server sends data-only messages so this code owns notification rendering
 * and there is never a duplicate notification.
 */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBEDKZVPgwOPCccjWdKSShfvSqC3REDa0c',
  authDomain: 'iic-nst.firebaseapp.com',
  databaseURL: 'https://iic-nst-default-rtdb.firebaseio.com',
  projectId: 'iic-nst',
  storageBucket: 'iic-nst.firebasestorage.app',
  messagingSenderId: '984309241322',
  appId: '1:984309241322:web:4dae35987732d630e64e93',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || 'NSTA Study App';
  const body = data.body || 'New notification received!';
  const type = data.type || 'DEFAULT';
  const url = data.url || '/';
  const urgent = type === 'CHAT' || type === 'FRIEND_REQUEST' || type === 'DIRECT_MESSAGE';

  return self.registration.showNotification(title, {
    body,
    icon: data.icon || '/icons/icon-192.png',
    badge: '/favicon.svg',
    tag: data.senderId ? `nsta-${type}-${data.senderId}` : `nsta-${type}`,
    renotify: urgent,
    requireInteraction: urgent,
    vibrate: urgent ? [200, 100, 200] : [80],
    data: { url, ...data },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow ? clients.openWindow(targetUrl) : undefined;
    }),
  );
});
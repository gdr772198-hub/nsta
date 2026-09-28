/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<unknown>;
};

/*
 * This is the single production service worker for the NSTA PWA.
 * Keeping Firebase Messaging here is important: PWA scanners and installed
 * browsers inspect /sw.js, not a second worker registered on another scope.
 */
precacheAndRoute(self.__WB_MANIFEST);
self.skipWaiting();
clientsClaim();

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

messaging.onBackgroundMessage((payload: {
  data?: Record<string, string>;
  notification?: { title?: string; body?: string; icon?: string };
}) => {
  const data = payload.data || {};
  const title = data.title || payload.notification?.title || 'NSTA Study App';
  const body = data.body || payload.notification?.body || 'New notification received!';
  const type = data.type || 'DEFAULT';
  const url = data.url || '/';
  const urgent = type === 'CHAT' || type === 'FRIEND_REQUEST' || type === 'DIRECT_MESSAGE';

  return self.registration.showNotification(title, {
    body,
    icon: data.icon || payload.notification?.icon || '/icons/icon-192.png',
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
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) void client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined;
    }),
  );
});
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

type NstaPushPayload = {
  data?: Record<string, string>;
  notification?: { title?: string; body?: string; icon?: string };
  from?: string;
  messageId?: string;
  collapse_key?: string;
  fcmOptions?: unknown;
};

const showNstaNotification = (payload: NstaPushPayload) => {
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
};

// Keep an explicit Push API listener in the PWA worker. This makes push
// capability discoverable to PWA validators while Firebase handles FCM
// messages through onBackgroundMessage below.
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let payload: NstaPushPayload;
  try {
    payload = event.data.json() as NstaPushPayload;
  } catch {
    payload = { data: { body: event.data.text() } };
  }

  // The Firebase Messaging SDK owns FCM delivery. The fallback is only for
  // ordinary Web Push payloads that arrive through the browser Push API.
  const isFirebaseMessage = Boolean(
    payload.from || payload.messageId || payload.collapse_key || payload.fcmOptions,
  );
  if (isFirebaseMessage) return;

  event.waitUntil(showNstaNotification(payload));
});

messaging.onBackgroundMessage((payload: NstaPushPayload) => {
  return showNstaNotification(payload);
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
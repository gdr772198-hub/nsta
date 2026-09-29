import { VAPID_KEY, getFirebaseMessaging, db, rtdb, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { get, ref, set } from 'firebase/database';

export const NOTIFICATION_CATEGORY_DEFINITIONS = [
  { key: 'DAILY_ROUTINE', label: 'Today’s routine', description: 'Subah ka daily study target' },
  { key: 'ROUTINE_SLOT', label: 'Routine slots', description: 'Aapke selected subject ke time reminders' },
  { key: 'STUDY_PROGRESS', label: 'Study progress', description: '50% / 100% target aur coins milestones' },
  { key: 'STREAK_SAVER', label: 'Streak saver', description: 'Shaam ka pending-target reminder' },
  { key: 'CONTENT', label: 'New content', description: 'Naye notes, MCQs, PDFs aur tests' },
  { key: 'COMMUNITY', label: 'Community updates', description: 'Doubt replies, comments aur notices' },
  { key: 'CHAT', label: 'Private messages', description: 'Direct chat messages' },
  { key: 'FRIEND_REQUEST', label: 'Friend requests', description: 'Friend request aur acceptance alerts' },
  { key: 'LIVE_CLASS', label: 'Live classes', description: 'Live class start alerts' },
  { key: 'STUDY_ROOM', label: 'Study rooms', description: 'Room invites aur live study-room alerts' },
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORY_DEFINITIONS)[number]['key'] | 'DEFAULT';

export type NotificationPreferences = {
  enabled: boolean;
  categories: Record<NotificationCategory, boolean>;
  morningRoutineTime: string;
  streakSaverTime: string;
  routineSlotTimes: Record<string, string>;
  timezone: string;
  updatedAt?: string;
};

const NOTIFICATION_PREFERENCES_KEY = (userId: string) => `nst_notification_preferences_${userId}`;

export const getDefaultNotificationPreferences = (): NotificationPreferences => {
  const categories = {} as Record<NotificationCategory, boolean>;
  for (const item of NOTIFICATION_CATEGORY_DEFINITIONS) categories[item.key] = true;
  categories.DEFAULT = true;
  return {
    enabled: true,
    categories,
    morningRoutineTime: '07:00',
    streakSaverTime: '19:00',
    routineSlotTimes: {},
    timezone: typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
      : 'Asia/Kolkata',
  };
};

export const loadNotificationPreferences = (userId?: string): NotificationPreferences => {
  const defaults = getDefaultNotificationPreferences();
  if (!userId || typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFERENCES_KEY(userId));
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      ...defaults,
      ...saved,
      categories: { ...defaults.categories, ...(saved.categories || {}) },
      routineSlotTimes: { ...(saved.routineSlotTimes || {}) },
    };
  } catch {
    return defaults;
  }
};

export const saveNotificationPreferences = async (
  userId: string,
  next: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> => {
  const preferences = {
    ...loadNotificationPreferences(userId),
    ...next,
    categories: {
      ...loadNotificationPreferences(userId).categories,
      ...(next.categories || {}),
    },
    routineSlotTimes: {
      ...loadNotificationPreferences(userId).routineSlotTimes,
      ...(next.routineSlotTimes || {}),
    },
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(NOTIFICATION_PREFERENCES_KEY(userId), JSON.stringify(preferences));
  }
  try {
    const payload = { ...preferences, userId };
    await Promise.all([
      set(ref(rtdb, `notification_preferences/${userId}`), payload),
      set(ref(rtdb, `users/${userId}/notificationPreferences`), payload),
    ]);
  } catch (error) {
    console.warn('[NotificationManager] Preference sync failed:', error);
  }
  return preferences;
};

export const hydrateNotificationPreferences = async (
  userId: string,
): Promise<NotificationPreferences> => {
  if (!userId) return getDefaultNotificationPreferences();
  const local = loadNotificationPreferences(userId);
  try {
    const snapshot = await get(ref(rtdb, `notification_preferences/${userId}`));
    if (!snapshot.exists()) return local;
    const remote = snapshot.val() as Partial<NotificationPreferences>;
    const merged: NotificationPreferences = {
      ...local,
      ...remote,
      categories: { ...local.categories, ...(remote.categories || {}) },
      routineSlotTimes: { ...local.routineSlotTimes, ...(remote.routineSlotTimes || {}) },
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(NOTIFICATION_PREFERENCES_KEY(userId), JSON.stringify(merged));
    }
    return merged;
  } catch {
    return local;
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('[NotificationManager] This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.warn('[NotificationManager] Permission request error:', e);
      return false;
    }
  }

  return false;
};

const FCM_SERVICE_WORKER_PATH = '/firebase-messaging-sw.js';

const getFcmServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('ServiceWorker not supported in this environment');
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  
  // Prefer the primary active root-scoped service worker (PWA worker),
  // which browser OS push daemons reliably wake up even when the device is locked.
  const activeRoot = registrations.find(
    (r) => (r.active && (r.scope === window.location.origin + '/' || r.scope.endsWith('/')))
  );
  if (activeRoot) return activeRoot;

  if (registrations.length > 0 && registrations[0].active) {
    return registrations[0];
  }

  // Fallback to registering firebase-messaging-sw.js
  try {
    return await navigator.serviceWorker.register(FCM_SERVICE_WORKER_PATH, {
      updateViaCache: 'none',
    });
  } catch (err) {
    console.warn('[NotificationManager] Register fallback warning:', err);
    return await navigator.serviceWorker.ready;
  }
};

export const subscribeUserToPush = async (userId?: string): Promise<string | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const isGranted = await requestNotificationPermission();
    if (!isGranted) {
      console.log('[NotificationManager] Notification permission not granted');
      return null;
    }

    // Firebase Messaging uses its dedicated worker, separate from the PWA worker.
    const swReg = await getFcmServiceWorkerRegistration();

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      console.warn('[NotificationManager] Firebase messaging not available');
      return null;
    }

    const { getToken } = await import('firebase/messaging');
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg
    });

    if (currentToken) {
      console.log('[NotificationManager] FCM Token acquired:', currentToken.slice(0, 15) + '...');
      localStorage.setItem('nst_fcm_token', currentToken);

      if (userId) {
        await saveFcmToken(userId, currentToken);
        const preferences = loadNotificationPreferences(userId);
        await saveNotificationPreferences(userId, preferences);
      }
      return currentToken;
    } else {
      console.warn('[NotificationManager] No registration token available.');
    }
  } catch (err) {
    console.warn('[NotificationManager] Unable to get FCM token:', err);
  }
  return null;
};

export const saveFcmToken = async (userId: string, token: string) => {
  if (!userId || !token) return;
  try {
    const safeUserId = String(userId).replace(/[.#$[\]/]/g, '_');

    // Save in RTDB
    await Promise.all([
      set(ref(rtdb, `users/${safeUserId}/fcmToken`), token),
      set(ref(rtdb, `users/${safeUserId}/notificationTokenUpdatedAt`), new Date().toISOString()),
    ]).catch(() => {});

    // Save in user's token list for broadcast pushes
    const broadcastRef = ref(rtdb, `fcm_tokens/${safeUserId}`);
    await set(broadcastRef, {
      token,
      updatedAt: new Date().toISOString(),
        platform: 'pwa',
        userId,
    }).catch(() => {});

    // Save in Firestore
    const userDoc = doc(db, 'users', safeUserId);
    await updateDoc(userDoc, { fcmToken: token }).catch(() => {});
  } catch (e) {
    console.warn('[NotificationManager] Token save non-fatal error:', e);
  }
};

export const getStoredFcmToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('nst_fcm_token');
};

export interface PushNotificationRequest {
  recipientIds: string[];
  type: NotificationCategory;
  title: string;
  body: string;
  url?: string;
  senderId?: string;
  senderName?: string;
  senderPhoto?: string;
  icon?: string;
  broadcast?: boolean;
}

/** Ask the server to send a data-only FCM push while the app is closed. */
export const sendPushNotification = async (request: PushNotificationRequest) => {
  try {
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) return false;

    const response = await fetch('/api/notifications/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        ...request,
        url: request.url || '/',
      }),
    });
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.warn(
        '[NotificationManager] Push request rejected:',
        response.status,
        details.slice(0, 300),
      );
    }
    return response.ok;
  } catch (error) {
    console.warn('[NotificationManager] Push request failed:', error);
    return false;
  }
};

export const notifyFriendRequestInBackground = async (request: {
  recipientIds: string[];
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  url?: string;
}) => {
  if (request.recipientIds.length === 0) return false;
  return sendPushNotification({
    ...request,
    type: 'FRIEND_REQUEST',
    title: '🤝 Friend Request',
    body: `${request.senderName} ne aapko friend request bheji hai! Accept karke baat start karein.`,
    senderPhoto: request.senderPhoto,
    icon: request.senderPhoto,
  });
};

export const notifyDirectMessageInBackground = async (request: {
  recipientIds: string[];
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  message: string;
  messageType?: string;
  url?: string;
}) => sendPushNotification({
  recipientIds: request.recipientIds,
  senderId: request.senderId,
  senderName: request.senderName,
  senderPhoto: request.senderPhoto,
  icon: request.senderPhoto,
  type: 'CHAT',
  title: `💬 Naya Message: ${request.senderName}`,
  body: request.message.slice(0, 180) ||
    (request.messageType === 'IMAGE' ? 'Aapko ek photo bheji gayi hai.' :
      request.messageType === 'VIDEO' ? 'Aapko ek video bheja gaya hai.' :
        request.messageType === 'AUDIO' || request.messageType === 'VOICE' ? 'Aapko ek voice message mila hai.' :
          'Aapko ek naya private message mila hai.'),
  url: request.url || '/?open=messenger',
});

export const notifyCommunityUpdateInBackground = async (request: {
  recipientIds: string[];
  senderId?: string;
  senderName: string;
  body: string;
  url?: string;
}) => sendPushNotification({
  recipientIds: request.recipientIds,
  senderId: request.senderId,
  senderName: request.senderName,
  type: 'COMMUNITY',
  title: '💬 Community Update',
  body: request.body,
  url: request.url || '/?open=community',
});

export const getNotificationPermissionStatus = (): NotificationPermission | 'unsupported' => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

export const listenToForegroundMessages = async (onMessageReceived?: (payload: any) => void) => {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return () => {};

    const { onMessage } = await import('firebase/messaging');
    return onMessage(messaging, (payload) => {
      console.log('[NotificationManager] Foreground message received:', payload);
      
      // 1. Invoke custom callback
      if (onMessageReceived) {
        try { onMessageReceived(payload); } catch (_) {}
      }

      // 2. Automatically display visual alert so user sees it even when app is open!
      const title = payload.notification?.title || payload.data?.title || 'NSTA Study Alert';
      const body = payload.notification?.body || payload.data?.body || 'New update received!';
      const icon = payload.notification?.icon || payload.data?.icon || '/icons/icon-192.png';

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          if ('serviceWorker' in navigator) {
            getFcmServiceWorkerRegistration().then((reg) => {
              reg.showNotification(title, {
                body,
                icon,
                badge: '/favicon.svg',
                tag: 'fcm-foreground-' + Date.now(),
                data: payload.data,
              });
            }).catch(() => {
              try { new Notification(title, { body, icon }); } catch (_) {}
            });
          } else {
            try { new Notification(title, { body, icon }); } catch (_) {}
          }
        } catch (_) {}
      }

      // Also trigger chime & custom event for in-app toasts
      try {
        const audio = new Audio('/branding/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (_) {}

      window.dispatchEvent(new CustomEvent('nst_foreground_notification', {
        detail: { title, body, payload }
      }));
    });
  } catch (e) {
    console.warn('[NotificationManager] listenToForegroundMessages error:', e);
    return () => {};
  }
};

export interface SmartNotificationPayload {
  title: string;
  body: string;
  category: NotificationCategory;
  url?: string;
  senderId?: string;
  silent?: boolean;
}

// Smart Anti-Fatigue Notification Trigger
export const dispatchSmartNotification = async (payload: SmartNotificationPayload) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const { title, body, category, url = '/', senderId } = payload;
  const showNotification = async (
    registration: ServiceWorkerRegistration,
    options: NotificationOptions & { vibrate?: number[]; renotify?: boolean },
  ) => registration.showNotification(title, options);

  // 1. Community & Notes Updates: Silent in-app update only. Never vibrate or spam the phone tray repeatedly.
  if (category === 'COMMUNITY' || category === 'CONTENT') {
    console.log('[SmartNotify] Anti-Fatigue: Silent in-app notification for community/notes:', title);
    // Silent notification without loud vibration
    try {
      if ('serviceWorker' in navigator) {
        const reg = await getFcmServiceWorkerRegistration();
        showNotification(reg, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/favicon.svg',
          tag: 'community-silent',
          silent: true,
          data: { url, category }
        });
      }
    } catch {}
    return;
  }

  // 2. Direct Chat & Friend Request: Instant notification with vibration
  if (category === 'CHAT' || category === 'FRIEND_REQUEST') {
    try {
      // Audio chime & mobile hardware vibration
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([200, 100, 200]); } catch (_) {}
      }

      // Play soft notification sound if available
      try {
        const audio = new Audio('/branding/notification.mp3');
        audio.volume = 0.6;
        audio.play().catch(() => {});
      } catch (_) {}

      if ('serviceWorker' in navigator) {
        const reg = await getFcmServiceWorkerRegistration();
        showNotification(reg, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/favicon.svg',
          tag: senderId ? `req-${senderId}` : 'friend-request',
          vibrate: [200, 100, 200],
          renotify: true,
          data: { url, category, senderId }
        });
      } else {
        new Notification(title, { body, icon: '/icons/icon-192.png' });
      }
    } catch (e) {
      console.warn('[SmartNotify] Chat notification trigger notice:', e);
    }
    return;
  }

  // 3. Streak & Daily Coins: Gentle reminder
  if (category === 'STREAK_SAVER' || category === 'STUDY_PROGRESS') {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await getFcmServiceWorkerRegistration();
        showNotification(reg, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/favicon.svg',
          tag: 'streak-reminder',
          vibrate: [80],
          renotify: false,
          data: { url, category }
        });
      }
    } catch (e) {
      console.warn('[SmartNotify] Streak notification trigger notice:', e);
    }
  }
};

export const notifyStudyProgressMilestone = async (request: {
  recipientIds: string[];
  senderId?: string;
  milestone: 50 | 100;
  lessonTitle?: string;
}) => sendPushNotification({
  recipientIds: request.recipientIds,
  senderId: request.senderId,
  type: 'STUDY_PROGRESS',
  title: request.milestone === 100 ? '🎉 Study Target Complete!' : '⚡ 50% Study Progress',
  body: request.milestone === 100
    ? `${request.lessonTitle || 'Aaj ka lesson'} complete ho gaya. Great work!`
    : `${request.lessonTitle || 'Aaj ka lesson'} ka 50% progress complete ho gaya. Keep going!`,
  url: '/?open=routine',
});

export const notifyStudyRoomStartInBackground = async (request: {
  recipientIds: string[];
  senderId: string;
  senderName: string;
  roomName: string;
  url?: string;
}) => sendPushNotification({
  recipientIds: request.recipientIds.filter((id) => id !== request.senderId),
  senderId: request.senderId,
  senderName: request.senderName,
  type: 'STUDY_ROOM',
  title: '🟢 Study room live hai',
  body: `${request.senderName} ne "${request.roomName}" study room start kiya.`,
  url: request.url || '/?open=study-room',
});

// Evening Gentle Streak & Coin Saver Reminder
// Checks if current time is evening (after 6 PM) and reminder not already sent today
export const checkEveningStreakReminder = (user?: { streak?: number; streakClaimedToday?: boolean }) => {
  if (typeof window === 'undefined') return;

  const now = new Date();
  const currentHour = now.getHours();
  // Only trigger between 6 PM (18:00) and 10 PM (22:00)
  if (currentHour < 18 || currentHour > 22) return;

  const todayKey = `nst_streak_reminder_${now.toISOString().split('T')[0]}`;
  if (localStorage.getItem(todayKey)) return;

  // Mark as checked for today
  localStorage.setItem(todayKey, 'true');

  dispatchSmartNotification({
    title: '🔥 Streak Saver & Daily Coins!',
    body: `Aapka ${user?.streak || 1}-day streak tootne se bachayein! Aaj ke free daily coins collect karein.`,
    category: 'STREAK_SAVER',
    url: '/'
  });
};


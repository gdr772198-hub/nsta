import { VAPID_KEY, getFirebaseMessaging, db, rtdb } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';

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

    // Register / get Firebase Messaging service worker
    let swReg: ServiceWorkerRegistration;
    try {
      swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
    } catch (swErr) {
      console.warn('[NotificationManager] SW registration fallback:', swErr);
      swReg = await navigator.serviceWorker.ready;
    }

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
    // Save in RTDB
    const tokenRef = ref(rtdb, `users/${userId}/fcmToken`);
    await set(tokenRef, token).catch(() => {});

    // Save in user's token list for broadcast pushes
    const broadcastRef = ref(rtdb, `fcm_tokens/${userId}`);
    await set(broadcastRef, {
      token,
      updatedAt: new Date().toISOString(),
      platform: 'pwa'
    }).catch(() => {});

    // Save in Firestore
    const userDoc = doc(db, 'users', userId);
    await updateDoc(userDoc, { fcmToken: token }).catch(() => {});
  } catch (e) {
    console.warn('[NotificationManager] Token save non-fatal error:', e);
  }
};

export const getStoredFcmToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('nst_fcm_token');
};

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
            navigator.serviceWorker.ready.then((reg) => {
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

export type NotificationCategory = 'CHAT' | 'FRIEND_REQUEST' | 'STREAK' | 'DAILY_COIN' | 'COMMUNITY' | 'NOTE_UPDATE' | 'DEFAULT';

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

  // 1. Community & Notes Updates: Silent in-app update only. Never vibrate or spam the phone tray repeatedly.
  if (category === 'COMMUNITY' || category === 'NOTE_UPDATE') {
    console.log('[SmartNotify] Anti-Fatigue: Silent in-app notification for community/notes:', title);
    // Silent notification without loud vibration
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, {
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
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, {
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
  if (category === 'STREAK' || category === 'DAILY_COIN') {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, {
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
    category: 'STREAK',
    url: '/'
  });
};


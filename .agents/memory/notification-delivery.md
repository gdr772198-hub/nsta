---
name: Notification delivery
description: Durable constraints for NSTA browser push notifications and background delivery.
---

NSTA uses Firebase Cloud Messaging with a dedicated service-worker scope so the FCM worker does not replace the Workbox PWA worker. Foreground alerts can be verified without server credentials, but closed-app and lock-screen delivery requires Firebase Admin credentials in the API environment.

Recipient aliases must be sanitized before they are used in Realtime Database paths; email aliases can contain characters Firebase rejects even when UID aliases are valid.

**Why:** Direct-message delivery fans out across ID, UID, email, display ID, and mobile aliases, and one invalid alias can fail the whole token lookup batch.

**How to apply:** Normalize aliases at the notification API boundary using the same RTDB-key rules as the client, then apply per-user notification preferences before sending.

**Why:** Browser timers and foreground listeners cannot reliably run when the app is closed or the device is locked.

**How to apply:** Keep push payloads data-only, let the FCM worker render background notifications, respect per-user category preferences server-side, and never expose Firebase Admin credentials in source or client code.
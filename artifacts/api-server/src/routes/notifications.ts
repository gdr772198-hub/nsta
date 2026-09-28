import { Router, type IRouter, type Request } from "express";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { getMessaging } from "firebase-admin/messaging";

const router: IRouter = Router();

type FriendRequestBody = {
  recipientIds?: unknown;
  senderId?: unknown;
  senderName?: unknown;
  url?: unknown;
};

let adminApp: App | undefined;

function getFirebaseAdminApp(): App {
  if (adminApp) return adminApp;
  const existing = getApps()[0];
  if (existing) {
    adminApp = existing;
    return existing;
  }

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");
  }

  const serviceAccount = JSON.parse(rawServiceAccount) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };

  adminApp = initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
    }),
    databaseURL:
      process.env.FIREBASE_DATABASE_URL ||
      `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`,
  });
  return adminApp;
}

function bearerToken(req: Request): string | null {
  const header = req.header("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

router.post("/notifications/friend-request", async (req, res) => {
  const body = req.body as FriendRequestBody;
  const recipientIds = Array.isArray(body.recipientIds)
    ? [...new Set(body.recipientIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0))]
    : [];
  const senderId = typeof body.senderId === "string" ? body.senderId.trim() : "";
  const senderName = typeof body.senderName === "string" ? body.senderName.trim().slice(0, 120) : "";
  const url = typeof body.url === "string" && body.url.startsWith("/") ? body.url : "/";

  if (!recipientIds.length || !senderId || !senderName) {
    return res.status(400).json({ error: "recipientIds, senderId, and senderName are required" });
  }

  try {
    const app = getFirebaseAdminApp();
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: "Authentication required" });
    await getAuth(app).verifyIdToken(token);

    const database = getDatabase(app);
    const tokens = new Set<string>();
    for (const recipientId of recipientIds.slice(0, 20)) {
      const [direct, broadcast] = await Promise.all([
        database.ref(`users/${recipientId}/fcmToken`).get(),
        database.ref(`fcm_tokens/${recipientId}/token`).get(),
      ]);
      if (typeof direct.val() === "string" && direct.val()) tokens.add(direct.val());
      if (typeof broadcast.val() === "string" && broadcast.val()) tokens.add(broadcast.val());
    }

    if (!tokens.size) {
      return res.json({ sent: 0, reason: "recipient_has_no_push_token" });
    }

    const response = await getMessaging(app).sendEachForMulticast({
      tokens: [...tokens],
      data: {
        type: "FRIEND_REQUEST",
        title: "🤝 Nayi Friend Request!",
        body: `${senderName} ne aapko Nsta Messenger par friend request bheji hai.`,
        senderId,
        url,
      },
      webpush: {
        headers: {
          Urgency: "high",
          TTL: "86400",
        },
      },
    });

    req.log.info({ sent: response.successCount, failed: response.failureCount }, "Friend request push sent");
    return res.json({ sent: response.successCount, failed: response.failureCount });
  } catch (error) {
    req.log.error({ err: error }, "Friend request push failed");
    return res.status(503).json({ error: "Push service is not configured or unavailable" });
  }
});

export default router;
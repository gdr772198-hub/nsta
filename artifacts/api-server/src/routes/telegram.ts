import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "node:stream";

const router: IRouter = Router();

// 1. Storage Bot: Used for PDFs, videos, audio recordings & study vault
const DEFAULT_STORAGE_BOT_TOKEN = '8938213127:AAEjjjXmxjOuqpo5PP2TgorWOa17uYeD-Dw';
const DEFAULT_STORAGE_CHAT_ID = '7849468653';

// 2. Chat Bot & Channel: Used for NSTA Messenger & Community Chat sync
const DEFAULT_CHAT_BOT_TOKEN = '8932524192:AAGVxYSuKPZX6sOQFkXz0U7ESVQ2NcHmJZw';
const DEFAULT_CHAT_CHANNEL_ID = '-1004290996442';

function getStorageBotToken(): string {
  return (
    process.env.TELEGRAM_STORAGE_BOT_TOKEN?.trim() ||
    process.env.TELEGRAM_BOT_TOKEN?.trim() ||
    DEFAULT_STORAGE_BOT_TOKEN
  );
}

function getStorageChatId(): string {
  return (
    process.env.TELEGRAM_STORAGE_CHAT_ID?.trim() ||
    DEFAULT_STORAGE_CHAT_ID
  );
}

function getChatBotToken(): string {
  return (
    process.env.TELEGRAM_CHAT_BOT_TOKEN?.trim() ||
    DEFAULT_CHAT_BOT_TOKEN
  );
}

function getChatChannelId(): string {
  let raw = (
    process.env.TELEGRAM_CHAT_CHANNEL_ID?.trim() ||
    DEFAULT_CHAT_CHANNEL_ID
  ).trim();
  if (raw && !raw.startsWith('@') && !raw.startsWith('-100')) {
    const cleanNum = raw.replace(/^-+/, '');
    raw = cleanNum.startsWith('100') ? `-${cleanNum}` : `-100${cleanNum}`;
  }
  return raw;
}

const MIME_MAP: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
  flac: 'audio/flac',
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  json: 'application/json',
  txt: 'text/plain',
};

function guessMimeType(filePath: string, defaultType = 'application/octet-stream'): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return MIME_MAP[ext] || defaultType;
}

// 1. Healthcheck: GET /api/telegram/health
router.get("/health", async (_req: Request, res: Response) => {
  const storageBotToken = getStorageBotToken();
  const storageChatId = getStorageChatId();
  const chatBotToken = getChatBotToken();
  const chatChannelId = getChatChannelId();

  try {
    const [storageRes, chatRes] = await Promise.allSettled([
      fetch(`https://api.telegram.org/bot${storageBotToken}/getMe`).then((r) => r.json()),
      fetch(`https://api.telegram.org/bot${chatBotToken}/getMe`).then((r) => r.json()),
    ]);

    const storageJson = storageRes.status === 'fulfilled' ? storageRes.value : null;
    const chatJson = chatRes.status === 'fulfilled' ? chatRes.value : null;

    res.status(200).json({
      ok: Boolean(storageJson?.ok || chatJson?.ok),
      storageBot: {
        ok: Boolean(storageJson?.ok),
        bot: storageJson?.result,
        chatId: storageChatId,
      },
      chatBot: {
        ok: Boolean(chatJson?.ok),
        bot: chatJson?.result,
        channelId: chatChannelId,
      },
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Health check failed' });
  }
});

// 1b. Channel Info: GET /api/telegram/channelInfo
router.get("/channelInfo", async (req: Request, res: Response) => {
  const chatBotToken = getChatBotToken();
  const chatChannelId = getChatChannelId();
  const targetChatId = (req.query.chat_id as string) || chatChannelId;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${chatBotToken}/getChat?chat_id=${encodeURIComponent(targetChatId)}`);
    const tgJson = await tgRes.json();
    res.status(tgRes.ok && tgJson?.ok ? 200 : 502).json(tgJson);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Failed to fetch channel info' });
  }
});

// 1c. Send Message: POST /api/telegram/sendMessage
router.post("/sendMessage", async (req: Request, res: Response) => {
  const chatBotToken = getChatBotToken();
  const chatChannelId = getChatChannelId();

  try {
    const body = req.body || {};
    const targetChatId = body.chatId || body.chat_id || chatChannelId;
    const messageText = body.text || '';
    const parseMode = body.parse_mode || body.parseMode || 'HTML';

    if (!messageText) {
      res.status(400).json({ ok: false, error: 'Message text is required' });
      return;
    }

    const tgPayload: Record<string, any> = {
      chat_id: targetChatId,
      text: messageText,
      parse_mode: parseMode,
    };
    if (body.reply_to_message_id) {
      tgPayload.reply_to_message_id = body.reply_to_message_id;
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${chatBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tgPayload),
    });

    const tgJson = await tgRes.json();
    res.status(tgRes.ok && tgJson?.ok ? 200 : 400).json(tgJson);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Failed to send message to Telegram' });
  }
});

// 1d. Get Updates / Messages: GET /api/telegram/messages
router.get("/messages", async (req: Request, res: Response) => {
  const chatBotToken = getChatBotToken();
  try {
    const limit = (req.query.limit as string) || '50';
    const offset = (req.query.offset as string) || '-50';
    const tgRes = await fetch(`https://api.telegram.org/bot${chatBotToken}/getUpdates?offset=${offset}&limit=${limit}&allowed_updates=${encodeURIComponent(JSON.stringify(['message', 'channel_post']))}`);
    const tgJson = await tgRes.json();
    res.status(tgRes.ok && tgJson?.ok ? 200 : 502).json(tgJson);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Failed to fetch updates from Telegram' });
  }
});

// 2. Upload: POST /api/telegram/upload
router.post("/upload", async (req: Request, res: Response) => {
  const storageBotToken = getStorageBotToken();
  const storageChatId = getStorageChatId();
  const chatBotToken = getChatBotToken();
  const chatChannelId = getChatChannelId();

  try {
    let targetChatId = storageChatId;
    let caption = '';
    let fileBlob: Blob | null = null;
    let fileName = 'file';
    let uploadBotToken = storageBotToken;

    if (req.is('application/json')) {
      const json = req.body || {};
      if (json.chatId) targetChatId = String(json.chatId);
      if (json.caption) caption = String(json.caption);
      if (json.fileName) fileName = String(json.fileName);
      if (json.bot === 'chat' || targetChatId === chatChannelId) {
        uploadBotToken = chatBotToken;
      }

      const dataStr: string = json.data || json.file || '';
      if (!dataStr) {
        res.status(400).json({ ok: false, error: 'No file data found in JSON payload' });
        return;
      }

      const mimeMatch = dataStr.match(/^data:([^;]+);base64,/);
      const mimeType = json.mimeType || (mimeMatch ? mimeMatch[1] : guessMimeType(fileName));
      const rawBase64 = dataStr.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(rawBase64, 'base64');
      fileBlob = new Blob([buffer], { type: mimeType });
    } else {
      // Multipart
      const webReq = new Request('http://localhost' + req.originalUrl, {
        method: 'POST',
        headers: req.headers as HeadersInit,
        body: Readable.toWeb(req),
        duplex: 'half',
      });
      const formData = await webReq.formData();

      if (formData.get('chat_id')) targetChatId = String(formData.get('chat_id'));
      if (formData.get('chatId')) targetChatId = String(formData.get('chatId'));
      if (formData.get('caption')) caption = String(formData.get('caption'));
      if (formData.get('bot') === 'chat' || targetChatId === chatChannelId) {
        uploadBotToken = chatBotToken;
      }

      const fileEntry =
        formData.get('document') ||
        formData.get('file') ||
        formData.get('photo') ||
        formData.get('video') ||
        formData.get('audio');

      if (!fileEntry || !(fileEntry instanceof Blob)) {
        res.status(400).json({ ok: false, error: 'No file found in multipart upload' });
        return;
      }

      fileBlob = fileEntry;
      fileName = (fileEntry as any).name || (formData.get('fileName') as string) || 'upload';
    }

    const tgFormData = new FormData();
    tgFormData.append('chat_id', targetChatId);
    if (caption) tgFormData.append('caption', caption);
    tgFormData.append('document', fileBlob, fileName);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    const tgRes = await fetch(`https://api.telegram.org/bot${uploadBotToken}/sendDocument`, {
      method: 'POST',
      body: tgFormData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const rawTgText = await tgRes.text();
    let tgJson: any = null;
    try {
      tgJson = rawTgText ? JSON.parse(rawTgText) : null;
    } catch {}

    if (!tgJson || !tgJson.ok) {
      res.status(tgRes.ok ? 400 : 502).json({ ok: false, error: tgJson?.description || `Telegram Bot API error (${tgRes.status})` });
      return;
    }

    const doc =
      tgJson.result?.document ||
      (Array.isArray(tgJson.result?.photo) ? tgJson.result.photo.slice(-1)[0] : null) ||
      tgJson.result?.audio ||
      tgJson.result?.video;

    const fileId = doc?.file_id;
    if (!fileId) {
      res.status(502).json({ ok: false, error: 'No file_id returned from Telegram' });
      return;
    }

    let filePath = '';
    try {
      const pathRes = await fetch(`https://api.telegram.org/bot${uploadBotToken}/getFile?file_id=${fileId}`);
      const rawPathText = await pathRes.text();
      const pathJson = rawPathText ? JSON.parse(rawPathText) : null;
      if (pathJson?.ok && pathJson.result?.file_path) {
        filePath = pathJson.result.file_path;
      }
    } catch {}

    const resolvedFileName = doc?.file_name || fileName;
    const proxyUrl = `/api/telegram/file?path=${encodeURIComponent(filePath)}&name=${encodeURIComponent(resolvedFileName)}`;
    const directUrl = filePath ? `https://api.telegram.org/file/bot${uploadBotToken}/${filePath}` : '';

    res.status(200).json({
      ok: true,
      url: proxyUrl,
      directUrl,
      fileId,
      filePath,
      fileName: resolvedFileName,
      fileSize: doc?.file_size,
      mimeType: doc?.mime_type || guessMimeType(filePath),
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Server upload processing failed' });
  }
});

// 3. File streaming proxy: GET /api/telegram/file
router.get("/file", async (req: Request, res: Response) => {
  const storageBotToken = getStorageBotToken();
  const chatBotToken = getChatBotToken();

  try {
    let filePath = (req.query.path as string) || '';
    const fileId = (req.query.file_id as string) || '';
    const legacyUrl = (req.query.url as string) || '';

    if (legacyUrl) {
      const match = legacyUrl.match(/\/file\/bot[^/]+\/(.+)$/);
      if (match && match[1]) {
        filePath = decodeURIComponent(match[1]);
      }
    }

    if (!filePath && fileId) {
      try {
        let pathRes = await fetch(`https://api.telegram.org/bot${storageBotToken}/getFile?file_id=${fileId}`);
        let rawPath = await pathRes.text();
        let pathJson = rawPath ? JSON.parse(rawPath) : null;
        if (!pathJson?.ok) {
          pathRes = await fetch(`https://api.telegram.org/bot${chatBotToken}/getFile?file_id=${fileId}`);
          rawPath = await pathRes.text();
          pathJson = rawPath ? JSON.parse(rawPath) : null;
        }
        if (pathJson?.ok && pathJson.result?.file_path) {
          filePath = pathJson.result.file_path;
        }
      } catch {}
    }

    if (!filePath) {
      res.status(400).json({ ok: false, error: 'Missing path or file_id query parameter' });
      return;
    }

    const headersToForward: Record<string, string> = {};
    if (req.headers.range) {
      headersToForward['Range'] = req.headers.range as string;
    }

    // Try storage bot first, fallback to chat bot if not found
    let tgFileRes = await fetch(`https://api.telegram.org/file/bot${storageBotToken}/${filePath}`, {
      headers: headersToForward,
    });

    if (!tgFileRes.ok && tgFileRes.status !== 206) {
      const altFileRes = await fetch(`https://api.telegram.org/file/bot${chatBotToken}/${filePath}`, {
        headers: headersToForward,
      });
      if (altFileRes.ok || altFileRes.status === 206) {
        tgFileRes = altFileRes;
      }
    }

    if (!tgFileRes.ok && tgFileRes.status !== 206) {
      res.status(tgFileRes.status).json({ ok: false, error: `Telegram CDN returned status ${tgFileRes.status}` });
      return;
    }

    const customName = (req.query.name as string) || filePath.split('/').pop() || 'file';
    const guessedMime = guessMimeType(customName, guessMimeType(filePath));
    const mime = tgFileRes.headers.get('content-type') || guessedMime;

    res.status(tgFileRes.status);
    res.setHeader('Content-Type', mime);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const cl = tgFileRes.headers.get('content-length');
    if (cl) res.setHeader('Content-Length', cl);

    const cr = tgFileRes.headers.get('content-range');
    if (cr) res.setHeader('Content-Range', cr);

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    if (tgFileRes.body) {
      Readable.fromWeb(tgFileRes.body as any).pipe(res);
    } else {
      res.end();
    }
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'File streaming failed' });
  }
});

export default router;

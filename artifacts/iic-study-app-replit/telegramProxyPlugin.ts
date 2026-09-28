import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

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
    process.env.VITE_TELEGRAM_BOT_TOKEN?.trim() ||
    DEFAULT_STORAGE_BOT_TOKEN
  );
}

function getStorageChatId(): string {
  return (
    process.env.TELEGRAM_STORAGE_CHAT_ID?.trim() ||
    process.env.VITE_TELEGRAM_STORAGE_CHAT_ID?.trim() ||
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
  return (
    process.env.TELEGRAM_CHAT_CHANNEL_ID?.trim() ||
    DEFAULT_CHAT_CHANNEL_ID
  );
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

export async function handleTelegramMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
): Promise<void> {
  const rawUrl = req.url || '';
  if (!rawUrl.startsWith('/api/telegram')) {
    return next();
  }

  // Set permissive CORS headers for all /api/telegram routes
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const parsedUrl = new URL(rawUrl, 'http://localhost');
  const pathname = parsedUrl.pathname;

  const storageBotToken = getStorageBotToken();
  const storageChatId = getStorageChatId();
  const chatBotToken = getChatBotToken();
  const chatChannelId = getChatChannelId();

  // 1. Healthcheck: GET /api/telegram/health
  if (pathname === '/api/telegram/health') {
    try {
      const [storageRes, chatRes] = await Promise.allSettled([
        fetch(`https://api.telegram.org/bot${storageBotToken}/getMe`).then((r) => r.json()),
        fetch(`https://api.telegram.org/bot${chatBotToken}/getMe`).then((r) => r.json()),
      ]);

      const storageJson = storageRes.status === 'fulfilled' ? storageRes.value : null;
      const chatJson = chatRes.status === 'fulfilled' ? chatRes.value : null;

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
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
        })
      );
      return;
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: err?.message || 'Health check failed' }));
      return;
    }
  }

  // 1b. Channel Info: GET /api/telegram/channelInfo
  if (pathname === '/api/telegram/channelInfo') {
    try {
      const targetChatId = parsedUrl.searchParams.get('chat_id') || chatChannelId;
      const tgRes = await fetch(`https://api.telegram.org/bot${chatBotToken}/getChat?chat_id=${encodeURIComponent(targetChatId)}`);
      const tgJson = await tgRes.json();
      res.statusCode = tgRes.ok && tgJson?.ok ? 200 : 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(tgJson));
      return;
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: err?.message || 'Failed to fetch channel info' }));
      return;
    }
  }

  // 1c. Send Message: POST /api/telegram/sendMessage
  if (pathname === '/api/telegram/sendMessage') {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const bodyStr = Buffer.concat(chunks).toString('utf8');
      const body = JSON.parse(bodyStr || '{}');

      const targetChatId = body.chatId || body.chat_id || chatChannelId;
      const messageText = body.text || '';
      const parseMode = body.parse_mode || body.parseMode || 'HTML';

      if (!messageText) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'Message text is required' }));
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
      res.statusCode = tgRes.ok && tgJson?.ok ? 200 : 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(tgJson));
      return;
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: err?.message || 'Failed to send message to Telegram' }));
      return;
    }
  }

  // 1d. Get Updates / Messages: GET /api/telegram/messages
  if (pathname === '/api/telegram/messages' || pathname === '/api/telegram/updates') {
    try {
      const limit = parsedUrl.searchParams.get('limit') || '50';
      const offset = parsedUrl.searchParams.get('offset') || '-50';
      const tgRes = await fetch(`https://api.telegram.org/bot${chatBotToken}/getUpdates?offset=${offset}&limit=${limit}&allowed_updates=${encodeURIComponent(JSON.stringify(['message', 'channel_post']))}`);
      const tgJson = await tgRes.json();

      res.statusCode = tgRes.ok && tgJson?.ok ? 200 : 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(tgJson));
      return;
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: err?.message || 'Failed to fetch updates from Telegram' }));
      return;
    }
  }

  // 2. Upload: POST /api/telegram/upload
  if (pathname === '/api/telegram/upload' || pathname === '/api/telegram/upload/') {
    if (req.method !== 'POST') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, message: 'NSTA Telegram Storage Upload endpoint active (use POST multipart/form-data)' }));
      return;
    }
    try {
      const contentType = req.headers['content-type'] || '';
      let targetChatId = storageChatId;
      let caption = '';
      let fileBlob: Blob | null = null;
      let fileName = 'file';
      let uploadBotToken = storageBotToken;

      if (contentType.includes('application/json')) {
        // Handle JSON payload with base64 data / dataURL
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const bodyStr = Buffer.concat(chunks).toString('utf8');
        const json = JSON.parse(bodyStr);

        if (json.chatId) targetChatId = String(json.chatId);
        if (json.caption) caption = String(json.caption);
        if (json.fileName) fileName = String(json.fileName);
        if (json.bot === 'chat' || targetChatId === chatChannelId) {
          uploadBotToken = chatBotToken;
        }

        const dataStr: string = json.data || json.file || '';
        if (!dataStr) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'No file data found in JSON payload' }));
          return;
        }

        const mimeMatch = dataStr.match(/^data:([^;]+);base64,/);
        const mimeType = json.mimeType || (mimeMatch ? mimeMatch[1] : guessMimeType(fileName));
        const rawBase64 = dataStr.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(rawBase64, 'base64');
        fileBlob = new Blob([buffer], { type: mimeType });
      } else {
        // Handle multipart/form-data natively via Node 22 Readable.toWeb
        const webReq = new Request('http://localhost' + rawUrl, {
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
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'No file found in multipart upload' }));
          return;
        }

        fileBlob = fileEntry;
        fileName = (fileEntry as any).name || (formData.get('fileName') as string) || 'upload';
      }

      // Check Telegram 50MB Bot API limit
      const MAX_TELEGRAM_BOT_SIZE = 50 * 1024 * 1024;
      if (fileBlob.size > MAX_TELEGRAM_BOT_SIZE) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            ok: false,
            error: `File size ${(fileBlob.size / (1024 * 1024)).toFixed(1)}MB hai. Telegram Bot API limit 50MB hai. Kripya 50MB se chhota file chunein.`
          })
        );
        return;
      }

      // Forward to Telegram Bot API sendDocument
      const tgFormData = new FormData();
      tgFormData.append('chat_id', targetChatId);
      if (caption) tgFormData.append('caption', caption);
      tgFormData.append('document', fileBlob, fileName);

      const controller = new AbortController();
      // 5 minutes (300,000ms) timeout to give large video/PDF uploads sufficient time
      const timeoutId = setTimeout(() => {
        try {
          controller.abort(new Error('Telegram API upload timed out after 5 minutes'));
        } catch {
          controller.abort();
        }
      }, 300000);

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
        res.statusCode = tgRes.ok ? 400 : 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            ok: false,
            error: tgJson?.description || `Telegram Bot API error (${tgRes.status})`,
          })
        );
        return;
      }

      const doc =
        tgJson.result?.document ||
        (Array.isArray(tgJson.result?.photo) ? tgJson.result.photo.slice(-1)[0] : null) ||
        tgJson.result?.audio ||
        tgJson.result?.video;

      const fileId = doc?.file_id;
      if (!fileId) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'No file_id returned from Telegram' }));
        return;
      }

      // Resolve file_path from Telegram CDN
      let filePath = '';
      try {
        const pathRes = await fetch(`https://api.telegram.org/bot${uploadBotToken}/getFile?file_id=${fileId}`);
        const rawPathText = await pathRes.text();
        const pathJson = rawPathText ? JSON.parse(rawPathText) : null;
        if (pathJson?.ok && pathJson.result?.file_path) {
          filePath = pathJson.result.file_path;
        }
      } catch (pathErr) {
        console.warn('[Telegram Proxy] getFile resolution warning:', pathErr);
      }

      const resolvedFileName = doc?.file_name || fileName;
      const proxyUrl = `/api/telegram/file?path=${encodeURIComponent(filePath)}&name=${encodeURIComponent(resolvedFileName)}`;
      const directUrl = filePath ? `https://api.telegram.org/file/bot${uploadBotToken}/${filePath}` : '';

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          ok: true,
          url: proxyUrl,
          directUrl,
          fileId,
          filePath,
          fileName: resolvedFileName,
          fileSize: doc?.file_size,
          mimeType: doc?.mime_type || guessMimeType(filePath),
        })
      );
      return;
    } catch (err: any) {
      console.error('[Telegram Storage Proxy] Upload error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      let errMsg = err?.message || 'Server upload processing failed';
      if (err?.name === 'AbortError' || errMsg.toLowerCase().includes('aborted')) {
        errMsg = 'Telegram upload time limit exceed ho gaya (slow network). Kripya dobara koshish karein ya chhota file upload karein.';
      }
      res.end(JSON.stringify({ ok: false, error: errMsg }));
      return;
    }
  }

  // 3. File Proxy: GET / HEAD /api/telegram/file
  if ((pathname === '/api/telegram/file' || pathname === '/api/telegram/file/') && (req.method === 'GET' || req.method === 'HEAD')) {
    try {
      let filePath = parsedUrl.searchParams.get('path') || '';
      const fileId = parsedUrl.searchParams.get('file_id') || '';
      const legacyUrl = parsedUrl.searchParams.get('url') || '';

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
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'Missing path or file_id query parameter' }));
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
        res.statusCode = tgFileRes.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: `Telegram CDN returned status ${tgFileRes.status}` }));
        return;
      }

      res.statusCode = tgFileRes.status;

      const customName = parsedUrl.searchParams.get('name') || filePath.split('/').pop() || 'file';
      const guessedMime = guessMimeType(customName, guessMimeType(filePath));
      const mime = tgFileRes.headers.get('content-type') || guessedMime;

      res.setHeader('Content-Type', mime);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

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
      return;
    } catch (err: any) {
      console.error('[Telegram File Proxy] Streaming error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: err?.message || 'File streaming failed' }));
      return;
    }
  }

  next();
}

export function telegramProxyPlugin(): Plugin {
  return {
    name: 'telegram-storage-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        handleTelegramMiddleware(req, res, next).catch((err) => {
          console.error('[Telegram Middleware Error]', err);
          next();
        });
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        handleTelegramMiddleware(req, res, next).catch((err) => {
          console.error('[Telegram Preview Middleware Error]', err);
          next();
        });
      });
    },
  };
}

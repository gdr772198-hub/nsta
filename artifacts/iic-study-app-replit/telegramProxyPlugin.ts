import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

const DEFAULT_BOT_TOKEN = '8938213127:AAEjjjXmxjOuqpo5PP2TgorWOa17uYeD-Dw';
const DEFAULT_STORAGE_CHAT_ID = '7849468653';

function getBotToken(): string {
  return (
    process.env.TELEGRAM_BOT_TOKEN?.trim() ||
    process.env.VITE_TELEGRAM_BOT_TOKEN?.trim() ||
    DEFAULT_BOT_TOKEN
  );
}

function getStorageChatId(): string {
  return (
    process.env.TELEGRAM_STORAGE_CHAT_ID?.trim() ||
    process.env.VITE_TELEGRAM_STORAGE_CHAT_ID?.trim() ||
    DEFAULT_STORAGE_CHAT_ID
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

  const botToken = getBotToken();
  const defaultChatId = getStorageChatId();

  // 1. Healthcheck: GET /api/telegram/health
  if (pathname === '/api/telegram/health') {
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const tgJson = await tgRes.json();
      res.statusCode = tgRes.ok && tgJson.ok ? 200 : 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          ok: tgJson.ok,
          bot: tgJson.result,
          storageChatId: defaultChatId,
          configuredToken: botToken.slice(0, 10) + '...',
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

  // 2. Upload: POST /api/telegram/upload
  if (pathname === '/api/telegram/upload' && req.method === 'POST') {
    try {
      const contentType = req.headers['content-type'] || '';
      let targetChatId = defaultChatId;
      let caption = '';
      let fileBlob: Blob | null = null;
      let fileName = 'file';

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

      // Forward to Telegram Bot API sendDocument
      const tgFormData = new FormData();
      tgFormData.append('chat_id', targetChatId);
      if (caption) tgFormData.append('caption', caption);
      tgFormData.append('document', fileBlob, fileName);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for larger uploads

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
        method: 'POST',
        body: tgFormData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const tgJson = await tgRes.json();
      if (!tgJson.ok) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: tgJson.description || 'Telegram Bot API error' }));
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
      const pathRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      const pathJson = await pathRes.json();
      const filePath = pathJson.result?.file_path || '';

      const resolvedFileName = doc?.file_name || fileName;
      const proxyUrl = `/api/telegram/file?path=${encodeURIComponent(filePath)}&name=${encodeURIComponent(resolvedFileName)}`;
      const directUrl = filePath ? `https://api.telegram.org/file/bot${botToken}/${filePath}` : '';

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
      res.end(JSON.stringify({ ok: false, error: err?.message || 'Server upload processing failed' }));
      return;
    }
  }

  // 3. File Proxy: GET / HEAD /api/telegram/file
  if (pathname === '/api/telegram/file' && (req.method === 'GET' || req.method === 'HEAD')) {
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
        const pathRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const pathJson = await pathRes.json();
        if (pathJson.ok && pathJson.result?.file_path) {
          filePath = pathJson.result.file_path;
        }
      }

      if (!filePath) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'Missing path or file_id query parameter' }));
        return;
      }

      const telegramCdnUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

      const headersToForward: Record<string, string> = {};
      if (req.headers.range) {
        headersToForward['Range'] = req.headers.range as string;
      }

      const tgFileRes = await fetch(telegramCdnUrl, {
        headers: headersToForward,
      });

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
      console.error('[Telegram Storage Proxy] File stream error:', err);
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

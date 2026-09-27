/**
 * Telegram Cloud Storage Service for NSTA
 * Unlimited Free Cloud Media Storage powered by Telegram Bot (@nsta_vault_bot)
 *
 * Supported features:
 * - Profile pictures & App loading screens
 * - NSTA Messenger (photos, documents, voice notes)
 * - NSTA Status (stories & media)
 * - Community Feed posts, images & videos
 * - Lecture PDFs, Audios & Videos
 * - Admin roadmap & media managers
 *
 * Architecture:
 * - Browser sends upload to internal secure proxy endpoint: /api/telegram/upload
 * - Telegram Bot Token is kept safely on server-side (never leaked in browser/URLs)
 * - Files are served via /api/telegram/file with full CORS, Range requests & caching
 */

export const DEFAULT_STORAGE_CHAT_ID = '7849468653'; // Verified Telegram chat ID
const STORAGE_CHAT_KEY = 'nst_telegram_storage_chat_id';

export interface TelegramUploadResult {
  url: string;
  fileId: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  directUrl?: string;
}

export interface UploadOptions {
  fileName?: string;
  caption?: string;
  type?: 'image' | 'video' | 'audio' | 'pdf' | 'document';
  chatId?: string;
  timeoutMs?: number;
  onProgress?: (percent: number) => void;
}

/**
 * Gets currently active storage chat ID
 */
export const getTelegramStorageChatId = (): string => {
  return localStorage.getItem(STORAGE_CHAT_KEY) || DEFAULT_STORAGE_CHAT_ID;
};

/**
 * Sets custom storage channel/chat ID
 */
export const setTelegramStorageChatId = (chatId: string) => {
  if (chatId) {
    localStorage.setItem(STORAGE_CHAT_KEY, chatId.trim());
  }
};

/**
 * Converts a base64 Data URL or string to a Blob
 */
function dataUrlToBlob(dataUrl: string, defaultMime = 'image/jpeg'): Blob {
  const parts = dataUrl.split(';base64,');
  const mime = parts[0]?.replace('data:', '') || defaultMime;
  const byteString = atob(parts[1] || parts[0]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

/**
 * Checks if a URL is a direct Telegram CDN link and converts it to our safe proxy URL.
 * Prevents CORS blocking, token exposure, and Range request issues in media players.
 */
export function resolveTelegramUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  const trimmed = rawUrl.trim();

  // If already our safe internal proxy URL, keep it
  if (trimmed.startsWith('/api/telegram/file')) {
    return trimmed;
  }

  // If it's a direct Telegram bot file URL (https://api.telegram.org/file/bot<TOKEN>/<PATH>)
  if (trimmed.includes('api.telegram.org/file/bot')) {
    const match = trimmed.match(/\/file\/bot[^/]+\/(.+)$/);
    if (match && match[1]) {
      const filePath = match[1];
      const fileName = filePath.split('/').pop() || 'media';
      return `/api/telegram/file?path=${encodeURIComponent(filePath)}&name=${encodeURIComponent(fileName)}`;
    }
  }

  return trimmed;
}

/**
 * Checks Telegram Storage server proxy health and connectivity
 */
export async function checkTelegramStorageHealth(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('/api/telegram/health');
    const rawText = await res.text();
    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {}

    if (!res.ok || !data) {
      return { ok: false, message: `Server returned status ${res.status}` };
    }
    return {
      ok: Boolean(data?.ok),
      message: data?.ok ? `Connected to @${data.bot?.username || 'Telegram Bot'}` : data?.error || 'Bot offline',
    };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to reach Telegram proxy' };
  }
}

/**
 * Primary universal upload function: Uploads any media or file to Telegram Cloud Storage.
 * Uses the secure server proxy /api/telegram/upload without exposing bot credentials.
 */
export async function uploadToTelegramStorage(
  fileInput: File | Blob | string,
  options?: UploadOptions | string
): Promise<TelegramUploadResult> {
  const opts: UploadOptions = typeof options === 'string' ? { caption: options } : options || {};
  const targetChatId = opts.chatId || getTelegramStorageChatId();

  let blob: Blob;
  let fileName = opts.fileName || 'file';

  if (typeof fileInput === 'string') {
    if (fileInput.startsWith('data:')) {
      const mimeMatch = fileInput.match(/^data:([^;]+);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      blob = dataUrlToBlob(fileInput, mime);
      if (!opts.fileName) {
        const ext = mime.split('/')[1] || 'jpg';
        fileName = `upload_${Date.now()}.${ext}`;
      }
    } else {
      throw new Error('Invalid string format for file upload (must be a data: URL)');
    }
  } else if (fileInput instanceof File) {
    blob = fileInput;
    fileName = fileInput.name || fileName;
  } else {
    blob = fileInput;
  }

  // Check 50MB Telegram cloud storage limit
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  if (blob.size > MAX_FILE_SIZE) {
    const sizeMb = (blob.size / (1024 * 1024)).toFixed(1);
    throw new Error(`File size ${sizeMb}MB hai. Telegram cloud storage limit 50MB hai. Kripya 50MB se chhota video/file upload karein.`);
  }

  const formData = new FormData();
  formData.append('chat_id', targetChatId);
  if (opts.caption) {
    formData.append('caption', opts.caption);
  }
  formData.append('fileName', fileName);
  formData.append('document', blob, fileName);

  const isLarge = blob.size > 2 * 1024 * 1024;
  // 5 minutes (300,000ms) for large files/videos, 2 minutes (120,000ms) for small files
  const timeoutMs = opts.timeoutMs || (isLarge ? 300000 : 120000);

  // Use XMLHttpRequest in browser for true continuous progress tracking and clean timeouts
  if (typeof XMLHttpRequest !== 'undefined') {
    return new Promise<TelegramUploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.timeout = timeoutMs;

      if (opts.onProgress) {
        opts.onProgress(5);
      }

      if (xhr.upload && opts.onProgress) {
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable && evt.total > 0) {
            const pct = Math.min(95, Math.max(5, Math.round((evt.loaded / evt.total) * 95)));
            opts.onProgress!(pct);
          }
        };
      }

      xhr.onload = () => {
        let data: any = null;
        try {
          data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch {}

        if (xhr.status >= 200 && xhr.status < 300 && data && data.ok) {
          if (opts.onProgress) opts.onProgress(100);

          resolve({
            url: data.url,
            fileId: data.fileId,
            fileName: data.fileName || fileName,
            fileSize: data.fileSize || blob.size,
            mimeType: data.mimeType,
            directUrl: data.directUrl,
          });
        } else {
          let errDetail = data?.error;
          if (!errDetail) {
            if (xhr.status === 413) {
              errDetail = 'File size limit exceed ho gayi (max 50MB). Kripya chhota file chunein.';
            } else if (xhr.status === 502 || xhr.status === 504) {
              errDetail = 'Storage server se sampark nahi ho saka. Kripya thodi der baad dobara koshish karein.';
            } else {
              errDetail = `Upload fail ho gaya (Status: ${xhr.status})`;
            }
          }
          reject(new Error(errDetail));
        }
      };

      xhr.onerror = () => {
        console.error('[Telegram Storage Service] Network connection error');
        reject(new Error('Network error: server se connect nahi ho paya. Kripya apna internet connection check karein.'));
      };

      xhr.ontimeout = () => {
        console.error(`[Telegram Storage Service] Upload timed out after ${timeoutMs}ms`);
        reject(new Error(`Upload time limit exceed ho gaya (${Math.round(timeoutMs / 1000)}s). Kripya chhota video chunein ya internet speed check karein.`));
      };

      xhr.onabort = () => {
        console.warn('[Telegram Storage Service] Upload aborted');
        reject(new Error('Upload cancel ho gaya.'));
      };

      xhr.open('POST', '/api/telegram/upload', true);
      xhr.send(formData);
    });
  }

  // Fallback for non-browser environments: Fetch with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort(new Error(`Upload timed out after ${timeoutMs}ms`));
    } catch {
      controller.abort();
    }
  }, timeoutMs);

  try {
    if (opts.onProgress) opts.onProgress(20);

    const res = await fetch('/api/telegram/upload', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (opts.onProgress) opts.onProgress(85);

    const rawText = await res.text();
    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {}

    if (!res.ok || !data || !data.ok) {
      let errDetail = data?.error;
      if (!errDetail) {
        if (res.status === 413) {
          errDetail = 'File size limit exceed ho gayi (max 50MB). Kripya chhota file chunein.';
        } else if (res.status === 502 || res.status === 504) {
          errDetail = 'Storage server temporarily busy hai. Kripya thodi der baad dobara try karein.';
        } else {
          errDetail = `Upload server response error (${res.status})`;
        }
      }
      throw new Error(errDetail);
    }

    if (opts.onProgress) opts.onProgress(100);

    return {
      url: data.url,
      fileId: data.fileId,
      fileName: data.fileName || fileName,
      fileSize: data.fileSize || blob.size,
      mimeType: data.mimeType,
      directUrl: data.directUrl,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('[Telegram Storage Service] Upload failed:', err);
    let errMsg = err?.message || 'Telegram upload fail ho gaya. Kripya network check karke dobara koshish karein.';
    if (err?.name === 'AbortError' || errMsg.toLowerCase().includes('aborted')) {
      errMsg = 'Upload time limit exceed ho gaya (slow network). Kripya dobara try karein ya chhota file upload karein.';
    }
    throw new Error(errMsg);
  }
}

/**
 * Uploads an image directly to Telegram Cloud and returns the proxy CDN URL
 */
export async function uploadImageToTelegram(
  file: File | Blob | string,
  fileName?: string,
  caption = 'NSTA Media'
): Promise<string> {
  const result = await uploadToTelegramStorage(file, {
    fileName: fileName || `image_${Date.now()}.jpg`,
    caption,
    type: 'image',
  });
  return result.url;
}

/**
 * Uploads a PDF directly to Telegram Cloud and returns the proxy CDN URL
 */
export async function uploadPdfToTelegram(
  file: File | Blob,
  fileName?: string,
  caption = 'NSTA Lecture PDF'
): Promise<string> {
  const result = await uploadToTelegramStorage(file, {
    fileName: fileName || `document_${Date.now()}.pdf`,
    caption,
    type: 'pdf',
  });
  return result.url;
}

/**
 * Uploads an Audio file directly to Telegram Cloud and returns the proxy CDN URL
 */
export async function uploadAudioToTelegram(
  file: File | Blob,
  fileName?: string,
  caption = 'NSTA Audio Lecture'
): Promise<string> {
  const result = await uploadToTelegramStorage(file, {
    fileName: fileName || `audio_${Date.now()}.mp3`,
    caption,
    type: 'audio',
  });
  return result.url;
}

/**
 * Uploads a Video file directly to Telegram Cloud with progress callback and returns the proxy CDN URL
 */
export async function uploadVideoToTelegram(
  file: File | Blob,
  fileName?: string,
  caption = 'NSTA Video Lecture',
  onProgress?: (percent: number) => void
): Promise<string> {
  const result = await uploadToTelegramStorage(file, {
    fileName: fileName || (file instanceof File ? file.name : `video_${Date.now()}.mp4`),
    caption,
    type: 'video',
    onProgress,
  });
  return result.url;
}

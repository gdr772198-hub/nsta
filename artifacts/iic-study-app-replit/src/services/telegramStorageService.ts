/**
 * Telegram Cloud Storage Service for NSTA
 * Unlimited Free Cloud Media Storage powered by Telegram Bot (@nsta_vault_bot)
 *
 * Supported features:
 * - Profile pictures & App loading screens
 * - NSTA Messenger (photos, documents, voice notes)
 * - NSTA Status (stories & media)
 * - Community Feed posts & images
 * - Lecture PDFs, Audios & Videos
 */

export const TELEGRAM_BOT_TOKEN = '8938213127:AAEjjjXmxjOuqpo5PP2TgorWOa17uYeD-Dw';
export const DEFAULT_STORAGE_CHAT_ID = '7849468653'; // Nadim's verified Telegram chat ID
const STORAGE_CHAT_KEY = 'nst_telegram_storage_chat_id';

export interface TelegramUploadResult {
  url: string;
  fileId: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

/**
 * Gets currently active storage chat ID (defaults to Nadim's verified chat ID)
 */
export const getTelegramStorageChatId = (): string => {
  return localStorage.getItem(STORAGE_CHAT_KEY) || DEFAULT_STORAGE_CHAT_ID;
};

/**
 * Sets custom storage channel/chat ID (e.g., if user configures a dedicated channel later)
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

export interface UploadOptions {
  fileName?: string;
  caption?: string;
  type?: 'image' | 'video' | 'audio' | 'pdf' | 'document';
}

/**
 * Uploads any media or file to Telegram Cloud Storage and returns a direct permanent CDN URL.
 */
export async function uploadToTelegramStorage(
  fileInput: File | Blob | string,
  options?: UploadOptions | string
): Promise<TelegramUploadResult> {
  const opts: UploadOptions = typeof options === 'string' ? { caption: options } : options || {};
  const targetChatId = getTelegramStorageChatId();

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
      throw new Error('Invalid string format for file upload');
    }
  } else if (fileInput instanceof File) {
    blob = fileInput;
    fileName = fileInput.name || fileName;
  } else {
    blob = fileInput;
  }

  const formData = new FormData();
  formData.append('chat_id', targetChatId);
  if (opts.caption) {
    formData.append('caption', opts.caption);
  }

  // sendDocument preserves exact byte-for-byte resolution and quality
  formData.append('document', blob, fileName);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
    method: 'POST',
    body: formData,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description || 'Telegram media upload failed');
  }

  const doc =
    data.result?.document ||
    (Array.isArray(data.result?.photo) ? data.result.photo.slice(-1)[0] : null) ||
    data.result?.audio ||
    data.result?.video;

  const fileId = doc?.file_id;
  if (!fileId) {
    throw new Error('Telegram se file_id prapt nahi hui');
  }

  // Retrieve permanent download path from Telegram CDN
  const fileRes = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
  );
  const fileData = await fileRes.json();
  if (!fileData.ok || !fileData.result?.file_path) {
    throw new Error('Telegram file path resolve failed: ' + (fileData.description || ''));
  }

  const directUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;

  return {
    url: directUrl,
    fileId,
    fileName: doc?.file_name || fileName,
    fileSize: doc?.file_size,
    mimeType: doc?.mime_type,
  };
}

/**
 * Uploads an image directly to Telegram Cloud and returns the direct CDN URL
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
 * Uploads a PDF directly to Telegram Cloud and returns the direct CDN URL
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
 * Uploads an Audio file directly to Telegram Cloud and returns the direct CDN URL
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

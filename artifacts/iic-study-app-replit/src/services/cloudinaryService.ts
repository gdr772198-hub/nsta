import { uploadToTelegramStorage } from './telegramStorageService';

// Cloudinary upload service with Telegram Storage fallback for high-speed video, audio, and media hosting
export interface CloudinaryUploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  format: string;
  duration?: number;
  resource_type: string;
  bytes: number;
}

export const CLOUDINARY_CONFIG = {
  cloudName: 'ox4kpil0',
  uploadPreset: 'nsta_uploads',
  folder: 'nsta_media',
};

export type CloudinaryMediaKind = 'video' | 'audio' | 'pdf' | 'image' | 'auto';

/**
 * Uploads a video, audio, PDF, or image file directly to Cloudinary with real-time progress tracking
 */
export const uploadToCloudinary = async (
  file: File,
  resourceType: CloudinaryMediaKind = 'auto',
  onProgress?: (progressPercent: number) => void
): Promise<CloudinaryUploadResult> => {
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const isVideoOrAudio =
    resourceType === 'video' ||
    resourceType === 'audio' ||
    mime.startsWith('video/') ||
    mime.startsWith('audio/') ||
    /\.(mp4|webm|mov|m4v|mkv|mp3|wav|m4a|ogg|aac|flac)$/.test(name);
  const isPdf =
    resourceType === 'pdf' ||
    mime === 'application/pdf' ||
    name.endsWith('.pdf');

  // Cloudinary uses 'video' endpoint for both video and audio; 'auto' handles PDFs and any other media seamlessly
  const targetResourceType = isVideoOrAudio ? 'video' : isPdf || resourceType === 'auto' ? 'auto' : 'image';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
  formData.append('folder', CLOUDINARY_CONFIG.folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${targetResourceType}/upload`;

    xhr.open('POST', endpoint);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    const attemptTelegramFallback = async (originalError: any) => {
      console.warn('[Media Upload] Cloudinary failed, falling back to Telegram Cloud Storage:', originalError);
      try {
        if (onProgress) onProgress(40);
        const tgRes = await uploadToTelegramStorage(file, {
          fileName: file.name,
          caption: `NSTA ${resourceType.toUpperCase()} Upload`,
        });
        if (onProgress) onProgress(100);
        resolve({
          url: tgRes.url,
          secure_url: tgRes.url,
          public_id: tgRes.fileId,
          format: file.name.split('.').pop() || 'media',
          resource_type: targetResourceType,
          bytes: tgRes.fileSize || file.size,
        });
      } catch (tgErr: any) {
        console.error('[Media Upload] Telegram fallback also failed:', tgErr);
        reject(new Error(originalError?.message || 'Media upload failed'));
      }
    };

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(response as CloudinaryUploadResult);
        } else {
          attemptTelegramFallback(new Error(response?.error?.message || `Upload failed with status ${xhr.status}`));
        }
      } catch (err) {
        attemptTelegramFallback(err);
      }
    };

    xhr.onerror = () => {
      attemptTelegramFallback(new Error('Network error occurred during Cloudinary upload'));
    };

    xhr.ontimeout = () => {
      attemptTelegramFallback(new Error('Cloudinary upload timed out'));
    };

    xhr.send(formData);
  });
};

/**
 * Generates an optimized Cloudinary video streaming URL with auto compression & mp4 format
 */
export const getOptimizedVideoUrl = (rawUrl: string): string => {
  if (!rawUrl || !rawUrl.includes('cloudinary.com')) return rawUrl;
  // Insert f_auto,q_auto for fast mobile streaming
  if (rawUrl.includes('/upload/')) {
    return rawUrl.replace('/upload/', '/upload/q_auto,f_auto/');
  }
  return rawUrl;
};

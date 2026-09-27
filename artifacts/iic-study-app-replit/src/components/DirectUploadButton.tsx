import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, Loader2, Film, Music, FileText, Image as ImageIcon, ExternalLink, Trash2 } from 'lucide-react';
import { uploadToTelegramStorage, resolveTelegramUrl } from '../services/telegramStorageService';
import type { CloudinaryMediaKind } from '../services/cloudinaryService';

interface DirectUploadButtonProps {
  kind: CloudinaryMediaKind;
  onUploaded: (url: string, file: File) => void;
  onClear?: () => void;
  currentUrl?: string;
  label?: string;
  compact?: boolean;
  className?: string;
}

const ACCEPT_MAP: Record<CloudinaryMediaKind, string> = {
  video: 'video/*,.mp4,.webm,.mov,.m4v,.mkv',
  audio: 'audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac',
  pdf: 'application/pdf,.pdf',
  image: 'image/*',
  auto: 'video/*,audio/*,application/pdf,image/*,.mp4,.mp3,.pdf',
};

const DEFAULT_LABEL: Record<CloudinaryMediaKind, string> = {
  video: '📲 Telegram Video Upload',
  audio: '📲 Telegram Audio Upload',
  pdf: '📄 Telegram PDF Upload',
  image: '📷 Telegram Photo Upload',
  auto: '📁 Telegram File Upload',
};

const COLOR_MAP: Record<CloudinaryMediaKind, string> = {
  video: 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600',
  audio: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600',
  pdf: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
  image: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600',
  auto: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600',
};

export const DirectUploadButton: React.FC<DirectUploadButtonProps> = (props) => {
  const {
    kind,
    onUploaded,
    onClear,
    currentUrl,
    label,
    compact = false,
    className = '',
  } = props || {};
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [justUploaded, setJustUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isStoredUrl = !!(
    currentUrl &&
    (currentUrl.includes('telegram') ||
      currentUrl.includes('/api/telegram/') ||
      currentUrl.includes('api.telegram.org') ||
      currentUrl.includes('cloudinary.com'))
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(15);
    setErrorMsg(null);
    setJustUploaded(false);

    try {
      // ── Telegram Cloud Storage Upload ──
      const tgRes = await uploadToTelegramStorage(file, {
        fileName: file.name,
        caption: `NSTA App ${kind.toUpperCase()}: ${file.name}`,
        onProgress: (pct) => setProgress(pct),
      });

      if (tgRes?.url) {
        setProgress(100);
        onUploaded(tgRes.url, file);
        setJustUploaded(true);
        setTimeout(() => setJustUploaded(false), 4000);
      } else {
        throw new Error('Telegram se link prapt nahi hua.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Upload fail ho gaya. Kripya dobara try karein.');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderIcon = () => {
    if (uploading) return <Loader2 size={compact ? 12 : 14} className="animate-spin shrink-0" />;
    if (justUploaded) return <CheckCircle2 size={compact ? 12 : 14} className="shrink-0 text-emerald-200" />;
    if (kind === 'video') return <Film size={compact ? 12 : 14} className="shrink-0" />;
    if (kind === 'audio') return <Music size={compact ? 12 : 14} className="shrink-0" />;
    if (kind === 'pdf') return <FileText size={compact ? 12 : 14} className="shrink-0" />;
    if (kind === 'image') return <ImageIcon size={compact ? 12 : 14} className="shrink-0" />;
    return <Upload size={compact ? 12 : 14} className="shrink-0" />;
  };

  const testUrl = currentUrl ? resolveTelegramUrl(currentUrl) : '';

  return (
    <div className={`inline-flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_MAP[kind]}
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className={`inline-flex items-center justify-center gap-1.5 font-black rounded-lg border shadow-sm transition-all active:scale-95 disabled:opacity-60 cursor-pointer ${
            compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
          } ${COLOR_MAP[kind]}`}
        >
          {renderIcon()}
          <span>
            {uploading
              ? `Telegram Par Upload Ho Raha Hai ${progress}%...`
              : justUploaded
              ? '✓ Telegram Par Save Ho Gaya!'
              : currentUrl
              ? (label ? label : compact ? '🔄 Badlein' : '🔄 Nayi File Badlein')
              : label || DEFAULT_LABEL[kind]}
          </span>
        </button>

        {isStoredUrl && !uploading && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-800 border border-blue-200">
            ✓ Telegram Cloud Stored
          </span>
        )}

        {currentUrl && !uploading && (
          <>
            <a
              href={testUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
              title="Open/Test this file in a new tab"
            >
              <ExternalLink size={10} /> Test / Dekhein
            </a>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                title="File hatayein"
              >
                <Trash2 size={10} /> Hatao
              </button>
            )}
          </>
        )}
      </div>

      {uploading && (
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden shadow-inner">
          <div
            className="bg-emerald-500 h-full transition-all duration-300 rounded-full animate-pulse"
            style={{ width: `${Math.max(8, progress)}%` }}
          />
        </div>
      )}

      {errorMsg && (
        <p className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
          ⚠️ {errorMsg}
        </p>
      )}
    </div>
  );
};

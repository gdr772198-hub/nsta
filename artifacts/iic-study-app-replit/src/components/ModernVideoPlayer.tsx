import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Download,
  CheckCircle,
  Crown,
  Lock,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { PlayerWatermark } from './PlayerWatermark';
import { getAvailableQualitiesForUser, VideoQualityLevel, getQualityTransformedUrl } from '../utils/mediaQuality';
import { getOptimizedVideoUrl } from '../services/cloudinaryService';
import {
  downloadAndSaveOfflineMedia,
  isMediaOffline,
  getOfflineMediaObjectUrl,
  validateOfflinePlaybackAccess,
} from '../services/offlineStorageService';

interface ModernVideoPlayerProps {
  videoUrl: string;
  title?: string;
  mediaId?: string;
  subject?: string;
  appLogo?: string;
  appName?: string;
  user?: any;
  isAdmin?: boolean;
  onBack?: () => void;
  onNext?: () => void;
  nextTitle?: string;
  onUpgradeRequired?: (feature: string) => void;
  autoPlay?: boolean;
  isOfflinePlayback?: boolean;
}

/** Robust extractor for YouTube video ID (supports standard, shorts, mobile, embed, youtu.be) */
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();
  const match = clean.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/
  );
  if (match && match[1]) return match[1];
  return null;
}

/** Robust extractor for Google Drive file ID */
function extractDriveId(url: string): string | null {
  if (!url || !url.includes('drive.google.com')) return null;
  const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1 && match1[1]) return match1[1];
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2 && match2[1]) return match2[1];
  return null;
}

export const ModernVideoPlayer: React.FC<ModernVideoPlayerProps> = ({
  videoUrl,
  title = 'Video Lecture',
  mediaId,
  subject,
  appLogo = '/nsta-logo.png',
  appName = 'NSTA ACADEMY',
  user,
  isAdmin = false,
  onBack,
  onNext,
  nextTitle,
  onUpgradeRequired,
  autoPlay = false,
  isOfflinePlayback = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Quality & Settings Menu
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<VideoQualityLevel>('720p');
  
  // Use getOptimizedVideoUrl exactly like CommunityPostFeed and CustomPlayer
  const [currentPlayUrl, setCurrentPlayUrl] = useState(() => getOptimizedVideoUrl(videoUrl || ''));

  // Download state
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Expiry / Lock state for offline playback
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const userTier = (user?.subscriptionTier || user?.subscriptionLevel || 'FREE').toUpperCase();
  const isUltraUser = isAdmin || userTier === 'ULTRA';

  // Check URL types
  const ytId = extractYouTubeId(videoUrl);
  const driveId = extractDriveId(videoUrl);
  const isYouTube = !!ytId;
  const isDrive = !isYouTube && !!driveId;

  const itemId = mediaId || `vid_${encodeURIComponent(videoUrl || '').slice(0, 32)}`;

  // Sync video URL whenever prop changes
  useEffect(() => {
    if (!videoUrl) return;
    let active = true;
    (async () => {
      const offline = await isMediaOffline(itemId);
      if (active) setIsDownloaded(offline);

      if (offline || isOfflinePlayback) {
        const res = await getOfflineMediaObjectUrl(itemId);
        if (res && active) {
          const validation = validateOfflinePlaybackAccess(res.record, user);
          if (!validation.allowed) {
            setAccessBlocked(true);
            setBlockedReason(
              validation.reason === 'EXPIRED'
                ? 'Aapka Ultra Plan expire ho chuka hai! Offline video chalane ke liye subscription renew karein.'
                : 'Ye video sirf Ultra VIP members ke liye exclusive hai.'
            );
            return;
          }
          setCurrentPlayUrl(res.url);
          return;
        }
      }
      
      if (active) {
        setCurrentPlayUrl(getOptimizedVideoUrl(videoUrl));
        setVideoError(null);
      }
    })();

    return () => {
      active = false;
    };
  }, [itemId, isOfflinePlayback, user, videoUrl]);

  const handleQualitySelect = (q: VideoQualityLevel, isLocked: boolean) => {
    if (isLocked) {
      setShowSettingsMenu(false);
      if (onUpgradeRequired) {
        onUpgradeRequired('1080p / 4K Ultra VIP Quality');
      } else {
        alert('👑 1080p & 4K streaming Ultra VIP members ke liye exclusive hai!');
      }
      return;
    }
    setSelectedQuality(q);
    setShowSettingsMenu(false);

    // Apply quality only when explicitly selected
    const transformed = getQualityTransformedUrl(videoUrl, q);
    if (transformed && videoRef.current) {
      const prevTime = videoRef.current.currentTime || 0;
      const wasPlaying = !videoRef.current.paused;
      setCurrentPlayUrl(transformed);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = prevTime;
          if (wasPlaying) {
            videoRef.current.play().catch(() => {});
          }
        }
      }, 100);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleDownload = async () => {
    if (!isUltraUser) {
      if (onUpgradeRequired) {
        onUpgradeRequired('Offline Video Downloads');
      } else {
        alert('👑 Video Offline Download sirf Ultra VIP members ke liye hai! Plan upgrade karein.');
      }
      return;
    }

    if (isDownloaded) return;

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      await downloadAndSaveOfflineMedia(
        {
          id: itemId,
          title,
          subject,
          kind: 'video',
          originalUrl: videoUrl,
          mimeType: 'video/mp4',
          requiredTier: 'ULTRA',
          subscriptionExpiry: user?.subscriptionExpiresAt || null,
        },
        (pct) => setDownloadProgress(pct)
      );

      setIsDownloaded(true);
      setIsDownloading(false);
    } catch (err: any) {
      console.error('Download error:', err);
      setIsDownloading(false);
      alert('Video download nahi ho paya. Kripya dobara koshish karein.');
    }
  };

  // If playback access is blocked due to expired subscription
  if (accessBlocked) {
    return (
      <div className="w-full aspect-video min-h-[300px] bg-slate-950 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-white border border-rose-900/50 shadow-2xl relative overflow-hidden">
        <PlayerWatermark appLogo={appLogo} appName={appName} />
        <div className="w-16 h-16 rounded-full bg-rose-600/20 border border-rose-500/40 flex items-center justify-center mb-4">
          <Lock size={32} className="text-rose-400" />
        </div>
        <h3 className="text-lg font-black text-white mb-2">Offline Playback Locked</h3>
        <p className="text-xs text-rose-200/80 max-w-sm mb-5 leading-relaxed">{blockedReason}</p>
        <button
          onClick={() => onUpgradeRequired?.('Renew Ultra Subscription')}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 font-bold text-xs shadow-lg active:scale-95 transition flex items-center gap-2"
        >
          <Crown size={15} /> Ultra Plan Renew Karein
        </button>
      </div>
    );
  }

  // ── YOUTUBE PLAYER EMBED WITH FULL HEADER CONTROLS ──
  if (isYouTube && ytId) {
    const ytEmbedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&controls=1&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`;
    return (
      <div
        ref={containerRef}
        className={`relative w-full aspect-video min-h-[300px] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col ${
          isFullscreen ? 'fixed inset-0 z-[99999] rounded-none h-screen' : ''
        }`}
      >
        <PlayerWatermark appLogo={appLogo} appName={appName} position="top-right" />

        {/* Top Bar Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/50 to-transparent z-20 pointer-events-auto">
          <div className="flex items-center gap-2 min-w-0 pr-24">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-90"
                title="Go Back"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate drop-shadow">{title}</h4>
              {subject && <p className="text-[10px] text-slate-300 font-semibold uppercase">{subject}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://www.youtube.com/watch?v=${ytId}`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              title="YouTube App me Kholein"
            >
              <ExternalLink size={14} />
            </a>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            </button>
          </div>
        </div>

        {/* Embedded YouTube Iframe */}
        <iframe
          src={ytEmbedUrl}
          className="w-full h-full border-0 flex-1"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title={title}
        />
      </div>
    );
  }

  // ── GOOGLE DRIVE VIDEO PLAYER EMBED ──
  if (isDrive && driveId) {
    const drivePreviewUrl = `https://drive.google.com/file/d/${driveId}/preview`;
    return (
      <div
        ref={containerRef}
        className={`relative w-full aspect-video min-h-[300px] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col ${
          isFullscreen ? 'fixed inset-0 z-[99999] rounded-none h-screen' : ''
        }`}
      >
        <PlayerWatermark appLogo={appLogo} appName={appName} position="top-right" />

        {/* Top Bar Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/50 to-transparent z-20 pointer-events-auto">
          <div className="flex items-center gap-2 min-w-0 pr-24">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-90"
                title="Go Back"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate drop-shadow">{title}</h4>
              {subject && <p className="text-[10px] text-slate-300 font-semibold uppercase">{subject}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://drive.google.com/file/d/${driveId}/view`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              title="Drive me Kholein"
            >
              <ExternalLink size={14} />
            </a>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            </button>
          </div>
        </div>

        {/* Embedded Google Drive Video Frame */}
        <iframe
          src={drivePreviewUrl}
          className="w-full h-full border-0 flex-1"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          title={title}
        />
      </div>
    );
  }

  // ── DIRECT VIDEO STREAM (HTML5 / CLOUDINARY / TELEGRAM / MP4) ──
  const availableQualities = getAvailableQualitiesForUser(videoUrl || '', userTier, isAdmin);

  const handleVideoError = () => {
    console.warn('[ModernVideoPlayer] Video load error for URL:', currentPlayUrl);
    // If quality transformed URL failed, fallback immediately to original videoUrl
    if (currentPlayUrl !== videoUrl && videoUrl) {
      setCurrentPlayUrl(videoUrl);
      return;
    }
    setVideoError('Video stream load nahi ho payi. Internet connection ya video format check karein.');
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-video min-h-[300px] bg-black rounded-2xl overflow-hidden select-none shadow-2xl flex flex-col justify-between ${
        isFullscreen ? 'fixed inset-0 z-[99999] rounded-none h-screen' : ''
      }`}
    >
      {/* ── Official Semi-Transparent Logo Watermark ── */}
      <PlayerWatermark appLogo={appLogo} appName={appName} position="top-right" />

      {/* ── Top Bar Header Overlay ── */}
      <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent z-20 pointer-events-auto">
        <div className="flex items-center gap-2 min-w-0 pr-24">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-90"
              title="Go Back"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white truncate drop-shadow">{title}</h4>
            {subject && <p className="text-[10px] text-slate-300 font-semibold uppercase">{subject}</p>}
          </div>
        </div>

        {/* Action Controls on Player Top (Download + Settings + Direct Link) */}
        <div className="flex items-center gap-1.5 relative">
          {videoUrl && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-xs flex items-center"
              title="Direct Video Kholein"
            >
              <ExternalLink size={13} />
            </a>
          )}

          {/* Quality Selector Button */}
          {availableQualities.length > 1 && (
            <button
              onClick={() => setShowSettingsMenu((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white transition"
              title="Resolution Quality"
            >
              <span className="uppercase text-indigo-300">{selectedQuality}</span>
              <Settings size={12} />
            </button>
          )}

          {/* Offline Save Button */}
          {isDownloaded ? (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded-full">
              <CheckCircle size={12} /> Saved
            </span>
          ) : isDownloading ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 px-2.5 py-1 rounded-full animate-pulse">
              <Download size={12} className="animate-bounce" /> {downloadProgress}%
            </span>
          ) : (
            <button
              onClick={handleDownload}
              className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full transition active:scale-95 shadow ${
                isUltraUser
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:brightness-110'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title="Download inside App for offline learning"
            >
              {isUltraUser ? <Download size={11} /> : <Crown size={11} />}
              <span className="hidden xs:inline">{isUltraUser ? 'Save Offline' : 'Ultra'}</span>
            </button>
          )}

          {/* Quality Settings Dropdown Popup */}
          {showSettingsMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-2 w-48 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-2.5 shadow-2xl text-white z-50 animate-in fade-in"
            >
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Select Quality</p>
              <div className="space-y-1">
                {availableQualities.map((q) => (
                  <button
                    key={q.quality}
                    onClick={() => handleQualitySelect(q.quality, q.isLocked)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs transition ${
                      selectedQuality === q.quality
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span>{q.label}</span>
                    {q.isLocked && <Lock size={11} className="text-amber-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Native HTML5 Video Stream with Native Hardware Controls (Guaranteed to work like Community Post) ── */}
      <div className="w-full h-full flex-1 relative flex items-center justify-center bg-black pt-10">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={currentPlayUrl}
            controls
            playsInline
            preload="metadata"
            controlsList="nodownload"
            autoPlay={autoPlay}
            className="w-full h-full max-h-full object-contain bg-black"
            onError={handleVideoError}
            onPlay={() => {
              setIsPlaying(true);
              setVideoError(null);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              if (onNext) onNext();
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-950 p-6 text-center">
            <AlertTriangle size={36} className="text-amber-500 mb-2 opacity-80" />
            <p className="text-sm font-bold text-white">Video Available Nahi Hai</p>
            <p className="text-xs text-slate-500 mt-1">Admin ne is lesson ke liye video link add nahi kiya hai.</p>
          </div>
        )}
      </div>

      {/* ── Video Error Overlay with Retry & Direct Link ── */}
      {videoError && (
        <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white">
          <AlertTriangle size={36} className="text-amber-400 mb-3" />
          <h4 className="text-sm font-bold text-white mb-1">Video Chalane Me Samasya Aayi</h4>
          <p className="text-xs text-slate-400 max-w-sm mb-4">{videoError}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setVideoError(null);
                setCurrentPlayUrl(videoUrl);
                if (videoRef.current) {
                  videoRef.current.load();
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
            >
              <RefreshCw size={13} /> Dobara Chalayein
            </button>
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
              >
                <ExternalLink size={13} /> Direct Kholein
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

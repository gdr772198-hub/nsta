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
} from 'lucide-react';
import { PlayerWatermark } from './PlayerWatermark';
import { getAvailableQualitiesForUser, VideoQualityLevel } from '../utils/mediaQuality';
import {
  downloadAndSaveOfflineMedia,
  isMediaOffline,
  getOfflineMediaObjectUrl,
  validateOfflinePlaybackAccess,
  formatBytes,
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
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Quality & Settings Menu
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<VideoQualityLevel>('720p');
  const [currentPlayUrl, setCurrentPlayUrl] = useState(videoUrl);

  // Download state
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Expiry / Lock state for offline playback
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const userTier = (user?.subscriptionTier || user?.subscriptionLevel || 'FREE').toUpperCase();
  const isUltraUser = isAdmin || userTier === 'ULTRA';

  // Check if YouTube URL
  const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  const getYouTubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const id = match && match[2].length === 11 ? match[2] : null;
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&modestbranding=1&rel=0&playsinline=1` : url;
  };

  const itemId = mediaId || `vid_${encodeURIComponent(videoUrl).slice(0, 32)}`;

  // Check if media is downloaded or if we need to load offline blob
  useEffect(() => {
    let active = true;
    (async () => {
      const offline = await isMediaOffline(itemId);
      if (active) setIsDownloaded(offline);

      if (offline || isOfflinePlayback) {
        const res = await getOfflineMediaObjectUrl(itemId);
        if (res && active) {
          // Validate subscription validity
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
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [itemId, isOfflinePlayback, user]);

  // Update current play URL when quality changes
  useEffect(() => {
    if (isYouTube) return;
    const qualities = getAvailableQualitiesForUser(videoUrl, userTier, isAdmin);
    const chosen = qualities.find((q) => q.quality === selectedQuality);
    if (chosen && !chosen.isLocked) {
      const prevTime = videoRef.current?.currentTime || 0;
      const wasPlaying = !videoRef.current?.paused;
      setCurrentPlayUrl(chosen.url);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = prevTime;
          if (wasPlaying) videoRef.current.play().catch(() => {});
        }
      }, 100);
    }
  }, [selectedQuality, videoUrl, userTier, isAdmin, isYouTube]);

  // Auto-hide controls timer
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettingsMenu(false);
      }, 3500);
    }
  }, [isPlaying]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    resetControlsTimer();
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    resetControlsTimer();
  };

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
    setShowSettingsMenu(false);
    resetControlsTimer();
  };

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
    resetControlsTimer();
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
      setDownloadError(null);

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
      setDownloadError('Download failed. Please check internet connection.');
    }
  };

  const formatTime = (timeInSec: number) => {
    const min = Math.floor(timeInSec / 60);
    const sec = Math.floor(timeInSec % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // If playback access is blocked due to expired subscription
  if (accessBlocked) {
    return (
      <div className="w-full aspect-video bg-slate-950 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-white border border-rose-900/50 shadow-2xl relative overflow-hidden">
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

  // Fallback for YouTube embeds
  if (isYouTube) {
    return (
      <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden relative shadow-2xl">
        <PlayerWatermark appLogo={appLogo} appName={appName} />
        <iframe
          src={getYouTubeEmbedUrl(videoUrl)}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title}
        />
      </div>
    );
  }

  const availableQualities = getAvailableQualitiesForUser(videoUrl, userTier, isAdmin);

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden select-none shadow-2xl group flex flex-col justify-end ${
        isFullscreen ? 'fixed inset-0 z-[99999] rounded-none' : ''
      }`}
    >
      {/* ── Official Semi-Transparent Logo Watermark ── */}
      <PlayerWatermark appLogo={appLogo} appName={appName} position="top-right" />

      {/* ── Native HTML5 Video Stream ── */}
      <video
        ref={videoRef}
        src={currentPlayUrl}
        autoPlay={autoPlay}
        playsInline
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onTimeUpdate={() => {
          if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) setDuration(videoRef.current.duration);
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (onNext) onNext();
        }}
      />

      {/* ── Top Bar Header Overlay ── */}
      <div
        className={`absolute top-0 left-0 right-0 p-3 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 pr-24">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-90"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white truncate drop-shadow">{title}</h4>
            {subject && <p className="text-[10px] text-slate-300 font-semibold uppercase">{subject}</p>}
          </div>
        </div>

        {/* In-App Offline Download Button on Player Top */}
        <div className="flex items-center gap-2">
          {isDownloaded ? (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded-full">
              <CheckCircle size={12} /> Offline Saved
            </span>
          ) : isDownloading ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 px-2.5 py-1 rounded-full animate-pulse">
              <Download size={12} className="animate-bounce" /> {downloadProgress}%
            </span>
          ) : (
            <button
              onClick={handleDownload}
              className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full transition active:scale-95 shadow ${
                isUltraUser
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:brightness-110'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title="Download inside App for offline learning"
            >
              {isUltraUser ? <Download size={12} /> : <Crown size={12} />}
              {isUltraUser ? 'Save Offline' : 'Ultra Download'}
            </button>
          )}
        </div>
      </div>

      {/* ── Center Quick Action Overlay (10s Back / Play / 10s Forward) ── */}
      <div
        className={`absolute inset-0 flex items-center justify-center gap-8 pointer-events-none transition-opacity duration-300 z-10 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            skipTime(-10);
          }}
          className="pointer-events-auto p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm active:scale-90 transition flex flex-col items-center"
          title="-10s"
        >
          <RotateCcw size={20} />
          <span className="text-[8px] font-black mt-0.5">-10s</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="pointer-events-auto w-14 h-14 rounded-full bg-indigo-600/90 hover:bg-indigo-600 text-white shadow-xl backdrop-blur-sm active:scale-90 transition flex items-center justify-center"
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} className="translate-x-0.5" />}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            skipTime(10);
          }}
          className="pointer-events-auto p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm active:scale-90 transition flex flex-col items-center"
          title="+10s"
        >
          <RotateCw size={20} />
          <span className="text-[8px] font-black mt-0.5">+10s</span>
        </button>
      </div>

      {/* ── Bottom Controls Bar ── */}
      <div
        className={`relative z-20 p-3 pt-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 space-y-2 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Scrubber */}
        <div className="relative group/scrub flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCurrentTime(val);
              if (videoRef.current) videoRef.current.currentTime = val;
            }}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2.5 transition-all"
          />
        </div>

        {/* Lower Row Controls */}
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="hover:text-indigo-400 transition">
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              className="hover:text-indigo-400 transition"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <span className="text-[11px] font-mono text-slate-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Speed Badge */}
            <button
              onClick={() => setShowSettingsMenu((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[11px] font-bold transition"
            >
              <span>{playbackSpeed}x</span>
              <span className="text-[9px] text-indigo-300 uppercase">{selectedQuality}</span>
              <Settings size={13} className="ml-0.5" />
            </button>

            {/* Next Chapter Button */}
            {onNext && (
              <button
                onClick={onNext}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-300 hover:text-white transition"
                title={nextTitle || 'Next Lecture'}
              >
                <span>Agla</span>
                <ChevronRight size={14} />
              </button>
            )}

            {/* Fullscreen Button */}
            <button onClick={toggleFullscreen} className="hover:text-indigo-400 transition">
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

            {/* ── Settings Dropdown Popup (Speed + Quality) ── */}
            {showSettingsMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 bottom-full mb-3 w-56 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-3 shadow-2xl text-white z-50 animate-in fade-in zoom-in-95"
              >
                {/* Playback Speed section */}
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Playback Speed</p>
                <div className="grid grid-cols-5 gap-1 mb-3">
                  {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => handleSpeedChange(spd)}
                      className={`py-1 text-center rounded text-[10px] font-bold transition ${
                        playbackSpeed === spd ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                {/* Quality Selector section */}
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Video Quality</span>
                  <span className="text-[8px] text-amber-400 font-bold">Auto Adaptive</span>
                </p>
                <div className="space-y-1">
                  {availableQualities.map((q) => (
                    <button
                      key={q.quality}
                      onClick={() => handleQualitySelect(q.quality, q.isLocked)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition ${
                        selectedQuality === q.quality
                          ? 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/40'
                          : 'hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold flex items-center gap-1.5">
                          {q.label}
                          {q.quality === '1080p' && <Sparkles size={11} className="text-amber-400" />}
                        </span>
                        <span className="text-[9px] text-slate-400">{q.description}</span>
                      </div>
                      {q.isLocked && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                          <Lock size={10} /> {q.requiredTier}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

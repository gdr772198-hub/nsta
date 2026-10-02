import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Download,
  CheckCircle,
  Crown,
  Lock,
  ArrowLeft,
  Settings,
  MoreVertical,
  Check,
  Repeat,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  downloadAndSaveOfflineMedia,
  isMediaOffline,
  getOfflineMediaObjectUrl,
  validateOfflinePlaybackAccess,
} from '../services/offlineStorageService';
import {
  VideoQualityLevel,
  getAvailableQualitiesForUser,
  getQualityTransformedUrl,
} from '../utils/mediaQuality';
import { getOptimizedVideoUrl } from '../services/cloudinaryService';

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
  onUpgradeRequired?: (feature: string) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  autoPlay?: boolean;
  isOfflinePlayback?: boolean;
}

export const ModernVideoPlayer: React.FC<ModernVideoPlayerProps> = ({
  videoUrl,
  title = 'Video Lecture',
  mediaId,
  subject,
  appLogo,
  appName = 'IIC',
  user,
  isAdmin = false,
  onBack,
  onNext,
  onUpgradeRequired,
  onFullscreenChange,
  autoPlay = false,
  isOfflinePlayback = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTopBarHidden, setIsTopBarHidden] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [currentPlayUrl, setCurrentPlayUrl] = useState('');
  const [selectedQuality, setSelectedQuality] = useState<VideoQualityLevel>('Auto');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // ── Double-Tap & Multi-Tap Gesture States ──
  const [gestureFeedback, setGestureFeedback] = useState<{
    zone: 'left' | 'right' | 'center' | null;
    seconds: number;
    action?: 'play' | 'pause';
  }>({ zone: null, seconds: 0 });

  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCountRef = useRef(0);
  const lastTapZoneRef = useRef<'left' | 'right' | 'center' | null>(null);
  const accumulatedSeekRef = useRef(0);

  // Download state
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Access control
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const userTier = (user?.subscriptionTier || user?.subscriptionLevel || 'FREE').toUpperCase();
  const isUltraUser = isAdmin || userTier === 'ULTRA';
  const itemId = mediaId || `vid_${encodeURIComponent(videoUrl).slice(0, 32)}`;

  // Helper to extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    return match ? match[1] : null;
  };

  // Helper to extract Google Drive file ID
  const getDriveId = (url: string) => {
    const match = url.match(/\/d\/(.*?)\/|\/d\/(.*?)$|id=(.*?)(&|$)/);
    return match ? match[1] || match[2] || match[3] : null;
  };

  const isYouTube = videoUrl ? (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) : false;
  const isDrive = videoUrl ? (videoUrl.includes('drive.google.com') && !videoUrl.includes('export=download')) : false;
  const ytId = isYouTube ? getYouTubeId(videoUrl) : null;
  const driveId = isDrive ? getDriveId(videoUrl) : null;

  // Initialize playback URL and check offline status
  useEffect(() => {
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
                ? 'Aapka Ultra Plan expire ho chuka hai! Offline video dekhne ke liye renew karein.'
                : 'Ye offline video Ultra VIP members ke liye exclusive hai.'
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

  // Fullscreen state synchronization with document and body class
  const toggleFullscreen = useCallback(() => {
    const nextState = !isFullscreen;
    setIsFullscreen(nextState);
    onFullscreenChange?.(nextState);

    if (nextState) {
      document.body.classList.add('nsta-video-fullscreen-active');
      document.documentElement.classList.add('nsta-video-fullscreen-active');
    } else {
      document.body.classList.remove('nsta-video-fullscreen-active');
      document.documentElement.classList.remove('nsta-video-fullscreen-active');
    }

    try {
      window.dispatchEvent(
        new CustomEvent('nsta-video-fullscreen', { detail: { isFullscreen: nextState } })
      );
    } catch {}

    try {
      if (nextState) {
        if (!document.fullscreenElement && containerRef.current?.requestFullscreen) {
          containerRef.current.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch {}
  }, [isFullscreen, onFullscreenChange]);

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      onFullscreenChange?.(isFs);
      if (isFs) {
        document.body.classList.add('nsta-video-fullscreen-active');
        document.documentElement.classList.add('nsta-video-fullscreen-active');
      } else {
        document.body.classList.remove('nsta-video-fullscreen-active');
        document.documentElement.classList.remove('nsta-video-fullscreen-active');
      }
      try {
        window.dispatchEvent(
          new CustomEvent('nsta-video-fullscreen', { detail: { isFullscreen: isFs } })
        );
      } catch {}
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.body.classList.remove('nsta-video-fullscreen-active');
      document.documentElement.classList.remove('nsta-video-fullscreen-active');
      try {
        window.dispatchEvent(
          new CustomEvent('nsta-video-fullscreen', { detail: { isFullscreen: false } })
        );
      } catch {}
    };
  }, [onFullscreenChange]);

  // Screen orientation auto-detection (landscape vs portrait)
  useEffect(() => {
    const handleOrientation = () => {
      const isLandscape =
        window.matchMedia('(orientation: landscape)').matches ||
        (typeof screen !== 'undefined' &&
          ((screen as any).orientation?.type?.includes('landscape') ||
            (screen as any).orientation?.angle === 90 ||
            (screen as any).orientation?.angle === 270));
      setIsRotated(!!isLandscape);
    };
    handleOrientation();
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, []);

  // Screen rotate toggle (landscape / portrait)
  const toggleRotate = useCallback(async () => {
    const nextRot = !isRotated;
    setIsRotated(nextRot);
    // When rotating to landscape, hide top bar for an immersive rotated experience
    if (nextRot) {
      setIsTopBarHidden(true);
      try {
        window.dispatchEvent(
          new CustomEvent('nsta-video-topbar-change', { detail: { isTopBarHidden: true } })
        );
      } catch {}
    }
    try {
      const so: any = (screen as any).orientation;
      if (so && typeof so.lock === 'function') {
        if (nextRot) {
          await so.lock('landscape').catch(() => {});
        } else {
          await so.unlock?.().catch(() => {});
        }
      }
    } catch {}
  }, [isRotated]);

  // NSTA logo tap: toggles top bar visibility (hide / show)
  const handleNstaLogoClick = useCallback(() => {
    setIsTopBarHidden((prev) => {
      const next = !prev;
      try {
        window.dispatchEvent(
          new CustomEvent('nsta-video-topbar-change', { detail: { isTopBarHidden: next } })
        );
      } catch {}
      return next;
    });
  }, []);

  // Cleanup gesture timers on unmount
  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const showGesture = useCallback((
    zone: 'left' | 'right' | 'center',
    seconds: number,
    action?: 'play' | 'pause'
  ) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setGestureFeedback({ zone, seconds, action });
    feedbackTimerRef.current = setTimeout(() => {
      setGestureFeedback({ zone: null, seconds: 0 });
    }, 750);
  }, []);

  // ── Touch & Multi-Tap Gesture Handler:
  // Center 2-tap: Pause / Play toggle
  // Left 2-tap: -10s rewind (consecutive taps accumulate: -20s, -30s...)
  // Right 2-tap: +10s forward (consecutive taps accumulate: +20s, +30s...)
  // Single tap: toggle top bar
  const handleVideoGestureClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (showSettingsMenu) {
      setShowSettingsMenu(false);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;

    let zone: 'left' | 'right' | 'center';
    if (ratio < 0.35) {
      zone = 'left';
    } else if (ratio > 0.65) {
      zone = 'right';
    } else {
      zone = 'center';
    }

    // Reset accumulated taps if tapped in a different zone
    if (lastTapZoneRef.current && lastTapZoneRef.current !== zone) {
      tapCountRef.current = 0;
      accumulatedSeekRef.current = 0;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    }
    lastTapZoneRef.current = zone;
    tapCountRef.current += 1;

    // CENTER ZONE: 2 taps to Pause / Play
    if (zone === 'center') {
      if (tapCountRef.current === 1) {
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        tapTimerRef.current = setTimeout(() => {
          // Single tap in center toggles top bar visibility
          setIsTopBarHidden((prev) => {
            const next = !prev;
            try {
              window.dispatchEvent(
                new CustomEvent('nsta-video-topbar-change', { detail: { isTopBarHidden: next } })
              );
            } catch {}
            return next;
          });
          tapCountRef.current = 0;
          lastTapZoneRef.current = null;
        }, 280);
      } else if (tapCountRef.current >= 2) {
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        tapCountRef.current = 0;
        lastTapZoneRef.current = null;

        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
            showGesture('center', 0, 'play');
          } else {
            videoRef.current.pause();
            setIsPlaying(false);
            showGesture('center', 0, 'pause');
          }
        }
      }
      return;
    }

    // LEFT ZONE: Double tap rewinds 10s, subsequent taps add -10s each (-20s, -30s...)
    if (zone === 'left') {
      if (tapCountRef.current === 1) {
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        tapTimerRef.current = setTimeout(() => {
          setIsTopBarHidden((prev) => !prev);
          tapCountRef.current = 0;
          accumulatedSeekRef.current = 0;
          lastTapZoneRef.current = null;
        }, 280);
      } else {
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        accumulatedSeekRef.current += 10;
        const total = accumulatedSeekRef.current;

        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          setCurrentTime(videoRef.current.currentTime);
        }
        showGesture('left', total);

        tapTimerRef.current = setTimeout(() => {
          tapCountRef.current = 0;
          accumulatedSeekRef.current = 0;
          lastTapZoneRef.current = null;
        }, 700);
      }
      return;
    }

    // RIGHT ZONE: Double tap forwards 10s, subsequent taps add +10s each (+20s, +30s...)
    if (zone === 'right') {
      if (tapCountRef.current === 1) {
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        tapTimerRef.current = setTimeout(() => {
          setIsTopBarHidden((prev) => !prev);
          tapCountRef.current = 0;
          accumulatedSeekRef.current = 0;
          lastTapZoneRef.current = null;
        }, 280);
      } else {
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        accumulatedSeekRef.current += 10;
        const total = accumulatedSeekRef.current;

        if (videoRef.current) {
          const maxD = videoRef.current.duration || 999999;
          videoRef.current.currentTime = Math.min(maxD, videoRef.current.currentTime + 10);
          setCurrentTime(videoRef.current.currentTime);
        }
        showGesture('right', total);

        tapTimerRef.current = setTimeout(() => {
          tapCountRef.current = 0;
          accumulatedSeekRef.current = 0;
          lastTapZoneRef.current = null;
        }, 700);
      }
    }
  }, [showGesture, showSettingsMenu]);

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleLoopToggle = () => {
    const nextLoop = !isLooping;
    setIsLooping(nextLoop);
    if (videoRef.current) {
      videoRef.current.loop = nextLoop;
    }
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

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
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

  // ── YOUTUBE PLAYER EMBED ──
  if (isYouTube && ytId) {
    const ytEmbedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&controls=1&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`;
    const ytNode = (
      <div
        ref={containerRef}
        className={`relative w-full aspect-video min-h-[300px] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col ${
          isFullscreen || isRotated ? 'fixed inset-0 z-[99999] rounded-none h-screen w-screen' : ''
        }`}
      >
        <PlayerWatermark
          appLogo={appLogo}
          appName={appName}
          position={isFullscreen ? 'top-right' : 'bottom-right'}
          onClick={handleNstaLogoClick}
          isFullscreen={isFullscreen}
          isTopBarHidden={isTopBarHidden}
        />

        {/* Top Bar Header Overlay */}
        <div
          className={`absolute top-0 left-0 right-0 p-3 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent z-20 transition-all duration-300 ${
            isTopBarHidden
              ? '-translate-y-full opacity-0 pointer-events-none'
              : 'translate-y-0 opacity-100 pointer-events-auto'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 pr-4">
            {onBack && (
              <button
                type="button"
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

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleRotate}
              className={`p-1.5 rounded-lg transition active:scale-90 ${
                isRotated ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isRotated ? 'Rotate Portrait' : 'Rotate Landscape (Screen Ghumayein)'}
            >
              <RotateCw size={14} className={isRotated ? 'rotate-90 transition-transform' : ''} />
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

    if ((isFullscreen || isRotated) && typeof document !== 'undefined') {
      return createPortal(ytNode, document.body);
    }
    return ytNode;
  }

  // ── GOOGLE DRIVE VIDEO PLAYER EMBED ──
  if (isDrive && driveId) {
    const drivePreviewUrl = `https://drive.google.com/file/d/${driveId}/preview`;
    const driveNode = (
      <div
        ref={containerRef}
        className={`relative w-full aspect-video min-h-[300px] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col ${
          isFullscreen || isRotated ? 'fixed inset-0 z-[99999] rounded-none h-screen w-screen' : ''
        }`}
      >
        <PlayerWatermark
          appLogo={appLogo}
          appName={appName}
          position={isFullscreen ? 'top-right' : 'bottom-right'}
          onClick={handleNstaLogoClick}
          isFullscreen={isFullscreen}
          isTopBarHidden={isTopBarHidden}
        />

        {/* Top Bar Header Overlay */}
        <div
          className={`absolute top-0 left-0 right-0 p-3 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent z-20 transition-all duration-300 ${
            isTopBarHidden
              ? '-translate-y-full opacity-0 pointer-events-none'
              : 'translate-y-0 opacity-100 pointer-events-auto'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 pr-4">
            {onBack && (
              <button
                type="button"
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

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleRotate}
              className={`p-1.5 rounded-lg transition active:scale-90 ${
                isRotated ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isRotated ? 'Rotate Portrait' : 'Rotate Landscape (Screen Ghumayein)'}
            >
              <RotateCw size={14} className={isRotated ? 'rotate-90 transition-transform' : ''} />
            </button>
          </div>
        </div>

        <iframe
          src={drivePreviewUrl}
          className="w-full h-full border-0 flex-1"
          allow="autoplay"
          title={title}
        />
      </div>
    );

    if ((isFullscreen || isRotated) && typeof document !== 'undefined') {
      return createPortal(driveNode, document.body);
    }
    return driveNode;
  }

  // ── DIRECT VIDEO STREAM (HTML5 / CLOUDINARY / MP4) ──
  const availableQualities = getAvailableQualitiesForUser(videoUrl || '', userTier, isAdmin);

  const handleVideoError = () => {
    console.warn('[ModernVideoPlayer] Video load error for URL:', currentPlayUrl);
    if (currentPlayUrl !== videoUrl && videoUrl) {
      setCurrentPlayUrl(videoUrl);
      return;
    }
    setVideoError('Video stream load nahi ho payi. Internet connection ya video format check karein.');
  };

  const playerNode = (
    <div
      ref={containerRef}
      className={`group/player relative w-full aspect-video min-h-[300px] bg-black rounded-2xl overflow-hidden select-none shadow-2xl flex flex-col justify-between ${
        isFullscreen || isRotated ? 'fixed inset-0 z-[99999] rounded-none h-screen w-screen' : ''
      }`}
      onClick={() => {
        if (showSettingsMenu) setShowSettingsMenu(false);
      }}
    >
      {/* ── Top Bar Header Overlay ── */}
      <div
        className={`absolute top-0 left-0 right-0 p-3 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent z-20 transition-all duration-300 ${
          isTopBarHidden
            ? '-translate-y-full opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100 pointer-events-auto'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 pr-4">
          {onBack && (
            <button
              type="button"
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

        {/* Top Right: Rotate Control & 3-Dot Options Menu (Moved to Top as requested) */}
        <div className="flex items-center gap-1.5 relative">
          <button
            type="button"
            onClick={toggleRotate}
            className={`p-1.5 rounded-lg transition active:scale-90 ${
              isRotated ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isRotated ? 'Rotate Portrait' : 'Rotate Landscape (Screen Ghumayein)'}
          >
            <RotateCw size={14} className={isRotated ? 'rotate-90 transition-transform' : ''} />
          </button>

          {/* 3-Dot Options Button: Moved to Top Bar */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSettingsMenu((v) => !v);
              }}
              className={`p-1.5 rounded-lg transition active:scale-90 flex items-center justify-center cursor-pointer ${
                showSettingsMenu
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Options (Quality Change, Speed, Loop, Save)"
              aria-label="Video Options"
            >
              <MoreVertical size={16} />
            </button>

            {/* 3-Dot Settings & Quality Dropdown Popup (Opens Downward from Top Bar) */}
            {showSettingsMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 w-60 max-h-[75vh] overflow-y-auto bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3 shadow-2xl text-white z-50 animate-in fade-in zoom-in-95 space-y-3"
              >
                {/* Quality Change Section */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Quality / Resolution
                    </p>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      {selectedQuality}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {availableQualities.map((q) => (
                      <button
                        key={q.quality}
                        onClick={() => handleQualitySelect(q.quality, q.isLocked)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition active:scale-95 ${
                          selectedQuality === q.quality
                            ? 'bg-indigo-600 text-white font-bold shadow'
                            : 'hover:bg-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {selectedQuality === q.quality && (
                            <Check size={12} className="text-white shrink-0" />
                          )}
                          <span>{q.label}</span>
                        </div>
                        {q.isLocked && <Lock size={12} className="text-amber-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Playback Speed Section */}
                <div className="pt-2 border-t border-slate-800">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Playback Speed
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {[0.75, 1, 1.25, 1.5].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`py-1 rounded-lg text-center text-xs font-bold transition active:scale-90 ${
                          playbackRate === speed
                            ? 'bg-indigo-600 text-white shadow'
                            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loop Video Option */}
                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={handleLoopToggle}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                      isLooping
                        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Repeat size={13} className={isLooping ? 'text-indigo-400' : 'text-slate-400'} />
                      <span>Loop Video</span>
                    </div>
                    <span className="text-[10px] uppercase font-black">{isLooping ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                {/* Offline Save inside App Option */}
                <div className="pt-2 border-t border-slate-800">
                  {isDownloaded ? (
                    <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle size={13} /> App Me Saved Hai
                      </span>
                      <span className="text-[9px] uppercase font-black bg-emerald-500/20 px-1.5 py-0.5 rounded">
                        Offline
                      </span>
                    </div>
                  ) : isDownloading ? (
                    <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 text-xs font-bold animate-pulse">
                      <span className="flex items-center gap-1.5">
                        <Download size={13} className="animate-bounce" /> Downloading...
                      </span>
                      <span className="text-[10px] font-black">{downloadProgress}%</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false);
                        handleDownload();
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 shadow ${
                        isUltraUser
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:brightness-110'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {isUltraUser ? <Download size={13} /> : <Crown size={13} />}
                        <span>Save Inside App</span>
                      </span>
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-black/30">
                        {isUltraUser ? 'Offline' : 'Ultra'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Video Element with Touch & Multi-Tap Gesture Zones ── */}
      <div
        className="w-full h-full flex-1 relative flex items-center justify-center bg-black pt-8 pb-12 cursor-pointer select-none overflow-hidden"
        onClick={handleVideoGestureClick}
      >
        {videoUrl ? (
          <video
            ref={videoRef}
            src={currentPlayUrl}
            playsInline
            preload="metadata"
            autoPlay={autoPlay}
            className="w-full h-full max-h-full object-contain bg-black pointer-events-none"
            onError={handleVideoError}
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
                if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
                  setDuration(videoRef.current.duration);
                }
              }
            }}
            onLoadedMetadata={() => {
              if (videoRef.current && videoRef.current.duration) {
                setDuration(videoRef.current.duration);
              }
            }}
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

        {/* ── Gesture Feedback Overlays ── */}
        {/* Left Double-Tap / Multi-Tap (-10s, -20s, -30s...) */}
        {gestureFeedback.zone === 'left' && (
          <div className="absolute left-0 top-0 bottom-0 w-[42%] bg-gradient-to-r from-indigo-900/60 via-indigo-600/25 to-transparent flex items-center justify-center pointer-events-none z-15 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center justify-center px-4 py-3 rounded-2xl bg-slate-950/85 border border-indigo-500/50 backdrop-blur-md shadow-2xl">
              <RotateCcw size={30} className="text-indigo-300 mb-1" />
              <span className="text-base font-black text-white tracking-wide">
                -{gestureFeedback.seconds}s
              </span>
              <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider mt-0.5">
                Peeche
              </span>
            </div>
          </div>
        )}

        {/* Right Double-Tap / Multi-Tap (+10s, +20s, +30s...) */}
        {gestureFeedback.zone === 'right' && (
          <div className="absolute right-0 top-0 bottom-0 w-[42%] bg-gradient-to-l from-indigo-900/60 via-indigo-600/25 to-transparent flex items-center justify-center pointer-events-none z-15 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center justify-center px-4 py-3 rounded-2xl bg-slate-950/85 border border-indigo-500/50 backdrop-blur-md shadow-2xl">
              <RotateCw size={30} className="text-indigo-300 mb-1" />
              <span className="text-base font-black text-white tracking-wide">
                +{gestureFeedback.seconds}s
              </span>
              <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider mt-0.5">
                Aage
              </span>
            </div>
          </div>
        )}

        {/* Center Double-Tap (Play / Pause) */}
        {gestureFeedback.zone === 'center' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-15 animate-in fade-in zoom-in-90 duration-150">
            <div className="flex flex-col items-center justify-center w-18 h-18 rounded-full bg-slate-950/85 border border-white/30 backdrop-blur-md shadow-2xl">
              {gestureFeedback.action === 'play' ? (
                <Play size={32} className="text-white fill-white ml-0.5" />
              ) : (
                <Pause size={32} className="text-white fill-white" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM CONTROLS BAR: 3 DOT BUTTON NICHE JO THA USHI ME ADD KIYA QUALITY CHANGE OPTION ── */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 pt-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-20 pointer-events-auto">
        {/* Progress Scrubber */}
        <div
          className="h-1.5 bg-slate-700/80 hover:h-2.5 rounded-full w-full cursor-pointer transition-all duration-150 mb-2 relative group"
          onClick={(e) => {
            if (videoRef.current && duration > 0) {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              videoRef.current.currentTime = percent * duration;
            }
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full relative"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow border border-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Bottom Controls Row: Left = Volume & Time, Right = Quality & 3-Dot Options */}
        <div className="flex items-center justify-between text-white text-xs">
          {/* Left Controls: Volume / Mute, Time Counter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition active:scale-90 flex items-center justify-center"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            <span className="text-[11px] font-mono text-slate-300 ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls: Quality Badge & NSTA Logo Button (replaces 3-dot in bottom bar) */}
          <div className="flex items-center gap-2 relative">
            {/* Active Quality Badge */}
            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
              {selectedQuality}
            </span>

            {/* NSTA Logo Button: Wahi pe rahega, rotate hone par bhi bottom bar me rahega (upar na jayega) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNstaLogoClick();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/25 hover:border-indigo-400 text-white text-[11px] font-bold shadow-md transition active:scale-90 cursor-pointer"
              title={isTopBarHidden ? 'Top Bar Dikhayein' : 'Top Bar Chhupayein'}
            >
              <img
                src={appLogo || '/branding/nsta-logo.png'}
                alt={appName || 'NSTA'}
                className="w-4 h-4 object-contain rounded-full shadow-sm shrink-0"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%236366f1"><circle cx="12" cy="12" r="10"/></svg>';
                }}
              />
              <span className="text-[10px] font-black tracking-wider text-slate-100 uppercase">
                {appName || 'NSTA'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Video Error Overlay with Retry ── */}
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
          </div>
        </div>
      )}
    </div>
  );

  if ((isFullscreen || isRotated) && typeof document !== 'undefined') {
    return createPortal(playerNode, document.body);
  }
  return playerNode;
};

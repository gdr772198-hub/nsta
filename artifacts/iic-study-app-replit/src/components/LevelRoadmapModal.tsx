import React, { useState, useEffect } from 'react';
import { 
  X, Trophy, Lock, Unlock, Play, CheckCircle2, Sparkles, ChevronRight, 
  ExternalLink, Video, Info, Flame, Eye, Share2, UploadCloud, Loader2,
  ChevronLeft, Image as ImageIcon, Code, Sparkle
} from 'lucide-react';
import { 
  LEVEL_MILESTONES, LevelMilestone, FeatureUnlockItem,
  isFeatureUnlockedForUser, getEffectiveFeatureItem, getAllRoadmapCustomContent,
  getEffectiveLevelMilestones, ALL_ROADMAP_FEATURES
} from '../constants/levelRoadmapData';
import { getOptimizedVideoUrl, uploadToCloudinary } from '../services/cloudinaryService';

interface LevelRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLevel: number;
  userXp?: number;
  userRole?: string;
  onNavigateToFeature?: (featureId: string) => void;
  onOpenAdminManager?: (featureId?: string) => void;
}

export const LevelRoadmapModal: React.FC<LevelRoadmapModalProps> = ({
  isOpen,
  onClose,
  userLevel,
  userXp = 0,
  userRole = 'STUDENT',
  onNavigateToFeature,
  onOpenAdminManager,
}) => {
  // Custom updates listener
  const [refreshKey, setRefreshKey] = useState(0);

  const effectiveMilestones = React.useMemo(() => {
    return getEffectiveLevelMilestones();
  }, [refreshKey, isOpen]);

  const [selectedLevelNum, setSelectedLevelNum] = useState<number>(1);
  const selectedMilestone = effectiveMilestones.find(m => m.level === selectedLevelNum) || effectiveMilestones[0] || LEVEL_MILESTONES[0];

  const [activeVideoModal, setActiveVideoModal] = useState<{ feature: FeatureUnlockItem; videoIndex: number } | null>(null);
  const [activeImageModal, setActiveImageModal] = useState<string | null>(null);
  const [featureImageIndices, setFeatureImageIndices] = useState<Record<string, number>>({});

  useEffect(() => {
    const handleCustomUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('nsta-roadmap-content-updated', handleCustomUpdate);
    return () => window.removeEventListener('nsta-roadmap-content-updated', handleCustomUpdate);
  }, []);

  // Default selected milestone based on user's current level
  useEffect(() => {
    const current = effectiveMilestones.find(m => m.level === userLevel) || effectiveMilestones[0] || LEVEL_MILESTONES[0];
    setSelectedLevelNum(current.level);
  }, [userLevel, isOpen]);

  if (!isOpen) return null;

  // Next image for a feature's gallery
  const cycleFeatureImage = (featureId: string, total: number, dir: 1 | -1, e: React.MouseEvent) => {
    e.stopPropagation();
    setFeatureImageIndices(prev => {
      const current = prev[featureId] || 0;
      const next = (current + dir + total) % total;
      return { ...prev, [featureId]: next };
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="relative p-4 sm:p-6 bg-gradient-to-r from-slate-950 via-indigo-950/80 to-slate-950 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/10 text-amber-400">
              <Trophy className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  Feature Unlock Roadmap
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
                  Level 1–5 Plan
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Aapka Status: <strong className="text-amber-400">Level {userLevel}</strong> • <strong className="text-emerald-400">{userXp} XP</strong> Earned
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(userRole === 'ADMIN' || userRole === 'SUB_ADMIN' || userRole === 'SUPER_ADMIN') && onOpenAdminManager && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAdminManager();
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Admin Manager kholiye (Level, Sub-level, Pics, Videos, Text, HTML/CSS update karein)"
              >
                <span>⚙️ Manage Roadmap</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Level Milestone Tabs (Horizontal Pill Selector) */}
        <div className="flex items-center gap-2 p-3 bg-slate-950/70 border-b border-white/5 overflow-x-auto scrollbar-none">
          {effectiveMilestones.map((m) => {
            const isCurrent = userLevel === m.level;
            const isUnlocked = userLevel >= m.level;
            const isSelected = selectedMilestone.level === m.level;

            return (
              <button
                key={m.level}
                onClick={() => setSelectedLevelNum(m.level)}
                className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                    : isUnlocked
                    ? 'bg-slate-800/80 hover:bg-slate-800 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 border-white/5 opacity-80'
                }`}
              >
                <span>{m.emoji}</span>
                <span>Level {m.level}</span>
                {isUnlocked ? (
                  <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-emerald-400'}`} />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                )}
                {isCurrent && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${isSelected ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/30 text-amber-300'}`}>
                    YOU
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Milestone Banner */}
          <div className="relative rounded-2xl p-4 sm:p-5 border border-white/10 bg-gradient-to-br from-slate-800/80 via-slate-850 to-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl">{selectedMilestone.emoji}</span>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Level {selectedMilestone.level}: {selectedMilestone.title}
                </h3>
                <span className="text-xs text-amber-400/90 font-semibold">({selectedMilestone.hindiTitle})</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {selectedMilestone.summary}
              </p>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              {userLevel >= selectedMilestone.level ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                  <Unlock className="w-4 h-4" /> Unlocked &amp; Ready
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                  <Lock className="w-4 h-4" /> Unlocks at Level {selectedMilestone.level} ({selectedMilestone.xpNeeded} XP)
                </div>
              )}
            </div>
          </div>

          {/* Sub-stages Display */}
          <div className="space-y-6">
            {selectedMilestone.stages.map((stage) => (
              <div key={stage.stageId} className="space-y-3">
                {/* Stage Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-amber-300">
                      {stage.stageLabel}
                    </h4>
                    <span className="text-xs text-slate-400">({stage.minXp} XP required)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    {stage.description}
                  </span>
                </div>

                {/* Features Grid in this Sub-stage */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stage.features.map((baseFeature) => {
                    const feature = getEffectiveFeatureItem(baseFeature);
                    const isUnlocked = isFeatureUnlockedForUser(feature.id, userLevel, userXp, userRole);
                    const currentImgIdx = featureImageIndices[feature.id] || 0;
                    const activeImageUrl = feature.images[currentImgIdx] || feature.images[0];
                    const hasVideos = feature.videos && feature.videos.length > 0;
                    const hasMultipleImages = feature.images && feature.images.length > 1;

                    return (
                      <div
                        key={feature.id}
                        className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                          isUnlocked 
                            ? 'bg-slate-850/80 border-white/10 hover:border-amber-500/40 hover:bg-slate-800/90 shadow-lg' 
                            : 'bg-slate-900/40 border-white/5 opacity-80'
                        }`}
                      >
                        {/* Media Header (Unlimited Images & Videos) */}
                        <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
                          {activeImageUrl ? (
                            <img 
                              src={activeImageUrl} 
                              alt={feature.title}
                              onClick={() => setActiveImageModal(activeImageUrl)}
                              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer ${!isUnlocked ? 'filter grayscale contrast-125' : ''}`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-950 to-slate-900 text-slate-500">
                              <Sparkles className="w-12 h-12 opacity-30" />
                            </div>
                          )}

                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40 pointer-events-none" />

                          {/* Stage & Unlock Badge */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-bold text-white shadow-md">
                            {isUnlocked ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            <span>{feature.badgeText || feature.stageLabel}</span>
                          </div>

                          {/* Image Gallery Cycle Controls if multiple images */}
                          {hasMultipleImages && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-white/10">
                              <button
                                onClick={(e) => cycleFeatureImage(feature.id, feature.images.length, -1, e)}
                                className="p-0.5 text-slate-300 hover:text-white cursor-pointer"
                                title="Previous image"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-[10px] font-mono text-amber-300 font-bold px-1">
                                {currentImgIdx + 1}/{feature.images.length}
                              </span>
                              <button
                                onClick={(e) => cycleFeatureImage(feature.id, feature.images.length, 1, e)}
                                className="p-0.5 text-slate-300 hover:text-white cursor-pointer"
                                title="Next image"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Video Teaser Button */}
                          {hasVideos && (
                            <button
                              onClick={() => setActiveVideoModal({ feature, videoIndex: 0 })}
                              className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/30 cursor-pointer active:scale-95 transition-all"
                              title="Watch Teaser Video"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Teaser ({feature.videos.length})</span>
                            </button>
                          )}
                        </div>

                        {/* Body Content */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-baseline justify-between gap-2">
                              <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                                {feature.title}
                              </h4>
                            </div>
                            <p className="text-xs text-amber-400/90 font-medium mb-1.5">
                              {feature.hindiTitle}
                            </p>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {feature.customText || feature.description}
                            </p>
                          </div>

                          {/* Custom Injected HTML & CSS from Admin */}
                          {feature.customHtml && (
                            <div className="pt-2 border-t border-white/5">
                              {feature.customCss && <style dangerouslySetInnerHTML={{ __html: feature.customCss }} />}
                              <div dangerouslySetInnerHTML={{ __html: feature.customHtml }} />
                            </div>
                          )}

                          {/* Footer Actions */}
                          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                            {isUnlocked ? (
                              <button
                                onClick={() => {
                                  if (onNavigateToFeature) {
                                    onNavigateToFeature(feature.id);
                                    onClose();
                                  }
                                }}
                                className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                              >
                                <span>Open Feature</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-semibold">
                                <Lock className="w-3 h-3 shrink-0" />
                                <span>{feature.stageLabel} ({feature.minXpNeeded} XP) par unlock hoga</span>
                              </div>
                            )}

                            {(userRole === 'ADMIN' || userRole === 'SUB_ADMIN' || userRole === 'SUPER_ADMIN') && onOpenAdminManager && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onOpenAdminManager(feature.id);
                                }}
                                className="text-[10px] text-indigo-300 hover:text-indigo-200 underline cursor-pointer"
                              >
                                Edit Level &amp; Media
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="p-3.5 bg-slate-950 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Tip:</strong> Padhai karne, notes read karne aur quiz solve karne se aapke Level aur Features unlock hote hain!
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black tracking-wide transition-all shadow-md cursor-pointer"
          >
            Samajh Gaya (Close)
          </button>
        </div>
      </div>

      {/* Video Preview Popup Modal (Cloudinary Streaming) */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-3 sm:p-6 backdrop-blur-lg animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-950 border-b border-white/10 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-amber-400" />
                  {activeVideoModal.feature.title} — Teaser Video ({activeVideoModal.videoIndex + 1}/{activeVideoModal.feature.videos.length})
                </h4>
                <p className="text-xs text-amber-400/80">{activeVideoModal.feature.hindiTitle}</p>
              </div>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center">
              {activeVideoModal.feature.videos[activeVideoModal.videoIndex] ? (
                <video
                  src={getOptimizedVideoUrl(activeVideoModal.feature.videos[activeVideoModal.videoIndex])}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <Video className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-300">Is feature ka video preview jald upload hoga.</p>
                </div>
              )}
            </div>

            {/* Video Selector if multiple videos */}
            {activeVideoModal.feature.videos.length > 1 && (
              <div className="p-2 bg-slate-950/80 border-t border-white/5 flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] text-slate-400 font-bold px-1">Other Videos:</span>
                {activeVideoModal.feature.videos.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveVideoModal(prev => prev ? { ...prev, videoIndex: idx } : null)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeVideoModal.videoIndex === idx
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Part {idx + 1}
                  </button>
                ))}
              </div>
            )}

            <div className="p-4 bg-slate-950 border-t border-white/10 flex items-center justify-between text-xs">
              <p className="text-slate-400 max-w-md truncate">{activeVideoModal.feature.description}</p>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
              >
                Theek Hai (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {activeImageModal && (
        <div 
          onClick={() => setActiveImageModal(null)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 backdrop-blur-lg animate-fadeIn cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <img src={activeImageModal} alt="" className="w-full h-full object-contain" />
            <button
              onClick={() => setActiveImageModal(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

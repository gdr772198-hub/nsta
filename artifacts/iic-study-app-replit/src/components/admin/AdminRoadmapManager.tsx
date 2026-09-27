import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, Video, Sparkles, CheckCircle2, AlertCircle, Loader2, Play, 
  Trash2, Plus, Image as ImageIcon, Code, Eye, FileText, ArrowUp, ArrowDown,
  RefreshCw, RotateCcw, ExternalLink, HelpCircle, Layers, Check, Copy, Film,
  Smartphone, Filter
} from 'lucide-react';
import { 
  LEVEL_MILESTONES, ALL_ROADMAP_FEATURES, FeatureUnlockItem, FeatureCustomContent,
  getAllRoadmapCustomContent, ROADMAP_CUSTOM_STORAGE_KEY, getEffectiveFeatureItem,
  getFeaturesUnlockedAtLevel, ROADMAP_STAGE_OPTIONS, getEffectiveLevelMilestones
} from '../../constants/levelRoadmapData';
import { uploadToCloudinary, getOptimizedVideoUrl, CLOUDINARY_CONFIG } from '../../services/cloudinaryService';
import { uploadImageToImgBB } from '../../services/imgbbService';
import { db, rtdb } from '../../firebase';
import { doc as fsDoc, setDoc as fsSetDoc, getDoc as fsGetDoc } from 'firebase/firestore';
import { ref as rtdbRef, set as rtdbSet, get as rtdbGet } from 'firebase/database';

export const AdminRoadmapManager: React.FC = () => {
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>(() => {
    try {
      const preselected = sessionStorage.getItem('nst_admin_roadmap_feature_id');
      if (preselected) {
        sessionStorage.removeItem('nst_admin_roadmap_feature_id');
        if (ALL_ROADMAP_FEATURES.some(f => f.id === preselected)) {
          return preselected;
        }
      }
    } catch {}
    return 'DOT_MENU_3';
  });
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Custom content state for all features
  const [allCustomContent, setAllCustomContent] = useState<Record<string, FeatureCustomContent>>(() => {
    return getAllRoadmapCustomContent();
  });

  // Current feature draft state
  const currentBaseFeature = ALL_ROADMAP_FEATURES.find(f => f.id === selectedFeatureId) || ALL_ROADMAP_FEATURES[0];
  const currentEffective = getEffectiveFeatureItem(currentBaseFeature);

  // Active editing draft
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [videosList, setVideosList] = useState<string[]>([]);
  const [customText, setCustomText] = useState<string>('');
  const [customHtml, setCustomHtml] = useState<string>('');
  const [customCss, setCustomCss] = useState<string>('');
  const [badgeText, setBadgeText] = useState<string>('');

  // Custom Level & Sub-Level Override Draft State
  const [customLevel, setCustomLevel] = useState<number>(1);
  const [customStageId, setCustomStageId] = useState<string>('1');
  const [customStageLabel, setCustomStageLabel] = useState<string>('');
  const [customMinXpNeeded, setCustomMinXpNeeded] = useState<number>(0);
  const [customStageOrder, setCustomStageOrder] = useState<number>(1.0);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customHindiTitle, setCustomHindiTitle] = useState<string>('');

  // Media input helpers
  const [manualImageUrl, setManualImageUrl] = useState<string>('');
  const [manualVideoUrl, setManualVideoUrl] = useState<string>('');
  
  // Upload states
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<number>(0);
  const [isUploadingVideo, setIsUploadingVideo] = useState<boolean>(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number>(0);

  // Preview & active tab inside editor
  const [activeTab, setActiveTab] = useState<'LEVEL_STAGE' | 'MEDIA' | 'CONTENT' | 'HTML_CSS' | 'PREVIEW'>('LEVEL_STAGE');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingCloud, setIsSavingCloud] = useState<boolean>(false);

  // Load selected feature into draft
  useEffect(() => {
    const custom = allCustomContent[selectedFeatureId] || {};
    const base = currentBaseFeature;
    setImagesList(custom.images && custom.images.length > 0 ? custom.images : (base.images || []));
    setVideosList(custom.videos && custom.videos.length > 0 ? custom.videos : (base.videos || []));
    setCustomText(custom.customText !== undefined ? custom.customText : (base.customText || base.description));
    setCustomHtml(custom.customHtml || '');
    setCustomCss(custom.customCss || '');
    setBadgeText(custom.badgeText || base.badgeText || '');

    const matchedStage = custom.customStageId
      ? ROADMAP_STAGE_OPTIONS.find(s => s.stageId === custom.customStageId)
      : undefined;

    setCustomLevel(custom.customLevel !== undefined ? Number(custom.customLevel) : (matchedStage ? matchedStage.level : base.requiredLevel));
    setCustomStageId(custom.customStageId || base.stageId);
    setCustomStageLabel(custom.customStageLabel || (matchedStage ? matchedStage.stageLabel : base.stageLabel));
    setCustomMinXpNeeded(custom.customMinXpNeeded !== undefined ? Number(custom.customMinXpNeeded) : (matchedStage ? matchedStage.minXpNeeded : base.minXpNeeded));
    setCustomStageOrder(custom.customStageOrder !== undefined ? Number(custom.customStageOrder) : (matchedStage ? matchedStage.stageOrder : base.stageOrder));
    setCustomTitle(custom.customTitle || base.title);
    setCustomHindiTitle(custom.customHindiTitle || base.hindiTitle);
    setStatusMessage(null);
  }, [selectedFeatureId, allCustomContent]);

  // Sync from cloud once on mount if available
  useEffect(() => {
    const fetchCloudContent = async () => {
      try {
        if (db) {
          const snap = await fsGetDoc(fsDoc(db, 'system_settings', 'roadmap_content'));
          if (snap.exists()) {
            const data = snap.data() as Record<string, FeatureCustomContent>;
            if (data && typeof data === 'object') {
              setAllCustomContent(prev => {
                const merged = { ...prev, ...data };
                localStorage.setItem(ROADMAP_CUSTOM_STORAGE_KEY, JSON.stringify(merged));
                return merged;
              });
            }
          }
        }
      } catch (e) {
        console.warn('[AdminRoadmapManager] Cloud fetch fallback to local:', e);
      }
    };
    fetchCloudContent();
  }, []);

  // Filter features by search query and level filter
  const filteredFeatures = ALL_ROADMAP_FEATURES.filter(f => {
    if (selectedLevelFilter !== 'ALL' && f.requiredLevel !== selectedLevelFilter) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return f.title.toLowerCase().includes(q) || 
           f.hindiTitle.toLowerCase().includes(q) || 
           f.id.toLowerCase().includes(q) ||
           f.stageLabel.toLowerCase().includes(q) ||
           `level ${f.requiredLevel}`.includes(q);
  });

  // Handle Multi-Image Upload directly from phone/device
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setIsUploadingImage(true);
      setImageUploadProgress(5);
      setStatusMessage(null);

      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let url = '';
        try {
          // 1. Try ImgBB CDN with auto compression
          url = await uploadImageToImgBB(file, file.name, { isHd: true });
        } catch (e1) {
          try {
            // 2. Try Cloudinary
            const res = await uploadToCloudinary(file, 'image');
            url = res.secure_url;
          } catch (e2) {
            // 3. Resilient Base64 Data URL fallback
            url = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
          }
        }
        if (url) uploadedUrls.push(url);
        setImageUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      setImagesList(prev => [...prev, ...uploadedUrls]);
      setStatusMessage({ 
        type: 'success', 
        text: `Bahut badhiya! ${uploadedUrls.length} photo(s) gallery me safaltapoorvak add ho gayi hain.` 
      });
      e.target.value = '';
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Image upload failed: ' + (err?.message || 'Error') });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const addManualImage = () => {
    if (!manualImageUrl.trim()) return;
    setImagesList(prev => [...prev, manualImageUrl.trim()]);
    setManualImageUrl('');
    setStatusMessage({ type: 'success', text: 'Image URL successfully added!' });
  };

  const removeImage = (index: number) => {
    setImagesList(prev => prev.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    setImagesList(prev => {
      const copy = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= copy.length) return copy;
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  // Handle Multi-Video Upload directly from phone/device
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setIsUploadingVideo(true);
      setVideoUploadProgress(10);
      setStatusMessage(null);

      const uploadedVideoUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let vidUrl = '';
        try {
          const res = await uploadToCloudinary(file, 'video', (progress) => {
            const singlePercent = (i / files.length) * 100 + (progress / files.length);
            setVideoUploadProgress(Math.round(singlePercent));
          });
          vidUrl = res.secure_url;
        } catch (err) {
          // Resilient Data/Blob URL fallback if Cloudinary unavailable
          vidUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }
        if (vidUrl) uploadedVideoUrls.push(vidUrl);
      }

      setVideosList(prev => [...prev, ...uploadedVideoUrls]);
      setStatusMessage({ 
        type: 'success', 
        text: `Shaandar! ${uploadedVideoUrls.length} video(s) teaser list me add ho gayi hain.` 
      });
      e.target.value = '';
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Video upload failed: ' + (err?.message || 'Error') });
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const addManualVideo = () => {
    if (!manualVideoUrl.trim()) return;
    setVideosList(prev => [...prev, manualVideoUrl.trim()]);
    setManualVideoUrl('');
    setStatusMessage({ type: 'success', text: 'Video URL link added!' });
  };

  const removeVideo = (index: number) => {
    setVideosList(prev => prev.filter((_, i) => i !== index));
  };

  const moveVideo = (index: number, direction: 'up' | 'down') => {
    setVideosList(prev => {
      const copy = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= copy.length) return copy;
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  // Save current feature changes
  const handleSaveFeature = async () => {
    try {
      setIsSavingCloud(true);
      setStatusMessage(null);

      const updatedFeatureContent: FeatureCustomContent = {
        images: imagesList,
        videos: videosList,
        customText: customText.trim(),
        customHtml: customHtml.trim(),
        customCss: customCss.trim(),
        badgeText: badgeText.trim(),
        customLevel: Number(customLevel),
        customStageId: customStageId.trim() || currentBaseFeature.stageId,
        customStageLabel: customStageLabel.trim() || currentBaseFeature.stageLabel,
        customMinXpNeeded: Number(customMinXpNeeded) || 0,
        customStageOrder: Number(customStageOrder) || Number(customLevel),
        customTitle: customTitle.trim() || currentBaseFeature.title,
        customHindiTitle: customHindiTitle.trim() || currentBaseFeature.hindiTitle,
        updatedAt: new Date().toISOString(),
      };

      const updatedAll = {
        ...allCustomContent,
        [selectedFeatureId]: updatedFeatureContent,
      };

      // 1. Save to local storage
      setAllCustomContent(updatedAll);
      localStorage.setItem(ROADMAP_CUSTOM_STORAGE_KEY, JSON.stringify(updatedAll));

      // Also update legacy video key for backward compatibility
      if (videosList.length > 0) {
        try {
          const storedVideos = JSON.parse(localStorage.getItem('nsta_feature_video_urls') || '{}');
          storedVideos[selectedFeatureId] = videosList[0];
          localStorage.setItem('nsta_feature_video_urls', JSON.stringify(storedVideos));
        } catch {}
      }

      // 2. Sync to Firebase Firestore & RTDB so all students get the update
      try {
        if (db) {
          await fsSetDoc(fsDoc(db, 'system_settings', 'roadmap_content'), updatedAll, { merge: true });
        }
      } catch (cloudErr) {
        console.warn('[AdminRoadmapManager] Firestore sync warning (saved locally):', cloudErr);
      }

      try {
        if (rtdb) {
          await rtdbSet(rtdbRef(rtdb, 'system_settings/roadmap_content'), updatedAll);
        }
      } catch (rtdbErr) {
        console.warn('[AdminRoadmapManager] RTDB sync warning:', rtdbErr);
      }

      // Notify running app instances
      window.dispatchEvent(new CustomEvent('nsta-roadmap-content-updated', { 
        detail: { featureId: selectedFeatureId, content: updatedFeatureContent } 
      }));

      setStatusMessage({ 
        type: 'success', 
        text: `"${customTitle || currentBaseFeature.title}" ab ${customStageLabel || `Level ${customLevel}`} (${customMinXpNeeded} XP) par set ho gaya hai aur saara media/code sync ho gaya!` 
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Save karne me samasya: ' + (err?.message || 'Unknown') });
    } finally {
      setIsSavingCloud(false);
    }
  };

  // Reset to default
  const handleResetFeature = async () => {
    const updatedAll = { ...allCustomContent };
    delete updatedAll[selectedFeatureId];

    setAllCustomContent(updatedAll);
    localStorage.setItem(ROADMAP_CUSTOM_STORAGE_KEY, JSON.stringify(updatedAll));

    try {
      if (db) {
        await fsSetDoc(fsDoc(db, 'system_settings', 'roadmap_content'), updatedAll);
      }
    } catch {}
    try {
      if (rtdb) {
        await rtdbSet(rtdbRef(rtdb, 'system_settings/roadmap_content'), updatedAll);
      }
    } catch {}

    window.dispatchEvent(new CustomEvent('nsta-roadmap-content-updated', { 
      detail: { featureId: selectedFeatureId } 
    }));

    setStatusMessage({ type: 'success', text: `"${currentBaseFeature.title}" wapas apne code default (${currentBaseFeature.stageLabel} • ${currentBaseFeature.minXpNeeded} XP) par reset ho gaya!` });
  };

  // HTML templates for 1-click insertion
  const insertTemplate = (type: 'GLOW_BANNER' | 'FEATURE_GRID' | 'ALERT_BADGE') => {
    if (type === 'GLOW_BANNER') {
      setCustomHtml(`
<div class="custom-feature-banner">
  <div class="banner-badge">✨ NSTA EXCLUSIVE</div>
  <h3>Ye Feature Aapki Padhai Ko 10x Fast Banayega!</h3>
  <p>Is milestone ko unlock karke aap real exam simulations, AI guidance aur daily streak bonuses pa sakte hain.</p>
</div>
      `.trim());
      setCustomCss(`
.custom-feature-banner {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(99, 102, 241, 0.2) 100%);
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 16px;
  padding: 18px;
  color: #ffffff;
  text-align: left;
}
.custom-feature-banner .banner-badge {
  display: inline-block;
  padding: 3px 10px;
  background: #f59e0b;
  color: #030712;
  font-weight: 900;
  font-size: 11px;
  border-radius: 999px;
  margin-bottom: 8px;
}
.custom-feature-banner h3 {
  font-size: 16px;
  font-weight: 800;
  color: #fde68a;
  margin: 0 0 6px 0;
}
.custom-feature-banner p {
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.5;
  margin: 0;
}
      `.trim());
    } else if (type === 'FEATURE_GRID') {
      setCustomHtml(`
<div class="custom-perks-container">
  <div class="perk-pill">🚀 Fast 60 FPS Access</div>
  <div class="perk-pill">🎯 100% NCERT Verified</div>
  <div class="perk-pill">💎 +50 Bonus Coins Reward</div>
</div>
      `.trim());
      setCustomCss(`
.custom-perks-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.perk-pill {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #6ee7b7;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}
      `.trim());
    } else if (type === 'ALERT_BADGE') {
      setCustomHtml(`
<div class="custom-alert-box">
  <strong>⚠️ Dhyan Dein:</strong> Ye feature unhi students ke liye active hoga jo continuous study routine follow karte hain.
</div>
      `.trim());
      setCustomCss(`
.custom-alert-box {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 12px;
}
      `.trim());
    }
    setStatusMessage({ type: 'success', text: 'HTML & CSS Template insert ho gaya!' });
  };

  return (
    <div className="p-4 sm:p-6 bg-slate-900 border border-white/10 rounded-2xl space-y-6 text-white max-w-5xl mx-auto shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Feature Roadmap &amp; Media Studio
              </h2>
              <p className="text-xs text-slate-400">
                Har feature ke liye <strong>Unlimited Pictures, Videos, Text</strong> aur <strong>Custom HTML &amp; CSS code</strong> add karein.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={handleSaveFeature}
            disabled={isSavingCloud}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSavingCloud ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Save All Changes</span>
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs animate-fadeIn ${
          statusMessage.type === 'success'
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="font-semibold">{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Feature Selector & Search */}
      <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-white/5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Select Feature to Customize ({filteredFeatures.length} / {ALL_ROADMAP_FEATURES.length}):</span>
          </label>
          <input
            type="text"
            placeholder="Search by name, stage, level..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Level Filter Tabs for Quick Level Switching */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-amber-400" />
            Level:
          </span>
          <button
            type="button"
            onClick={() => setSelectedLevelFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedLevelFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            All Levels
          </button>
          {LEVEL_MILESTONES.map((m) => (
            <button
              key={m.level}
              type="button"
              onClick={() => {
                setSelectedLevelFilter(m.level);
                // Also select first feature of this milestone
                if (m.features && m.features.length > 0) {
                  setSelectedFeatureId(m.features[0].id);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                selectedLevelFilter === m.level
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <span>{m.emoji}</span>
              <span>Level {m.level}</span>
            </button>
          ))}
        </div>

        <select
          value={selectedFeatureId}
          onChange={(e) => setSelectedFeatureId(e.target.value)}
          className="w-full p-3 rounded-xl bg-slate-900 border border-amber-500/30 text-sm font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
        >
          {LEVEL_MILESTONES.flatMap((milestone) =>
            milestone.stages.map((stage) => {
              const stageFeatures = stage.features.filter(f => filteredFeatures.some(ff => ff.id === f.id));
              if (stageFeatures.length === 0) return null;
              return (
                <optgroup
                  key={`${milestone.level}-${stage.stageId}`}
                  label={`Level ${milestone.level}: ${milestone.title} ▸ ${stage.stageLabel}`}
                >
                  {stageFeatures.map((feat) => {
                    const custom = allCustomContent[feat.id];
                    const eff = getEffectiveFeatureItem(feat);
                    const isLevelMoved = eff.requiredLevel !== feat.requiredLevel || eff.stageId !== feat.stageId;
                    const imgCount = (custom?.images?.length ?? feat.images.length);
                    const vidCount = (custom?.videos?.length ?? feat.videos.length);
                    const hasCode = !!(custom?.customHtml || custom?.customCss);
                    return (
                      <option key={feat.id} value={feat.id}>
                        {eff.stageLabel} • {eff.title} ({eff.hindiTitle}) {isLevelMoved ? `[🎯 Moved from ${feat.stageLabel}] ` : ''}[🖼️ {imgCount} | 🎥 {vidCount} {hasCode ? '| ⚡ Code' : ''}]
                      </option>
                    );
                  })}
                </optgroup>
              );
            })
          )}
        </select>

        {/* Selected Feature Info Pill */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px]">
              Active: {customStageLabel || currentEffective.stageLabel} (Lv {customLevel} • {customMinXpNeeded} XP)
            </span>
            {(customLevel !== currentBaseFeature.requiredLevel || customStageId !== currentBaseFeature.stageId) && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-[10px]">
                Code Default: {currentBaseFeature.stageLabel} (Lv {currentBaseFeature.requiredLevel})
              </span>
            )}
            <span className="text-slate-300 font-bold">{customTitle || currentBaseFeature.title}</span>
            <span className="text-amber-400/90 font-medium">({customHindiTitle || currentBaseFeature.hindiTitle})</span>
          </div>

          <button
            onClick={handleResetFeature}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Reset this feature back to standard code defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Code Default</span>
          </button>
        </div>
      </div>

      {/* Editor Sub-Tabs */}
      <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-white/5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('LEVEL_STAGE')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'LEVEL_STAGE'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-amber-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>🎯 Set Level &amp; Sub-Level</span>
        </button>

        <button
          onClick={() => setActiveTab('MEDIA')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'MEDIA'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Unlimited Pics &amp; Videos ({imagesList.length + videosList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CONTENT')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'CONTENT'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Description &amp; Badge</span>
        </button>

        <button
          onClick={() => setActiveTab('HTML_CSS')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'HTML_CSS'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Custom HTML &amp; CSS Code</span>
        </button>

        <button
          onClick={() => setActiveTab('PREVIEW')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'PREVIEW'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-emerald-400 hover:text-emerald-300 hover:bg-white/5'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Live Feature Card Preview</span>
        </button>
      </div>

      {/* ──────────────── TAB 0: UNLOCK LEVEL & SUB-LEVEL CONTROL ──────────────── */}
      {activeTab === 'LEVEL_STAGE' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Feature Unlock Level &amp; Sub-Level Control (लेवल एवं सब-लेवल बदलें)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Agar code me ye feature <strong>{currentBaseFeature.stageLabel} (Level {currentBaseFeature.requiredLevel})</strong> par hai, to aap apne man se ise kisi bhi alag <strong>Level</strong> ya <strong>Sub-Level</strong> par set kar sakte hain!
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setCustomLevel(currentBaseFeature.requiredLevel);
                setCustomStageId(currentBaseFeature.stageId);
                setCustomStageLabel(currentBaseFeature.stageLabel);
                setCustomMinXpNeeded(currentBaseFeature.minXpNeeded);
                setCustomStageOrder(currentBaseFeature.stageOrder);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Code Default ({currentBaseFeature.stageLabel})</span>
            </button>
          </div>

          {/* 1-Click Stage Preset Matrix by Level */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 block">
              1-Click Level &amp; Sub-Level Selector (जिस Level या Sub-Level पर अनलॉक करना है उसे चुनें):
            </label>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((lvl) => {
                const stagesForLvl = ROADMAP_STAGE_OPTIONS.filter(s => s.level === lvl);
                const isLvlSelected = Number(customLevel) === lvl;
                return (
                  <div
                    key={lvl}
                    className={`p-3 rounded-xl border transition-all space-y-2 ${
                      isLvlSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5'
                        : 'bg-slate-900/70 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className={`text-xs font-black uppercase ${isLvlSelected ? 'text-amber-300' : 'text-slate-300'}`}>
                        Level {lvl}
                      </span>
                      {currentBaseFeature.requiredLevel === lvl && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                          Code Default
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {stagesForLvl.map((stOpt) => {
                        const isStageSelected = customStageId === stOpt.stageId && Number(customLevel) === stOpt.level;
                        const isBaseDefault = currentBaseFeature.stageId === stOpt.stageId;
                        return (
                          <button
                            key={stOpt.stageId}
                            type="button"
                            onClick={() => {
                              setCustomLevel(stOpt.level);
                              setCustomStageId(stOpt.stageId);
                              setCustomStageLabel(stOpt.stageLabel);
                              setCustomMinXpNeeded(stOpt.minXpNeeded);
                              setCustomStageOrder(stOpt.stageOrder);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-between cursor-pointer ${
                              isStageSelected
                                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                                : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-white/5'
                            }`}
                          >
                            <span>{stOpt.stageLabel}</span>
                            <span className={`text-[9px] font-mono ${isStageSelected ? 'text-slate-900 font-black' : 'text-slate-500'}`}>
                              {stOpt.minXpNeeded} XP {isBaseDefault ? '★' : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fine-grained Manual Level, Sub-Level & XP Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-white/10">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Unlock Level (1 – 15):</label>
              <select
                value={customLevel}
                onChange={(e) => {
                  const newLvl = Number(e.target.value);
                  setCustomLevel(newLvl);
                  const firstStage = ROADMAP_STAGE_OPTIONS.find(s => s.level === newLvl);
                  if (firstStage) {
                    setCustomStageId(firstStage.stageId);
                    setCustomStageLabel(firstStage.stageLabel);
                    setCustomMinXpNeeded(firstStage.minXpNeeded);
                    setCustomStageOrder(firstStage.stageOrder);
                  } else {
                    setCustomStageId(`${newLvl}(Entry)`);
                    setCustomStageLabel(`Level ${newLvl} (Entry)`);
                    setCustomMinXpNeeded(newLvl * 2500);
                    setCustomStageOrder(newLvl);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs font-bold text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {Array.from({ length: 15 }, (_, i) => i + 1).map(lvl => (
                  <option key={lvl} value={lvl}>
                    Level {lvl} {lvl === currentBaseFeature.requiredLevel ? '(Code Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Sub-Level / Stage ID:</label>
              <select
                value={ROADMAP_STAGE_OPTIONS.some(s => s.stageId === customStageId) ? customStageId : 'CUSTOM'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'CUSTOM') return;
                  const found = ROADMAP_STAGE_OPTIONS.find(s => s.stageId === val);
                  if (found) {
                    setCustomLevel(found.level);
                    setCustomStageId(found.stageId);
                    setCustomStageLabel(found.stageLabel);
                    setCustomMinXpNeeded(found.minXpNeeded);
                    setCustomStageOrder(found.stageOrder);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs font-bold text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {ROADMAP_STAGE_OPTIONS.map(st => (
                  <option key={st.stageId} value={st.stageId}>
                    {st.stageLabel} — {st.minXpNeeded} XP {st.stageId === currentBaseFeature.stageId ? '(Default)' : ''}
                  </option>
                ))}
                <option value="CUSTOM">Custom Stage ID ({customStageId})</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Display Stage Label:</label>
              <input
                type="text"
                value={customStageLabel}
                onChange={(e) => setCustomStageLabel(e.target.value)}
                placeholder="e.g. Level 3 (ii)"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Required XP (Sub-Level XP):</label>
              <input
                type="number"
                min={0}
                step={50}
                value={customMinXpNeeded}
                onChange={(e) => setCustomMinXpNeeded(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs font-bold text-emerald-300 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Custom Feature Title & Hindi Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Feature Title (English):</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={currentBaseFeature.title}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Feature Title (Hindi):</label>
              <input
                type="text"
                value={customHindiTitle}
                onChange={(e) => setCustomHindiTitle(e.target.value)}
                placeholder={currentBaseFeature.hindiTitle}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <span className="text-indigo-200">
              💡 <strong>Note:</strong> Jaise hi aap <strong>"Save All Changes"</strong> dabayenge, ye feature student ke app aur Roadmap me turant <strong>{customStageLabel || `Level ${customLevel}`} ({customMinXpNeeded} XP)</strong> par shift ho jayega!
            </span>
            <button
              type="button"
              onClick={handleSaveFeature}
              disabled={isSavingCloud}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 cursor-pointer"
            >
              Save Level &amp; Stage Now
            </button>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 1: UNLIMITED PICS & VIDEOS ──────────────── */}
      {activeTab === 'MEDIA' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Section A: Images Manager */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Unlimited Pictures / Screenshots ({imagesList.length} Attached)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Is feature ke liye kitne bhi screenshots, banners ya infographics upload karein.
                </p>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                Cloudinary &amp; URL Support
              </span>
            </div>

            {/* Add Image Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {/* File Upload */}
              <div className="p-3 rounded-xl bg-slate-900 border border-dashed border-amber-500/40 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                    📱 Mobile / Device se Direct Photos Upload Karein:
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Ek saath kitne bhi photos select karein — link paste karne ki koi jhanjhat nahi.
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isUploadingImage}
                  onChange={handleImageUpload}
                  className="w-full text-[11px] text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-black file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                />
                {isUploadingImage && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold">
                      <span>Uploading pictures...</span>
                      <span>{imageUploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${imageUploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* URL Input */}
              <div className="p-3 rounded-xl bg-slate-900 border border-white/10 flex flex-col justify-between space-y-2">
                <span className="text-[11px] font-bold text-slate-300">Ya Direct Image URL Paste Karein:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... ya ImgBB link"
                    value={manualImageUrl}
                    onChange={(e) => setManualImageUrl(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500"
                  />
                  <button
                    onClick={addManualImage}
                    disabled={!manualImageUrl.trim()}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs disabled:opacity-40 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Images Grid */}
            {imagesList.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                {imagesList.map((imgUrl, idx) => (
                  <div key={idx} className="group relative rounded-xl overflow-hidden bg-slate-900 border border-white/10 aspect-video flex flex-col">
                    <img 
                      src={imgUrl} 
                      alt={`Pic ${idx + 1}`} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                      <button
                        onClick={() => moveImage(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Left/Up"
                        className="p-1 rounded bg-slate-800 text-white hover:bg-amber-500 hover:text-slate-950 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveImage(idx, 'down')}
                        disabled={idx === imagesList.length - 1}
                        title="Move Right/Down"
                        className="p-1 rounded bg-slate-800 text-white hover:bg-amber-500 hover:text-slate-950 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeImage(idx)}
                        title="Delete image"
                        className="p-1 rounded bg-rose-500/80 text-white hover:bg-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/70 text-[9px] font-mono text-amber-300">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 text-center text-xs text-slate-400">
                Abhi is feature me koi custom image add nahi hai. Upar se upload ya link karein.
              </div>
            )}
          </div>

          {/* Section B: Videos Manager */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Unlimited Teaser Videos ({videosList.length} Attached)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Har feature ke liye demo clip, walkthrough ya explanation video attach karein.
                </p>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                Cloudinary Stream &amp; MP4
              </span>
            </div>

            {/* Add Video Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {/* Direct Video Upload */}
              <div className="p-3 rounded-xl bg-slate-900 border border-dashed border-amber-500/40 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-amber-400" />
                    📱 Mobile / Device se Direct Videos Upload Karein:
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Phone gallery se video clips chunein — direct upload &amp; streaming without external link.
                  </p>
                </div>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  disabled={isUploadingVideo}
                  onChange={handleVideoUpload}
                  className="w-full text-[11px] text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-black file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                />
                {isUploadingVideo && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold">
                      <span>Uploading video(s)...</span>
                      <span>{videoUploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${videoUploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Video Link */}
              <div className="p-3 rounded-xl bg-slate-900 border border-white/10 flex flex-col justify-between space-y-2">
                <span className="text-[11px] font-bold text-slate-300">Ya Cloudinary/MP4 Video URL Paste Karein:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://res.cloudinary.com/.../video.mp4"
                    value={manualVideoUrl}
                    onChange={(e) => setManualVideoUrl(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500"
                  />
                  <button
                    onClick={addManualVideo}
                    disabled={!manualVideoUrl.trim()}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs disabled:opacity-40 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Video List */}
            {videosList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                {videosList.map((vidUrl, idx) => (
                  <div key={idx} className="rounded-xl overflow-hidden bg-slate-900 border border-white/10 flex flex-col justify-between">
                    <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                      <video
                        src={getOptimizedVideoUrl(vidUrl)}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-bold text-amber-300">
                        Video #{idx + 1}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-950 border-t border-white/5 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 truncate flex-1 font-mono">
                        {vidUrl.split('/').pop() || vidUrl}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => moveVideo(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded bg-slate-800 text-white hover:bg-amber-500 hover:text-slate-950 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveVideo(idx, 'down')}
                          disabled={idx === videosList.length - 1}
                          className="p-1 rounded bg-slate-800 text-white hover:bg-amber-500 hover:text-slate-950 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeVideo(idx)}
                          className="p-1 rounded bg-rose-500/80 text-white hover:bg-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 text-center text-xs text-slate-400">
                Is feature ke liye koi video attach nahi hai. Upar se teaser video upload ya link paste karein.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────── TAB 2: TEXT DESCRIPTION & BADGE ──────────────── */}
      {activeTab === 'CONTENT' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-4 animate-fadeIn">
          <div>
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Custom Text &amp; Badge Information
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Feature ke baare me Hindi ya English me detail me likhein jisse student samjhe ki ise kaise use karna hai.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Feature Description (Text):</label>
            <textarea
              rows={4}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Is feature ka purpose, unlock requirements aur benefits..."
              className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Custom Badge Text:</label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="e.g. VIP UNLOCK, FREE, FAST 60FPS"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Stage Info (Auto):</label>
              <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-amber-300/90 font-bold">
                {currentBaseFeature.stageLabel} (Stage {currentBaseFeature.stageId})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 3: CUSTOM HTML & CSS CODE ──────────────── */}
      {activeTab === 'HTML_CSS' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Code className="w-4 h-4" />
                Custom HTML &amp; CSS Code Injection
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Is feature card ya popup me custom HTML markup aur CSS styling add karein.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-400 font-bold">Quick Templates:</span>
              <button
                onClick={() => insertTemplate('GLOW_BANNER')}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-[11px] font-bold transition-all cursor-pointer"
              >
                Glow Banner
              </button>
              <button
                onClick={() => insertTemplate('FEATURE_GRID')}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 text-[11px] font-bold transition-all cursor-pointer"
              >
                Perks Grid
              </button>
              <button
                onClick={() => insertTemplate('ALERT_BADGE')}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500 hover:text-slate-950 text-[11px] font-bold transition-all cursor-pointer"
              >
                Alert Box
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* HTML Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span>HTML Code:</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Raw HTML tags permitted</span>
              </div>
              <textarea
                rows={8}
                value={customHtml}
                onChange={(e) => setCustomHtml(e.target.value)}
                placeholder={'<div class="my-box">\n  <h4>Custom Highlight</h4>\n  <p>Your details here</p>\n</div>'}
                className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* CSS Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <span>CSS Styling Code:</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Scoped automatically</span>
              </div>
              <textarea
                rows={8}
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                placeholder={'.my-box {\n  background: #1e1b4b;\n  padding: 12px;\n  border-radius: 8px;\n}'}
                className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-sky-300 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Code Sandbox Preview Box */}
          {(customHtml || customCss) && (
            <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Live Code Sandbox Preview:
                </span>
                <span className="text-[10px] text-slate-400">Rendering scoped custom HTML/CSS</span>
              </div>

              {/* Scoped CSS Injector */}
              <style dangerouslySetInnerHTML={{ __html: customCss }} />
              
              {/* HTML Container */}
              <div 
                className="p-3 bg-slate-950/60 rounded-lg min-h-[60px]"
                dangerouslySetInnerHTML={{ __html: customHtml }} 
              />
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 4: LIVE FEATURE CARD PREVIEW ──────────────── */}
      {activeTab === 'PREVIEW' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4" />
              Student View Simulation ({currentBaseFeature.title})
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Student jab Level Unlock Roadmap kholega to is feature ka card kaisa dikhega:
            </p>

            {/* Simulated Feature Card */}
            <div className="max-w-md mx-auto rounded-2xl border border-white/15 bg-slate-900 overflow-hidden shadow-2xl space-y-3">
              {/* Image Preview Carousel */}
              <div className="relative aspect-video bg-black overflow-hidden">
                {imagesList.length > 0 ? (
                  <img 
                    src={imagesList[0]} 
                    alt={currentBaseFeature.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Sparkles className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-[11px] font-bold text-amber-300">
                  {badgeText || currentBaseFeature.badgeText || currentBaseFeature.stageLabel}
                </div>
                {videosList.length > 0 && (
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-black flex items-center gap-1">
                    <Play className="w-3 h-3 fill-current" />
                    <span>{videosList.length} Video Teaser</span>
                  </div>
                )}
              </div>

              {/* Text Info */}
              <div className="p-4 space-y-3">
                <div>
                  <h4 className="text-base font-bold text-white">
                    {currentBaseFeature.title}
                  </h4>
                  <p className="text-xs text-amber-400 font-semibold mt-0.5">
                    {currentBaseFeature.hindiTitle}
                  </p>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {customText || currentBaseFeature.description}
                  </p>
                </div>

                {/* Additional Images Counter if more than 1 */}
                {imagesList.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {imagesList.map((img, i) => (
                      <img key={i} src={img} alt="" className="w-12 h-8 object-cover rounded border border-white/10 shrink-0" />
                    ))}
                  </div>
                )}

                {/* Custom HTML/CSS Section if provided */}
                {customHtml && (
                  <div className="pt-2 border-t border-white/10">
                    <style dangerouslySetInnerHTML={{ __html: customCss }} />
                    <div dangerouslySetInnerHTML={{ __html: customHtml }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Sabhi changes locally aur Firebase Cloud database me save hote hain.</span>
        </div>

        <button
          onClick={handleSaveFeature}
          disabled={isSavingCloud}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          {isSavingCloud ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>Save Changes for "{currentBaseFeature.title}"</span>
        </button>
      </div>
    </div>
  );
};

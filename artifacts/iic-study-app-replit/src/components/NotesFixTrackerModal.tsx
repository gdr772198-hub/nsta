import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, Clock, MessageSquare, ShieldCheck, 
  Sparkles, RefreshCw, Award, BookOpen, Lock, ChevronRight 
} from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase';
import { isFeatureUnlockedForUser } from '../constants/levelRoadmapData';

interface NotesFixTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  userLevel: number;
  userXp: number;
  onOpenRoadmap?: () => void;
}

interface NoteSuggestion {
  id: string;
  text?: string;
  uid?: string;
  userName?: string;
  lessonTitle?: string;
  chapterKey?: string;
  pageNo?: string;
  reportCount?: number;
  status?: 'open' | 'accepted' | 'rejected' | 'fixed' | 'resolved';
  adminReply?: string;
  adminReplyAt?: string;
  createdAt?: string;
}

export const NotesFixTrackerModal: React.FC<NotesFixTrackerModalProps> = ({
  isOpen,
  onClose,
  user,
  userLevel,
  userXp,
  onOpenRoadmap,
}) => {
  const [filterTab, setFilterTab] = useState<'MY_REPORTS' | 'ALL_FIXED'>('MY_REPORTS');
  const [loading, setLoading] = useState<boolean>(true);
  const [suggestions, setSuggestions] = useState<NoteSuggestion[]>([]);

  const isUnlocked = isFeatureUnlockedForUser('NOTES_FIX_TRACKER', userLevel, userXp, user?.role);

  useEffect(() => {
    if (!isOpen || !isUnlocked) return;
    setLoading(true);

    const suggestionsRef = ref(rtdb, 'suggestions');
    const unsub = onValue(suggestionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: NoteSuggestion[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setSuggestions(list);
      } else {
        setSuggestions([]);
      }
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return () => unsub();
  }, [isOpen, isUnlocked]);

  if (!isOpen) return null;

  const currentUid = user?.uid || user?.id || '';
  const currentName = (user?.name || user?.displayName || '').toLowerCase().trim();

  const myReports = suggestions.filter(s => 
    (s.uid && s.uid === currentUid) || 
    (s.userName && s.userName.toLowerCase().trim() === currentName)
  );

  const fixedNotes = suggestions.filter(s => s.status === 'fixed' || s.status === 'resolved' || s.status === 'accepted');

  const displayedList = filterTab === 'MY_REPORTS' ? myReports : fixedNotes;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'fixed':
      case 'resolved':
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Fix Ho Gya (Resolved)
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <X className="w-3.5 h-3.5 text-rose-400" />
            Check Done
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Under Review (Jald Fix Hoga)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg text-white font-black text-lg">
              🔍
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">Notes Fix Tracker</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Level 3 (v) Power
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Aapki report ki gayi galtiyan & real-time fix status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isUnlocked ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-lg font-black text-white">Feature Locked: Level 3 (v)</h3>
              <p className="text-sm text-slate-300">
                Notes Fix Tracker <span className="text-amber-400 font-bold">Level 3 (v) (6,500 XP)</span> par unlock hota hai. Is feature se aap dekh sakte hain ki aapki bheji hui report fix hui ya nahi aur kitne students ne use support kiya.
              </p>
            </div>
            {onOpenRoadmap && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRoadmap();
                }}
                className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs transition-all shadow-lg cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Roadmap Me Dekhein
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Filter Tabs */}
            <div className="px-5 pt-3 pb-2 flex gap-2 border-b border-slate-800 bg-slate-900/50">
              <button
                onClick={() => setFilterTab('MY_REPORTS')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  filterTab === 'MY_REPORTS'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Meri Reports ({myReports.length})
              </button>
              <button
                onClick={() => setFilterTab('ALL_FIXED')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  filterTab === 'ALL_FIXED'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Sudhare Gaye Notes ({fixedNotes.length})
              </button>
            </div>

            {/* List */}
            <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                  <span className="text-xs font-semibold">Reports load ho rahi hain...</span>
                </div>
              ) : displayedList.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-slate-800/30 border border-slate-800">
                  <div className="text-3xl mb-2">📝</div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    {filterTab === 'MY_REPORTS' ? 'Aapne abhi tak koi report nahi bheji hai' : 'Abhi koi fixed note uplabdha nahi hai'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {filterTab === 'MY_REPORTS'
                      ? 'Kisi bhi lesson note me galti dikhne par "Report / Fix" button daba kar bhej sakte hain. Yahan aapko live status dikhega.'
                      : 'Jaise hi admin galtiyon ko theek karenge, yahan list update ho jayegi.'}
                  </p>
                </div>
              ) : (
                displayedList.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <h4 className="text-sm font-black text-white line-clamp-1">
                            {item.lessonTitle || 'Lesson Note Report'}
                          </h4>
                          {item.pageNo && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                              Pg {item.pageNo}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                          <span>By: {item.userName || 'Student'}</span>
                          {item.reportCount && item.reportCount > 1 && (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              🔥 {item.reportCount} reports aayi hain
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">{getStatusBadge(item.status)}</div>
                    </div>

                    {/* Report Text */}
                    {item.text && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Reported Issue:</span>
                        <p className="whitespace-pre-line leading-relaxed">{item.text}</p>
                      </div>
                    )}

                    {/* Admin Reply / Fix Action */}
                    {item.adminReply ? (
                      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-300 text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Admin Resolution / Action:
                        </div>
                        <p className="leading-relaxed">{item.adminReply}</p>
                        {item.adminReplyAt && (
                          <span className="text-[10px] text-emerald-400/70 block">
                            Resolved on: {new Date(item.adminReplyAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ) : item.status === 'fixed' || item.status === 'resolved' ? (
                      <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Galti sudhar di gayi hai aur chapter content update kar diya gaya hai!
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Admin team is review kar rahi hai. Note jald update hoga.
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Sahi galti report karne par bonus credits milte hain!</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

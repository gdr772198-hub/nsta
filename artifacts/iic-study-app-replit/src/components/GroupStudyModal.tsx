import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  MessageSquare,
  Sparkles,
  Send,
  X,
  Copy,
  Check,
  Trophy,
  Flame,
  Radio,
  ExternalLink,
  Plus,
  Lock,
  Globe,
  Award,
  Clock,
  Zap,
  HelpCircle,
  Video,
  ChevronRight,
  UserCheck,
  Minimize2,
  Compass,
  Search,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  MonitorPlay,
  FastForward,
  Timer,
  CheckCircle2,
  XCircle,
  BarChart3,
  Medal,
  Trash2,
  Crown,
  Loader2,
  Share2,
  Info,
  ChevronDown,
  Settings,
} from 'lucide-react';
import {
  type GroupStudyRoom,
  type GroupStudyMember,
  type GroupStudyMessage,
  type GroupStudyMcqQuestion,
  type StudyRoomMcqType,
  type McqAnswerOutcome,
  CURATED_MCQ_SETS,
  subscribeToActiveRooms,
  subscribeToRoom,
  createGroupRoom,
  joinGroupRoom,
  leaveGroupRoom,
  deleteGroupRoom,
  markRoomAsCreatedByMe,
  isRoomCreatedByMe,
  getCachedRooms,
  saveCachedRoom,
  sendRoomMessage,
  toggleHandRaise,
  setRoomMode,
  setRoomMcqType,
  startLiveMcqBattle,
  setRoomMcqDuration,
  setRoomMcqAutoAdvance,
  revealMcqAnswer,
  advanceMcqQuestion,
  submitMcqAnswer,
  awardFinalStreakBonus,
  autoSubmitRoom,
  endLiveMcqBattle,
  syncHostActivity,
  cleanRtdbPayload,
} from '../services/groupStudyService';
import { auth, getChapterData, saveUserToLive, subscribeMcqLessons } from '../firebase';
import { STATIC_SYLLABUS, ADMIN_EMAIL, LUCENT_SUBJECT_OPTIONS_BASE, getLucentSubjectOptions } from '../constants';
import { parseMCQText } from '../utils/mcqParser';

// Normalize any raw MCQ question to GroupStudyMcqQuestion format
function parseQuestionToGroupMcq(q: any): GroupStudyMcqQuestion | null {
  if (!q) return null;
  const questionText = String(q.question || q.title || q.prompt || '').trim();
  if (!questionText) return null;

  let rawOptions: string[] = [];
  if (Array.isArray(q.options) && q.options.length > 0) {
    rawOptions = q.options.map((o: any) => String(o ?? '').trim()).filter(Boolean);
  } else if (q.optionA || q.optionB) {
    rawOptions = [q.optionA, q.optionB, q.optionC, q.optionD]
      .map((o: any) => String(o ?? '').trim())
      .filter(Boolean);
  } else if (q.choices && Array.isArray(q.choices)) {
    rawOptions = q.choices.map((o: any) => String(o ?? '').trim()).filter(Boolean);
  }

  if (rawOptions.length < 2) return null;

  let correctIndex = 0;
  if (typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < rawOptions.length) {
    correctIndex = q.correctIndex;
  } else if (typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < rawOptions.length) {
    correctIndex = q.correctAnswer;
  } else if (typeof q.correctAnswer === 'string') {
    const ca = q.correctAnswer.trim().toLowerCase();
    const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
    if (letterMap[ca] !== undefined && letterMap[ca] < rawOptions.length) {
      correctIndex = letterMap[ca];
    } else {
      const idx = rawOptions.findIndex(opt => opt.toLowerCase() === ca);
      if (idx >= 0) correctIndex = idx;
    }
  }

  return {
    question: questionText,
    options: rawOptions.slice(0, 4),
    correctIndex,
    explanation: q.explanation ? String(q.explanation).trim() : '',
  };
}

// Competition Books Catalog for 🎯 MCQ Mode ("mcq me competition me jitne book honge sab ka option hoga")
export const COMPETITION_BOOKS = [
  { id: 'ALL', name: 'Sabhi Books (All)', emoji: '📚', tag: 'All Books' },
  { id: 'lucent', name: 'Lucent Samanya Gyan / GK', emoji: '📖', tag: 'Lucent' },
  { id: 'speedyScience', name: 'Speedy Science', emoji: '🔬', tag: 'Speedy Sci' },
  { id: 'speedySocialScience', name: 'Speedy Social Science', emoji: '🌍', tag: 'Speedy SST' },
  { id: 'sarSangrah', name: 'Sar Sangrah', emoji: '📜', tag: 'Sar Sangrah' },
  { id: 'mcq', name: 'MCQ Practice Bank', emoji: '🎯', tag: 'MCQ Bank' },
];

export function getLessonCompetitionBookId(lesson: {
  id?: string;
  lessonTitle?: string;
  subject?: string;
  bookId?: string;
  bookName?: string;
  classLevel?: string;
}): string {
  const title = (lesson.lessonTitle || '').toLowerCase();
  const sub = (lesson.subject || '').toLowerCase();
  const bid = (lesson.bookId || '').toLowerCase();
  const bname = (lesson.bookName || '').toLowerCase();

  if (bid.includes('speedy_science') || bid.includes('speedyscience') || title.includes('speedy science') || sub.includes('speedy science') || bname.includes('speedy science')) {
    return 'speedyScience';
  }
  if (bid.includes('speedy_social') || bid.includes('speedysocial') || title.includes('speedy social') || sub.includes('speedy social') || bname.includes('speedy social')) {
    return 'speedySocialScience';
  }
  if (bid.includes('sar_sangrah') || bid.includes('sarsangrah') || title.includes('sar sangrah') || sub.includes('sar sangrah') || bname.includes('sar sangrah')) {
    return 'sarSangrah';
  }
  if (bid.includes('mcq') || title.includes('mcq practice') || sub.includes('mcq practice')) {
    return 'mcq';
  }
  if (bid.includes('lucent') || title.includes('lucent') || sub.includes('lucent') || bname.includes('lucent')) {
    return 'lucent';
  }
  if (bid && bid !== 'general' && bid !== 'comp') {
    return bid;
  }
  return 'lucent';
}

export interface GroupStudyPrefilledContext {
  contentType: 'READING_NOTES' | 'WRITING_NOTES' | 'MCQ' | 'PREMIUM_MCQ' | 'FLASHCARD' | 'PDF';
  title?: string;
  subject?: string;
  chapterId?: string;
  chapterTitle?: string;
  board?: string;
  classLevel?: string;
  totalQuestions?: number;
  pdfUrl?: string;
  mcqData?: any[];
}

interface GroupStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  settings?: any;
  tierTheme: any;
  activeRoom?: GroupStudyRoom | null;
  prefilledContext?: GroupStudyPrefilledContext | null;
  onActiveRoomChange?: (room: GroupStudyRoom | null) => void;
  onOpenStore?: () => void;
  onNavigateToContent?: (target: {
    tab?: string;
    board?: string;
    classLevel?: string;
    subjectId?: string;
    subjectName?: string;
    chapterId?: string;
    chapterTitle?: string;
    mode?: 'NOTES' | 'MCQ' | 'PDF';
  }) => void;
  onUserUpdate?: (user: any) => void;
}

export const GroupStudyModal: React.FC<GroupStudyModalProps> = ({
  isOpen,
  onClose,
  user,
  settings,
  tierTheme,
  activeRoom,
  prefilledContext,
  onActiveRoomChange,
  onOpenStore,
  onNavigateToContent,
  onUserUpdate,
}) => {
  // ── Plan & Tier Permissions ───────────────────────────────────────────────
  const userTier: 'FREE' | 'BASIC' | 'ULTRA' = (user?.subscriptionLevel || 'FREE')?.toUpperCase() as any;
  const userEmail = (user?.email || auth.currentUser?.email || '').toLowerCase().trim();
  const isAdmin = Boolean(
    user?.role === 'ADMIN' ||
    user?.role === 'SUB_ADMIN' ||
    user?.isAdmin ||
    userEmail === 'n44438403@gmail.com' ||
    userEmail === ADMIN_EMAIL.toLowerCase() ||
    userEmail.includes('admin') ||
    user?.isSuperAdmin
  );

  // Limits mandated:
  // Admin: UNLIMITED rooms, up to 240 min (4 hrs) duration, up to 500 members capacity!
  // Ultra: max 5 rooms per day, max 120 min (2 hr) duration
  // Basic: max 3 rooms per day, max 60 min (1 hr) duration
  // Free: max 2 rooms per day, max 30 min duration
  const maxRoomsPerDay = isAdmin ? Infinity : (
    userTier === 'ULTRA' ? 5 :
    userTier === 'BASIC' ? 3 :
    2
  );

  const isFreeUser = userTier === 'FREE' && !isAdmin && !user?.isPro && !user?.isVip && !user?.isUltraVip;

  const maxDurationMinutesAllowed = isAdmin ? 240 : (
    userTier === 'ULTRA' ? 120 :
    userTier === 'BASIC' ? 60 :
    30
  );

  const durationOptions = useMemo(() => {
    if (isAdmin) return [15, 30, 45, 60, 90, 120, 180, 240];
    if (userTier === 'ULTRA') return [30, 60, 90, 120];
    if (userTier === 'BASIC') return [15, 30, 45, 60];
    return [30];
  }, [isAdmin, userTier]);

  const maxRoomCapacityAllowed = isAdmin ? 500 : (
    userTier === 'ULTRA' ? 100 :
    userTier === 'BASIC' ? 35 :
    15
  );

  const isCreateRoomGloballyHidden = false;

  // ── Daily Created Rooms Tracking ──────────────────────────────────────────
  const [todayCreatedRoomsCount, setTodayCreatedRoomsCount] = useState<number>(0);
  const [upgradePromptReason, setUpgradePromptReason] = useState<'DAILY_ROOM_LIMIT' | 'HOST_BATTLE' | null>(null);

  const getTodayDateKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  const getRecordedCreatedRoomsToday = () => {
    try {
      const key = `group_study_created_rooms_${user?.id || 'guest'}_${getTodayDateKey()}`;
      return parseInt(localStorage.getItem(key) || '0', 10);
    } catch {
      return 0;
    }
  };

  const recordCreatedRoomToday = () => {
    if (isAdmin) return;
    try {
      const key = `group_study_created_rooms_${user?.id || 'guest'}_${getTodayDateKey()}`;
      const updated = getRecordedCreatedRoomsToday() + 1;
      localStorage.setItem(key, String(updated));
      setTodayCreatedRoomsCount(updated);
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      setTodayCreatedRoomsCount(getRecordedCreatedRoomsToday());
    }
  }, [isOpen, user?.id]);

  // ── Rooms & Navigation State ──────────────────────────────────────────────
  const [activeRooms, setActiveRooms] = useState<GroupStudyRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GroupStudyRoom | null>(() => activeRoom || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinCodeError, setJoinCodeError] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'MCQ' | 'LEADERBOARD' | 'MEMBERS'>('MCQ');

  // ── Password Protection State for Joining ─────────────────────────────────
  const [passwordModalRoom, setPasswordModalRoom] = useState<GroupStudyRoom | null>(null);
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);

  // ── Create Room Form State ────────────────────────────────────────────────
  const [newRoomName, setNewRoomName] = useState<string>('');
  const [newRoomSubject, setNewRoomSubject] = useState<string>('Lucent Samanya Gyan');
  const [newRoomPassword, setNewRoomPassword] = useState<string>('');
  const [showCreatePassword, setShowCreatePassword] = useState<boolean>(false);
  const [newRoomMcqType, setNewRoomMcqType] = useState<StudyRoomMcqType>('PROJECTOR_MODE');
  const [newRoomDurationMinutes, setNewRoomDurationMinutes] = useState<number>(maxDurationMinutesAllowed);
  const [newRoomMaxMembers, setNewRoomMaxMembers] = useState<number>(30);
  const [newRoomIsPrivate, setNewRoomIsPrivate] = useState<boolean>(false);
  const [selectedPreloadLesson, setSelectedPreloadLesson] = useState<any | null>(null);
  const [createModeClass, setCreateModeClass] = useState<string>('ALL');
  const [createModeDomain, setCreateModeDomain] = useState<'ACADEMIC' | 'COMPETITION'>('ACADEMIC');
  const [createModeBook, setCreateModeBook] = useState<string>('ALL');
  const [createModeSubject, setCreateModeSubject] = useState<string>('ALL');
  const [createModeSearch, setCreateModeSearch] = useState<string>('');
  const [createModeSourceFilter, setCreateModeSourceFilter] = useState<'ALL' | 'NOTES' | 'HOMEWORK' | 'REVISION_HUB'>('ALL');
  const [lastCreatedRoomId, setLastCreatedRoomId] = useState<string | null>(null);
  const [createdRoomIds, setCreatedRoomIds] = useState<Set<string>>(() => new Set());
  const [launchingLessonId, setLaunchingLessonId] = useState<string | null>(null);

  // ── Room Time Expiry Countdown ────────────────────────────────────────────
  const [roomSecondsLeft, setRoomSecondsLeft] = useState<number>(0);

  // ── Chat & Doubts State ───────────────────────────────────────────────────
  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatFilter, setChatFilter] = useState<'ALL' | 'DOUBTS'>('ALL');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Live MCQ Battle State ─────────────────────────────────────────────────
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnsweredCurrentQ, setHasAnsweredCurrentQ] = useState<boolean>(false);
  const [mcqSecondsLeft, setMcqSecondsLeft] = useState<number>(20);
  const [selectedCuratedSet, setSelectedCuratedSet] = useState<string>('');
  const [lastXpOutcome, setLastXpOutcome] = useState<McqAnswerOutcome | null>(null);
  const [showXpBanner, setShowXpBanner] = useState<boolean>(false);
  const [selectedTimerDuration, setSelectedTimerDuration] = useState<number>(20);
  const [revealSecondsLeft, setRevealSecondsLeft] = useState<number>(3);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState<boolean>(true);
  const [showLiveAnswersSheet, setShowLiveAnswersSheet] = useState<boolean>(false);
  const [showMobileChat, setShowMobileChat] = useState<boolean>(false);
  const [showMobileRoomInfo, setShowMobileRoomInfo] = useState<boolean>(false);
  const [showMobileInvite, setShowMobileInvite] = useState<boolean>(false);
  const [showMobileHostControls, setShowMobileHostControls] = useState<boolean>(false);
  const [showHostTimerDropdown, setShowHostTimerDropdown] = useState<boolean>(false);
  const [selectedReviewQIdx, setSelectedReviewQIdx] = useState<number | null>(null);

  // Is an MCQ actively being answered or revealed right now?
  const isMcqRunning = Boolean(
    currentRoom?.liveMcq?.isActive &&
    (currentRoom.liveMcq.status === 'QUESTION' || currentRoom.liveMcq.status === 'REVEAL')
  );

  // ── In-Room Lobby Lesson & Subject Chooser Filters (3rd Pic Screen) ──────
  const [battleDomain, setBattleDomain] = useState<'ACADEMIC' | 'COMPETITION'>('ACADEMIC');
  const [battleBook, setBattleBook] = useState<string>('ALL');
  const [battleClass, setBattleClass] = useState<string>('ALL');
  const [battleSubject, setBattleSubject] = useState<string>('ALL');
  const [battleCategory, setBattleCategory] = useState<'ALL' | 'NOTES' | 'HOMEWORK'>('ALL');
  const [battleSearch, setBattleSearch] = useState<string>('');
  const [showChapterChooser, setShowChapterChooser] = useState<boolean>(false);
  const [chooserMcqType, setChooserMcqType] = useState<StudyRoomMcqType>('PROJECTOR_MODE');
  const [chooserClass, setChooserClass] = useState<string>('ALL');
  const [chooserSubject, setChooserSubject] = useState<string>('ALL');
  const [chooserSearch, setChooserSearch] = useState<string>('');
  const [chooserSource, setChooserSource] = useState<'ALL' | 'REVISION_HUB' | 'NOTES' | 'HOMEWORK'>('ALL');
  const [isLoadingChapterMcq, setIsLoadingChapterMcq] = useState<boolean>(false);
  const [firebaseMcqLessons, setFirebaseMcqLessons] = useState<any[]>([]);

  // Subscribe to real-time mcq_lessons from Firebase / cache
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeMcqLessons((lessons) => {
      setFirebaseMcqLessons(lessons || []);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [isOpen]);

  // Keep ref to onActiveRoomChange
  const onActiveRoomChangeRef = useRef(onActiveRoomChange);
  useEffect(() => {
    onActiveRoomChangeRef.current = onActiveRoomChange;
  });

  // Sync external activeRoom changes
  useEffect(() => {
    if (activeRoom && (!currentRoom || currentRoom.id !== activeRoom.id)) {
      setCurrentRoom(activeRoom);
    }
  }, [activeRoom?.id]);

  // ── Unified Real MCQ Lessons Actually Added in the App ────────────────────
  // STRICT: Only lessons that actually contain questions are included!
  const allRealLessons = useMemo(() => {
    const lessonsMap = new Map<string, {
      id: string;
      lessonTitle: string;
      classLevel: string;
      subject: string;
      board?: string;
      bookId?: string;
      bookName?: string;
      isRevisionHub?: boolean;
      questions: GroupStudyMcqQuestion[];
      mcqCount: number;
      sourceType: 'REVISION_HUB' | 'NOTES' | 'HOMEWORK' | 'CURATED' | 'CONTEXT' | 'COMPETITION';
    }>();

    // 1. From Firebase mcq_lessons (Admin Class MCQs & Competition MCQs - Revision Hub)
    (firebaseMcqLessons || []).forEach((l: any) => {
      if (!l) return;
      const title = (l.lessonTitle || l.title || l.name || '').trim();
      if (!title) return;

      const rawQs = Array.isArray(l.mcqs) ? l.mcqs : (Array.isArray(l.mcqList) ? l.mcqList : (Array.isArray(l.parsedMcqs) ? l.parsedMcqs : []));
      const cleanQs: GroupStudyMcqQuestion[] = [];
      for (const q of rawQs) {
        const parsed = parseQuestionToGroupMcq(q);
        if (parsed) cleanQs.push(parsed);
      }

      if (cleanQs.length === 0) return; // Only include if it actually has MCQs!

      let cls = String(l.classLevel || '').trim().toUpperCase();
      if (cls.startsWith('CLASS_') || cls.startsWith('CLASS ') || cls.startsWith('CLASS-')) {
        cls = cls.replace(/^CLASS[-_ ]+/i, '');
      }
      cls = cls.replace(/(?:ST|ND|RD|TH)$/i, '');

      // Check if title, subject or book indicates competition
      const titleLower = title.toLowerCase();
      const subLower = (l.subject || '').toLowerCase();
      const isCompTitle =
        cls === 'COMPETITION' ||
        cls === 'LUCENT' ||
        titleLower.includes('lucent') ||
        titleLower.includes('speedy') ||
        titleLower.includes('sar sangrah') ||
        titleLower.includes('competition') ||
        subLower.includes('lucent') ||
        subLower.includes('speedy') ||
        subLower.includes('competition');

      if (!cls || cls === 'ALL' || cls === 'LUCENT') {
        cls = isCompTitle ? 'COMPETITION' : '10';
      }

      const effectiveCls = isCompTitle ? 'COMPETITION' : cls;

      const key = `${effectiveCls}__${title.toLowerCase()}`;
      lessonsMap.set(key, {
        id: l.id || `mcq_${title}`,
        lessonTitle: title,
        classLevel: effectiveCls,
        subject: l.subject || 'General',
        board: l.board,
        bookId: l.bookId || l.book,
        bookName: l.bookName,
        questions: cleanQs,
        mcqCount: cleanQs.length,
        sourceType: isCompTitle ? 'COMPETITION' : (l.sourceType || 'NOTES'),
        isRevisionHub: true,
      });
    });

    // 2. From Admin Lucent & Class Notes in settings
    if (Array.isArray(settings?.lucentNotes)) {
      for (const n of settings.lucentNotes) {
        if (!n || !n.lessonTitle) continue;
        const title = n.lessonTitle.trim();
        if (!title) continue;

        let cls = String(n.classLevel || '').trim().toUpperCase();
        if (cls.startsWith('CLASS_') || cls.startsWith('CLASS ')) cls = cls.replace(/CLASS[_ ]/i, '');
        if (!cls || cls === 'ALL' || cls === 'LUCENT') cls = 'COMPETITION';

        const key = `${cls}__${title.toLowerCase()}`;
        if (lessonsMap.has(key)) continue;

        const cleanQs: GroupStudyMcqQuestion[] = [];
        if (Array.isArray(n.pages)) {
          for (const page of n.pages) {
            if (!page) continue;
            let found = false;
            for (const qKey of ['mcqs', 'parsedMcqs', 'mcqList'] as const) {
              if (Array.isArray(page[qKey])) {
                for (const q of page[qKey]) {
                  const parsed = parseQuestionToGroupMcq(q);
                  if (parsed) {
                    cleanQs.push(parsed);
                    found = true;
                  }
                }
              }
            }
            if (!found && typeof page.mcqText === 'string' && page.mcqText.trim()) {
              try {
                const parsed = parseMCQText(page.mcqText.trim());
                if (parsed && Array.isArray(parsed.questions)) {
                  for (const q of parsed.questions) {
                    const pq = parseQuestionToGroupMcq(q);
                    if (pq) cleanQs.push(pq);
                  }
                }
              } catch (_) {}
            }
          }
        }

        if (cleanQs.length === 0) continue; // Only include if it actually has MCQs!

        lessonsMap.set(key, {
          id: n.id || `note_${title}`,
          lessonTitle: title,
          classLevel: cls,
          subject: n.subject || 'General',
          board: n.board,
          questions: cleanQs,
          mcqCount: cleanQs.length,
          sourceType: 'NOTES',
        });
      }
    }

    // 3. From Admin Homework & Competition Homework in settings
    if (Array.isArray(settings?.homework)) {
      for (const hw of settings.homework) {
        if (!hw) continue;
        const title = (hw.lessonTitle || hw.title || hw.name || hw.targetSubject || '').trim();
        if (!title) continue;

        let cls = String(hw.classTarget || hw.classLevel || '').trim().toUpperCase();
        if (cls.startsWith('CLASS_') || cls.startsWith('CLASS ')) cls = cls.replace(/CLASS[_ ]/i, '');
        if (!cls || cls === 'ALL' || cls === 'LUCENT' || cls === 'COMP') cls = 'COMPETITION';

        const key = `${cls}__${title.toLowerCase()}`;
        if (lessonsMap.has(key)) continue;

        const cleanQs: GroupStudyMcqQuestion[] = [];
        for (const qKey of ['parsedMcqs', 'mcqs', 'mcqList'] as const) {
          if (Array.isArray(hw[qKey])) {
            for (const q of hw[qKey]) {
              const parsed = parseQuestionToGroupMcq(q);
              if (parsed) cleanQs.push(parsed);
            }
          }
        }

        if (Array.isArray(hw.pages)) {
          for (const page of hw.pages) {
            if (!page) continue;
            let found = false;
            for (const qKey of ['mcqs', 'parsedMcqs', 'mcqList'] as const) {
              if (Array.isArray(page[qKey])) {
                for (const q of page[qKey]) {
                  const parsed = parseQuestionToGroupMcq(q);
                  if (parsed) {
                    cleanQs.push(parsed);
                    found = true;
                  }
                }
              }
            }
            if (!found && typeof page.mcqText === 'string' && page.mcqText.trim()) {
              try {
                const parsed = parseMCQText(page.mcqText.trim());
                if (parsed && Array.isArray(parsed.questions)) {
                  for (const q of parsed.questions) {
                    const pq = parseQuestionToGroupMcq(q);
                    if (pq) cleanQs.push(pq);
                  }
                }
              } catch (_) {}
            }
          }
        }

        if (cleanQs.length === 0 && typeof hw.mcqText === 'string' && hw.mcqText.trim()) {
          try {
            const parsed = parseMCQText(hw.mcqText.trim());
            if (parsed && Array.isArray(parsed.questions)) {
              for (const q of parsed.questions) {
                const pq = parseQuestionToGroupMcq(q);
                if (pq) cleanQs.push(pq);
              }
            }
          } catch (_) {}
        }

        if (cleanQs.length === 0) continue;

        lessonsMap.set(key, {
          id: hw.id || `hw_${title}`,
          lessonTitle: title,
          classLevel: cls,
          subject: hw.targetSubject || hw.subject || 'Competition Homework',
          board: hw.board,
          questions: cleanQs,
          mcqCount: cleanQs.length,
          sourceType: 'HOMEWORK',
        });
      }
    }

    // 4. Built-in curated sets (Lucent Samanya Gyan, General Science, etc.)
    CURATED_MCQ_SETS.forEach((s) => {
      if (s.questions && s.questions.length > 0) {
        const key = `COMPETITION__${s.name.toLowerCase()}`;
        if (!lessonsMap.has(key)) {
          lessonsMap.set(key, {
            id: s.id,
            lessonTitle: s.name,
            classLevel: 'COMPETITION',
            subject: s.subject || 'Competition',
            questions: s.questions,
            mcqCount: s.questions.length,
            sourceType: 'CURATED',
          });
        }
      }
    });

    // 5. From prefilledContext if present
    if (prefilledContext && Array.isArray(prefilledContext.mcqData) && prefilledContext.mcqData.length > 0) {
      const cleanQs: GroupStudyMcqQuestion[] = [];
      for (const q of prefilledContext.mcqData) {
        const parsed = parseQuestionToGroupMcq(q);
        if (parsed) cleanQs.push(parsed);
      }
      if (cleanQs.length > 0) {
        const title = prefilledContext.chapterTitle || prefilledContext.title || 'Selected Topic MCQ';
        const cls = String(prefilledContext.classLevel || user.classLevel || '10').replace(/class[_ ]/i, '').toUpperCase();
        const key = `${cls}__${title.toLowerCase()}`;
        lessonsMap.set(key, {
          id: 'context_prefilled_lesson',
          lessonTitle: title,
          classLevel: cls || '10',
          subject: prefilledContext.subject || 'General',
          questions: cleanQs,
          mcqCount: cleanQs.length,
          sourceType: 'CONTEXT',
        });
      }
    }

    return Array.from(lessonsMap.values());
  }, [firebaseMcqLessons, settings?.lucentNotes, settings?.homework, prefilledContext, user.classLevel]);

  // Available classes in sorted order
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    allRealLessons.forEach((l) => {
      if (l.classLevel) classSet.add(l.classLevel);
    });
    const order = ['10', '12', '9', '8', '7', '6', '11', 'COMPETITION'];
    return Array.from(classSet).sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [allRealLessons]);

  // Filter lessons by chosen class
  const lessonsForSelectedClass = useMemo(() => {
    if (chooserClass === 'ALL') return allRealLessons;
    return allRealLessons.filter((l) => l.classLevel === chooserClass);
  }, [allRealLessons, chooserClass]);

  // Available subjects for the chosen class
  const availableSubjectsForClass = useMemo(() => {
    const subjSet = new Set<string>();
    lessonsForSelectedClass.forEach((l) => {
      if (l.subject) subjSet.add(l.subject);
    });
    return Array.from(subjSet).sort();
  }, [lessonsForSelectedClass]);

  // Filtered lessons by source, class, subject, and search query
  const filteredRealLessons = useMemo(() => {
    let list = lessonsForSelectedClass;
    if (chooserSource !== 'ALL') {
      list = list.filter((l) => l.sourceType === chooserSource);
    }
    if (chooserSubject !== 'ALL') {
      list = list.filter((l) => l.subject === chooserSubject);
    }
    if (chooserSearch.trim()) {
      const q = chooserSearch.trim().toLowerCase();
      list = list.filter((l) =>
        l.lessonTitle.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q) ||
        (l.classLevel && l.classLevel.toLowerCase().includes(q))
      );
    }
    return list;
  }, [lessonsForSelectedClass, chooserSource, chooserSubject, chooserSearch]);

  // Academic classes (Class 6th to 12th)
  const academicClasses = useMemo(() => {
    const defaultClasses = ['6', '7', '8', '9', '10', '11', '12'];
    const found = availableClasses.filter((c) => c !== 'COMPETITION');
    const merged = Array.from(new Set([...defaultClasses, ...found]));
    const order = ['10', '12', '9', '8', '7', '6', '11'];
    return merged.sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [availableClasses]);

  // All Competition Books for MCQ Mode (including custom books from settings)
  const allCompetitionBooks = useMemo(() => {
    const list = [...COMPETITION_BOOKS];
    if (Array.isArray(settings?.customBooks)) {
      settings.customBooks.forEach((cb: any) => {
        if (cb && cb.id && cb.name && !list.some((b) => b.id === cb.id)) {
          list.push({
            id: cb.id,
            name: cb.name,
            emoji: '📗',
            tag: cb.name.slice(0, 12),
          });
        }
      });
    }
    return list;
  }, [settings?.customBooks]);

  // Lucent Subject Options (for Revision Hub Competition Mode)
  const lucentSubjectOptions = useMemo(() => {
    return getLucentSubjectOptions(settings);
  }, [settings]);

  // ── Build Available Real MCQ Sets from Syllabus / Context / App Data (In-Room 3rd Screen) ─────
  const availableBattleSets = useMemo(() => {
    const sets: Array<{
      id: string;
      name: string;
      subject: string;
      classLevel?: string;
      sourceType?: string;
      emoji: string;
      tag?: string;
      badgeColor?: string;
      questions: GroupStudyMcqQuestion[];
    }> = [];

    const isRevisionHub = currentRoom?.mcqType === 'REVISION_HUB';

    if (isRevisionHub) {
      // ⚡ MCQ + MODE: Revision Hub sets
      let revLessons = allRealLessons.filter((l) => l.isRevisionHub || l.sourceType === 'REVISION_HUB');

      if (battleDomain === 'ACADEMIC') {
        // Class 6th to 12th Board Syllabus
        revLessons = revLessons.filter((l) => l.classLevel && l.classLevel !== 'COMPETITION');
        if (battleClass !== 'ALL') {
          revLessons = revLessons.filter((l) => l.classLevel === battleClass || l.classLevel === 'ALL');
        }
        if (battleSubject !== 'ALL') {
          revLessons = revLessons.filter((l) => l.subject === battleSubject);
        }
      } else {
        // 🏆 COMPETITION in MCQ+ Mode: STRICTLY ONLY LUCENT!
        // "par mcq+ me competition me revision hub me only lucent jata hai to only lucent hi rahega bas."
        revLessons = revLessons.filter((l) => {
          const isCompClass = l.classLevel === 'COMPETITION';
          const titleLower = (l.lessonTitle || '').toLowerCase();
          const subLower = (l.subject || '').toLowerCase();
          const isLucent = titleLower.includes('lucent') || subLower.includes('lucent') || isCompClass;
          const isOtherBook = titleLower.includes('speedy') || titleLower.includes('sar sangrah');
          return isLucent && !isOtherBook;
        });

        if (battleSubject !== 'ALL') {
          revLessons = revLessons.filter((l) => l.subject === battleSubject);
        }
      }

      if (battleSearch.trim()) {
        const q = battleSearch.trim().toLowerCase();
        revLessons = revLessons.filter(
          (l) =>
            l.lessonTitle.toLowerCase().includes(q) ||
            l.subject.toLowerCase().includes(q) ||
            (l.classLevel && l.classLevel.toLowerCase().includes(q))
        );
      }

      // Sort so the user's class comes first in Academic
      const userClass = String(user?.classLevel || '10').replace(/class[_ ]/i, '').toUpperCase();
      const sortedRevLessons = [...revLessons].sort((a, b) => {
        if (battleDomain === 'ACADEMIC') {
          const aIsUserClass = a.classLevel === userClass ? 1 : 0;
          const bIsUserClass = b.classLevel === userClass ? 1 : 0;
          if (aIsUserClass !== bIsUserClass) return bIsUserClass - aIsUserClass;
        }
        return a.lessonTitle.localeCompare(b.lessonTitle);
      });

      sortedRevLessons.forEach((l) => {
        const isComp = l.classLevel === 'COMPETITION' || battleDomain === 'COMPETITION';
        const clsLabel = isComp ? '🏆 Lucent Comp' : `Class ${l.classLevel || '10'}`;
        sets.push({
          id: l.id,
          name: `${l.lessonTitle} (${clsLabel} • ${l.subject})`,
          subject: l.subject,
          classLevel: l.classLevel,
          sourceType: l.sourceType,
          emoji: '⚡',
          tag: `⚡ ${clsLabel}`,
          badgeColor: 'bg-purple-900/60 text-purple-300 border-purple-700/50',
          questions: l.questions,
        });
      });
    } else {
      // 🎯 MCQ MODE:
      if (battleDomain === 'ACADEMIC') {
        // Academic Syllabus (Class 6-12 Notes, Firebase MCQs & Homework)
        let academicLessons = allRealLessons.filter((l) => {
          return l.classLevel && l.classLevel !== 'COMPETITION';
        });

        if (battleClass !== 'ALL') {
          academicLessons = academicLessons.filter((l) => l.classLevel === battleClass || l.classLevel === 'ALL');
        }
        if (battleCategory === 'NOTES') {
          academicLessons = academicLessons.filter((l) => l.sourceType !== 'HOMEWORK');
        } else if (battleCategory === 'HOMEWORK') {
          academicLessons = academicLessons.filter((l) => l.sourceType === 'HOMEWORK');
        }

        if (battleSearch.trim()) {
          const q = battleSearch.trim().toLowerCase();
          academicLessons = academicLessons.filter(
            (l) =>
              l.lessonTitle.toLowerCase().includes(q) ||
              l.subject.toLowerCase().includes(q) ||
              (l.classLevel && l.classLevel.toLowerCase().includes(q))
          );
        }

        // Add prefilledContext if chapter was pre-selected
        if (prefilledContext && prefilledContext.mcqData && Array.isArray(prefilledContext.mcqData)) {
          const title = prefilledContext.chapterTitle || prefilledContext.title || 'Selected Chapter MCQ';
          const matchesSearch = !battleSearch.trim() || title.toLowerCase().includes(battleSearch.trim().toLowerCase());
          if (matchesSearch && (battleCategory === 'ALL' || battleCategory === 'NOTES')) {
            const qs: GroupStudyMcqQuestion[] = prefilledContext.mcqData
              .map((q: any) => parseQuestionToGroupMcq(q))
              .filter(Boolean) as GroupStudyMcqQuestion[];

            if (qs.length > 0) {
              sets.push({
                id: 'context_chapter_set',
                name: title,
                subject: prefilledContext.subject || 'General',
                classLevel: prefilledContext.classLevel,
                sourceType: 'CURATED',
                emoji: '🎯',
                tag: '🎯 Chapter',
                badgeColor: 'bg-cyan-900/60 text-cyan-300 border-cyan-700/50',
                questions: qs,
              });
            }
          }
        }

        academicLessons.forEach((l) => {
          const isHw = l.sourceType === 'HOMEWORK';
          const emoji = isHw ? '📝' : '📖';
          const typeLabel = isHw ? 'Homework' : 'Notes';
          const badgeColor = isHw
            ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50'
            : 'bg-cyan-900/60 text-cyan-300 border-cyan-700/50';

          sets.push({
            id: l.id,
            name: `${l.lessonTitle} (${typeLabel} • ${l.subject})`,
            subject: l.subject,
            classLevel: l.classLevel,
            sourceType: l.sourceType,
            emoji,
            tag: `${emoji} Class ${l.classLevel || '10'}`,
            badgeColor,
            questions: l.questions,
          });
        });
      } else {
        // 🏆 COMPETITION in MCQ Mode: ALL COMPETITION BOOKS!
        // "mcq me competition me jitne book honge sab ka option hoga"
        let compLessons = allRealLessons.filter((l) => {
          if (l.classLevel === 'COMPETITION' || l.sourceType === 'CURATED') return true;
          const titleLower = (l.lessonTitle || '').toLowerCase();
          const subLower = (l.subject || '').toLowerCase();
          return (
            titleLower.includes('lucent') ||
            titleLower.includes('speedy') ||
            titleLower.includes('sar sangrah') ||
            titleLower.includes('bssc') ||
            titleLower.includes('railway') ||
            titleLower.includes('ssc') ||
            subLower.includes('lucent') ||
            subLower.includes('speedy') ||
            subLower.includes('competition')
          );
        });

        // Filter by book if selected
        if (battleBook !== 'ALL') {
          compLessons = compLessons.filter((l) => getLessonCompetitionBookId(l) === battleBook);
        }

        if (battleSearch.trim()) {
          const q = battleSearch.trim().toLowerCase();
          compLessons = compLessons.filter(
            (l) =>
              l.lessonTitle.toLowerCase().includes(q) ||
              l.subject.toLowerCase().includes(q)
          );
        }

        compLessons.forEach((l) => {
          const bookId = getLessonCompetitionBookId(l);
          const bookMeta = allCompetitionBooks.find((b) => b.id === bookId) || {
            name: 'Competition Book',
            emoji: '🏆',
            tag: 'Competition',
          };

          sets.push({
            id: l.id,
            name: `${l.lessonTitle} (${bookMeta.name} • ${l.subject})`,
            subject: l.subject,
            classLevel: 'COMPETITION',
            sourceType: l.sourceType,
            emoji: bookMeta.emoji,
            tag: `${bookMeta.emoji} ${bookMeta.tag}`,
            badgeColor: 'bg-amber-900/60 text-amber-300 border-amber-700/50',
            questions: l.questions,
          });
        });
      }
    }

    return sets;
  }, [
    prefilledContext,
    allRealLessons,
    currentRoom?.mcqType,
    user?.classLevel,
    battleDomain,
    battleBook,
    battleClass,
    battleSubject,
    battleCategory,
    battleSearch,
    allCompetitionBooks,
  ]);

  useEffect(() => {
    if (availableBattleSets.length > 0) {
      if (!availableBattleSets.some((s) => s.id === selectedCuratedSet)) {
        setSelectedCuratedSet(availableBattleSets[0].id);
      }
    } else {
      setSelectedCuratedSet('');
    }
  }, [availableBattleSets, selectedCuratedSet]);

  // ── Available Lessons for Create Room Modal ──────────────────────────────
  const createModalBattleSets = useMemo(() => {
    const isRevision = newRoomMcqType === 'REVISION_HUB';
    if (isRevision) {
      let revLessons = allRealLessons.filter((l) => l.isRevisionHub || l.sourceType === 'REVISION_HUB');

      if (createModeDomain === 'ACADEMIC') {
        // Academic Syllabus: Class 6 to 12
        revLessons = revLessons.filter((l) => l.classLevel && l.classLevel !== 'COMPETITION');
        if (createModeClass !== 'ALL') {
          revLessons = revLessons.filter((l) => l.classLevel === createModeClass || l.classLevel === 'ALL');
        }
        if (createModeSubject !== 'ALL') {
          revLessons = revLessons.filter((l) => l.subject === createModeSubject);
        }
      } else {
        // Competition: ONLY Lucent!
        revLessons = revLessons.filter((l) => {
          const isCompClass = l.classLevel === 'COMPETITION';
          const titleLower = (l.lessonTitle || '').toLowerCase();
          const subLower = (l.subject || '').toLowerCase();
          const isLucent = titleLower.includes('lucent') || subLower.includes('lucent') || isCompClass;
          const isOtherBook = titleLower.includes('speedy') || titleLower.includes('sar sangrah');
          return isLucent && !isOtherBook;
        });

        if (createModeSubject !== 'ALL') {
          revLessons = revLessons.filter((l) => l.subject === createModeSubject);
        }
      }

      if (createModeSearch.trim()) {
        const q = createModeSearch.trim().toLowerCase();
        revLessons = revLessons.filter(
          (l) =>
            l.lessonTitle.toLowerCase().includes(q) ||
            l.subject.toLowerCase().includes(q) ||
            (l.classLevel && l.classLevel.toLowerCase().includes(q))
        );
      }
      return revLessons;
    } else {
      // 🎯 MCQ Mode
      if (createModeDomain === 'ACADEMIC') {
        let academicLessons = allRealLessons.filter((l) => {
          return l.classLevel && l.classLevel !== 'COMPETITION';
        });

        if (createModeClass !== 'ALL') {
          academicLessons = academicLessons.filter((l) => l.classLevel === createModeClass || l.classLevel === 'ALL');
        }
        if (createModeSourceFilter === 'NOTES') {
          academicLessons = academicLessons.filter((l) => l.sourceType !== 'HOMEWORK');
        } else if (createModeSourceFilter === 'HOMEWORK') {
          academicLessons = academicLessons.filter((l) => l.sourceType === 'HOMEWORK');
        }

        if (createModeSearch.trim()) {
          const q = createModeSearch.trim().toLowerCase();
          academicLessons = academicLessons.filter(
            (l) =>
              l.lessonTitle.toLowerCase().includes(q) ||
              l.subject.toLowerCase().includes(q) ||
              (l.classLevel && l.classLevel.toLowerCase().includes(q))
          );
        }
        return academicLessons;
      } else {
        // Competition: All competition books
        let compLessons = allRealLessons.filter((l) => {
          if (l.classLevel === 'COMPETITION' || l.sourceType === 'CURATED') return true;
          const titleLower = (l.lessonTitle || '').toLowerCase();
          const subLower = (l.subject || '').toLowerCase();
          return (
            titleLower.includes('lucent') ||
            titleLower.includes('speedy') ||
            titleLower.includes('sar sangrah') ||
            titleLower.includes('bssc') ||
            titleLower.includes('railway') ||
            titleLower.includes('ssc') ||
            subLower.includes('lucent') ||
            subLower.includes('speedy') ||
            subLower.includes('competition')
          );
        });

        if (createModeBook !== 'ALL') {
          compLessons = compLessons.filter((l) => getLessonCompetitionBookId(l) === createModeBook);
        }

        if (createModeSearch.trim()) {
          const q = createModeSearch.trim().toLowerCase();
          compLessons = compLessons.filter(
            (l) =>
              l.lessonTitle.toLowerCase().includes(q) ||
              l.subject.toLowerCase().includes(q)
          );
        }
        return compLessons;
      }
    }
  }, [
    newRoomMcqType,
    createModeDomain,
    createModeBook,
    createModeClass,
    createModeSubject,
    createModeSourceFilter,
    createModeSearch,
    allRealLessons,
  ]);

  // ── Auto-populate create room from prefilledContext ───────────────────────
  useEffect(() => {
    if (isOpen && prefilledContext) {
      const titleText = (prefilledContext.chapterTitle || prefilledContext.title || '').trim();
      const generatedName = titleText
        ? `${titleText.slice(0, 28)} · Live MCQ`
        : `${prefilledContext.subject || 'Live'} · MCQ Battle`;

      setNewRoomName(generatedName);
      if (prefilledContext.subject) {
        setNewRoomSubject(prefilledContext.subject);
      }
      if (!currentRoom) {
        setShowCreateModal(true);
      }
    }
  }, [isOpen, prefilledContext]);

  const isHost = Boolean(
    currentRoom && (
      isAdmin ||
      (lastCreatedRoomId && currentRoom.id === lastCreatedRoomId) ||
      createdRoomIds.has(currentRoom.id) ||
      isRoomCreatedByMe(currentRoom.id, currentRoom.hostId, user?.id) ||
      Boolean(auth.currentUser?.uid && currentRoom.hostId === auth.currentUser.uid) ||
      Boolean(user?.id && currentRoom.hostId === user.id) ||
      (Boolean(user?.name && currentRoom.hostName) && user.name.trim().toLowerCase() === currentRoom.hostName.trim().toLowerCase()) ||
      Boolean(user?.id && currentRoom.members?.[user.id]?.isHost) ||
      Boolean(auth.currentUser?.uid && currentRoom.members?.[auth.currentUser.uid]?.isHost) ||
      Object.keys(currentRoom.members || {}).length <= 1
    )
  );
  const currentMember = currentRoom?.members?.[user?.id] || (auth.currentUser?.uid ? currentRoom?.members?.[auth.currentUser.uid] : undefined);

  // ── 1. Subscribe to Active Rooms in Lobby ─────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToActiveRooms((rooms) => {
      setActiveRooms(rooms);
    });
    return () => unsub();
  }, [isOpen]);

  // ── 2. Subscribe to Currently Joined Room ────────────────────────────────
  useEffect(() => {
    const roomId = currentRoom?.id;
    if (!roomId) return;
    const unsub = subscribeToRoom(roomId, (room) => {
      if (!room) {
        setCurrentRoom(null);
        onActiveRoomChangeRef.current?.(null);
        return;
      }
      setCurrentRoom((prev) => {
        if (prev?.id === room.id && prev.liveMcq?.isActive && (!room.liveMcq || !room.liveMcq.isActive)) {
          return {
            ...room,
            mode: 'LIVE_MCQ',
            liveMcq: prev.liveMcq,
          };
        }
        return room;
      });
      onActiveRoomChangeRef.current?.(room);
    });

    return () => unsub();
  }, [currentRoom?.id]);

  // ── 3. Synchronized Room Expiry Countdown & Auto-Submit ──────────────────
  useEffect(() => {
    if (!currentRoom) return;

    const calculateRemaining = () => {
      const expiry = currentRoom.expiresAt || (currentRoom.createdAt + (currentRoom.durationMinutes || 30) * 60 * 1000);
      const diffMs = expiry - Date.now();
      const remainingSec = Math.max(0, Math.floor(diffMs / 1000));
      setRoomSecondsLeft(remainingSec);

      // Auto-submit when time expires!
      if (remainingSec <= 0 && !currentRoom.isExpired) {
        handleTimeExpiredAutoSubmit();
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [currentRoom?.id, currentRoom?.expiresAt, currentRoom?.isExpired]);

  const handleTimeExpiredAutoSubmit = async () => {
    if (!currentRoom) return;
    try {
      // Award final unbroken streak bonus for the current user
      if (user?.id) {
        const streakBonus = await awardFinalStreakBonus(currentRoom.id, user.id);
        if (streakBonus > 0 && onUserUpdate) {
          const currentXp = user.xp || user.totalScore || 0;
          const updatedUser = {
            ...user,
            xp: currentXp + streakBonus,
            totalScore: currentXp + streakBonus,
          };
          onUserUpdate(updatedUser);
        }
      }

      // If host, update room state in RTDB to auto-submit
      if (isHost) {
        await autoSubmitRoom(currentRoom.id);
      }
    } catch (err) {
      console.warn('Auto-submit execution error:', err);
    }
  };

  // ── 4. Synchronized Live MCQ Question Countdown & Auto-Advance ─────────
  useEffect(() => {
    if (!currentRoom || !currentRoom.liveMcq?.isActive) return;
    const { liveMcq } = currentRoom;

    let interval: any = null;
    if (liveMcq.status === 'QUESTION' && liveMcq.questionStartTime) {
      const updateMcqTick = () => {
        const elapsedSec = Math.floor((Date.now() - liveMcq.questionStartTime) / 1000);
        const duration = liveMcq.durationPerQuestion || 20;
        const remaining = Math.max(0, duration - elapsedSec);
        setMcqSecondsLeft(remaining);

        // Auto-reveal exactly when selected timer expires (0s)
        if (remaining <= 0 && liveMcq.status === 'QUESTION') {
          handleRevealAnswer();
          return;
        }
      };

      updateMcqTick();
      interval = setInterval(updateMcqTick, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    currentRoom?.liveMcq?.status,
    currentRoom?.liveMcq?.questionStartTime,
    currentRoom?.liveMcq?.durationPerQuestion,
  ]);

  // ── Auto-advance Countdown during REVEAL ──
  useEffect(() => {
    if (!currentRoom || !currentRoom.liveMcq?.isActive) return;
    const { liveMcq } = currentRoom;

    if (liveMcq.status !== 'REVEAL') {
      setRevealSecondsLeft(2);
      return;
    }

    const shouldAutoAdvance = liveMcq.autoAdvance !== false && autoAdvanceEnabled !== false;
    if (!shouldAutoAdvance) return;

    setRevealSecondsLeft(2);
    const revealTimer = setInterval(() => {
      setRevealSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(revealTimer);
          if (liveMcq.status === 'REVEAL') {
            handleNextMcqQuestion();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(revealTimer);
  }, [
    currentRoom?.liveMcq?.status,
    currentRoom?.liveMcq?.currentQuestionIndex,
    currentRoom?.liveMcq?.autoAdvance,
    autoAdvanceEnabled,
  ]);

  // Reset local answer selection on new question
  useEffect(() => {
    setSelectedOption(null);
    setHasAnsweredCurrentQ(false);
    setShowXpBanner(false);
  }, [currentRoom?.liveMcq?.currentQuestionIndex]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentRoom?.chat]);

  // ── Action Handlers: Create Room ──────────────────────────────────────────
  const handleOpenCreateModal = () => {
    if (isCreateRoomGloballyHidden) {
      alert('Naya Study Room create karne ka option admin dwara band kiya gaya hai.');
      return;
    }
    if (!isAdmin && todayCreatedRoomsCount >= maxRoomsPerDay) {
      setUpgradePromptReason('DAILY_ROOM_LIMIT');
      return;
    }
    setShowCreateModal(true);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveRoomName = newRoomName.trim() || `${user?.name || 'Live'} MCQ Arena`;
    const cleanPassword = newRoomPassword.trim();

    // Mandated: Password cannot be empty and must be at least 2 characters!
    if (!cleanPassword || cleanPassword.length < 2) {
      alert('Room ka Secret Password compulsory hai! Kripya kam se kam 2 akshar/number ka password enter karein. Bina password ke room create nahi ho sakta.');
      return;
    }

    if (isCreateRoomGloballyHidden) {
      setShowCreateModal(false);
      alert('Naya Study Room create karne ka option admin dwara band kiya gaya hai.');
      return;
    }

    if (!isAdmin && todayCreatedRoomsCount >= maxRoomsPerDay) {
      setShowCreateModal(false);
      setUpgradePromptReason('DAILY_ROOM_LIMIT');
      return;
    }

    setIsLoading(true);
    try {
      const effectiveUid = auth.currentUser?.uid || user?.id || 'guest';
      const effectiveName = user?.name || auth.currentUser?.displayName || 'Host';

      const durationMinutes = Math.min(newRoomDurationMinutes || 30, maxDurationMinutesAllowed);

      const roomId = await createGroupRoom(
        {
          name: effectiveRoomName,
          subject: newRoomSubject || 'General Knowledge',
          mode: 'LIVE_MCQ',
          mcqType: 'PROJECTOR_MODE',
          password: cleanPassword,
          durationMinutes,
          maxMembers: Math.min(newRoomMaxMembers || 30, maxRoomCapacityAllowed),
          isPrivate: !!newRoomIsPrivate,
        },
        {
          id: effectiveUid,
          name: effectiveName,
          photoURL: user?.photoURL || auth.currentUser?.photoURL || '',
          level: user?.level || 1,
        }
      );

      recordCreatedRoomToday();
      markRoomAsCreatedByMe(roomId);
      setLastCreatedRoomId(roomId);
      setCreatedRoomIds((prev) => new Set([...prev, roomId]));
      setShowCreateModal(false);
      setNewRoomName('');
      setNewRoomPassword('');

      // Instantly open room for host from local cache
      const cached = getCachedRooms()[roomId];
      if (cached) {
        setCurrentRoom(cached);
        if (onActiveRoomChange) onActiveRoomChange(cached);
      } else {
        // Fallback room object so currentRoom is never null
        const fallbackRoom: GroupStudyRoom = {
          id: roomId,
          name: effectiveRoomName,
          subject: newRoomSubject || 'General Knowledge',
          code: roomId.slice(-6).toUpperCase(),
          password: cleanPassword,
          isPrivate: !!newRoomIsPrivate,
          hostId: effectiveUid,
          hostName: effectiveName,
          createdAt: Date.now(),
          lastActive: Date.now(),
          maxMembers: Math.min(newRoomMaxMembers || 30, maxRoomCapacityAllowed),
          mode: 'LIVE_MCQ',
          mcqType: 'PROJECTOR_MODE',
          durationMinutes,
          expiresAt: Date.now() + durationMinutes * 60 * 1000,
          isExpired: false,
          timer: {
            durationMinutes,
            startTime: Date.now(),
            isPaused: false,
            remainingSeconds: durationMinutes * 60,
          },
          members: {
            [effectiveUid]: {
              id: effectiveUid,
              name: effectiveName,
              joinedAt: Date.now(),
              lastSeen: Date.now(),
              isHost: true,
              level: user?.level || 1,
            },
          },
        };
        saveCachedRoom(fallbackRoom);
        setCurrentRoom(fallbackRoom);
        if (onActiveRoomChange) onActiveRoomChange(fallbackRoom);
      }

      // Room banne ke baad: Set active tab to MCQ arena directly
      setActiveTab('MCQ');

      // Launch selected preloaded lesson MCQs or prefilled MCQs immediately if available
      const lessonToLaunch = selectedPreloadLesson || (
        prefilledContext?.mcqData && Array.isArray(prefilledContext.mcqData) && prefilledContext.mcqData.length > 0
          ? {
              lessonTitle: prefilledContext.chapterTitle || prefilledContext.title || 'Chapter MCQ Battle',
              questions: prefilledContext.mcqData
                .map((q: any) => ({
                  question: q.question,
                  options: (q.options || []).slice(0, 4),
                  correctIndex: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
                  explanation: q.explanation || '',
                }))
                .filter((q: any) => q.question && q.options.length >= 2),
            }
          : null
      );

      if (lessonToLaunch && Array.isArray(lessonToLaunch.questions) && lessonToLaunch.questions.length > 0) {
        try {
          await startLiveMcqBattle(
            roomId,
            lessonToLaunch.lessonTitle,
            lessonToLaunch.questions,
            newRoomMcqType === 'REVISION_HUB' ? 15 : 25
          );
          setShowChapterChooser(false);
        } catch (e) {
          console.warn('Could not auto-start prefilled MCQ battle:', e);
        }
      }
      setSelectedPreloadLesson(null);

      // Safely set the current room with one-shot subscription
      let unsubRoom: (() => void) | null = null;
      unsubRoom = subscribeToRoom(roomId, (room) => {
        if (room) {
          setCurrentRoom(room);
          if (onActiveRoomChange) onActiveRoomChange(room);
        }
        if (unsubRoom) {
          unsubRoom();
        } else {
          setTimeout(() => {
            if (unsubRoom) unsubRoom();
          }, 0);
        }
      });
    } catch (err: any) {
      console.error('Failed to create room:', err);
      alert('Could not create room: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Action Handlers: Join Room with Password Prompt ───────────────────────
  const handleInitiateJoin = (room: GroupStudyRoom) => {
    // Only the verified room creator can enter without entering the password
    const currentUid = auth.currentUser?.uid || user?.id;
    const isCreator = Boolean(currentUid && room.hostId && currentUid === room.hostId);

    if (isCreator) {
      handleJoinRoom(room);
      return;
    }

    // Password is strictly COMPULSORY for all users joining the room!
    setPasswordModalRoom(room);
    setEnteredPassword('');
    setPasswordError('');
  };

  const handleVerifyPasswordAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalRoom) return;

    // Room password (or if legacy room had no password, room code is required)
    const correctPassword = (passwordModalRoom.password?.trim() || passwordModalRoom.code?.trim() || '').toLowerCase();
    const typedPassword = enteredPassword.trim().toLowerCase();

    if (!typedPassword) {
      setPasswordError('Kripya Room Password enter karein. Bina password ke room me entry nahi hogi.');
      return;
    }

    if (typedPassword === correctPassword) {
      const roomToJoin = passwordModalRoom;
      setPasswordModalRoom(null);
      await handleJoinRoom(roomToJoin);
    } else {
      setPasswordError('Galat Password! Kripya Host se sahi room password maangein.');
    }
  };

  const handleJoinRoom = async (room: GroupStudyRoom) => {
    setIsLoading(true);
    // Instantly transition into room in UI so user is never blocked or left in lobby
    setCurrentRoom(room);
    if (onActiveRoomChange) onActiveRoomChange(room);

    try {
      await joinGroupRoom(room.id, {
        id: user?.id || auth.currentUser?.uid || 'guest',
        name: user?.name || auth.currentUser?.displayName || 'Student',
        photoURL: user?.photoURL || auth.currentUser?.photoURL || '',
        level: user?.level || 1,
      });
    } catch (err: any) {
      console.warn('[GroupStudy] Background join error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCodeInput.trim()?.toUpperCase();
    if (!code) return;

    setJoinCodeError('');
    setIsLoading(true);
    try {
      const found = activeRooms.find((r) => r.code?.toUpperCase() === code);
      if (!found) {
        setJoinCodeError('Room not found or session has ended. Please check code.');
        setIsLoading(false);
        return;
      }
      setJoinCodeInput('');
      handleInitiateJoin(found);
    } catch (err: any) {
      setJoinCodeError(err.message || 'Failed to join');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentRoom) return;
    const isRoomHost =
      isHost ||
      (user?.id && currentRoom.hostId === user.id) ||
      isRoomCreatedByMe(currentRoom.id, currentRoom.hostId, user?.id) ||
      (auth.currentUser?.uid && currentRoom.hostId === auth.currentUser.uid);

    const promptText = isRoomHost
      ? '⚠️ Aap is Room ke HOST hain! Host ke jate hi room submit aur destroy ho jayega aur sabhi members room se bahar ho jayenge. Kya aap room destroy karke leave karna chahte hain?'
      : 'Kya aap is Group Study Room se bahar aana chahte hain?';

    if (confirm(promptText)) {
      const rId = currentRoom.id;
      setCurrentRoom(null);
      if (onActiveRoomChange) onActiveRoomChange(null);
      if (isRoomHost) {
        await deleteGroupRoom(rId);
      } else {
        await leaveGroupRoom(rId, user?.id || 'guest', user?.name || 'Student');
      }
    }
  };

  const handleDestroyRoom = async (targetRoomId?: string) => {
    const roomId = targetRoomId || currentRoom?.id;
    if (!roomId) return;
    if (confirm('⚠️ Kya aap is Study Room ko poori tarah DESTROY / DELETE karna chahte hain? Sabhi jude hue members room se bahar ho jayenge aur room list se hat jayega.')) {
      setIsLoading(true);
      try {
        if (currentRoom?.id === roomId) {
          setCurrentRoom(null);
          if (onActiveRoomChange) onActiveRoomChange(null);
        }
        await deleteGroupRoom(roomId);
      } catch (err: any) {
        console.error('Failed to destroy room:', err);
        alert('Room delete nahi ho paya: ' + (err.message || 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCopyCode = () => {
    if (!currentRoom?.code) return;
    navigator.clipboard.writeText(currentRoom.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ── Share to WhatsApp ──
  const getShareInviteMessage = () => {
    if (!currentRoom) return '';
    const roomName = currentRoom.name || 'Live Study Room';
    const roomSubject = currentRoom.subject || 'All Subjects';
    const roomCode = currentRoom.code || '';
    const passwordText = currentRoom.password ? `\n🔒 *Password:* ${currentRoom.password}` : '';
    const hostText = currentRoom.hostName ? `👑 *Host:* ${currentRoom.hostName}\n` : '';

    return `🔥 *IIC Live Group Study & MCQ Battle Room!*
📚 *Room:* ${roomName}
🎯 *Subject:* ${roomSubject}
${hostText}🔑 *Room Code:* ${roomCode}${passwordText}

👉 *Kaise Judein:*
1. IIC App kholein
2. "Group Study" section me jayein
3. Room Code *${roomCode}* daal kar Join karein!

Aao dekhte hain kisme kitna hai dum! 🏆`;
  };

  const handleShareToWhatsApp = () => {
    const text = getShareInviteMessage();
    if (!text) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleSendChat = (e: React.FormEvent, isDoubt: boolean = false) => {
    e.preventDefault();
    if (!currentRoom || !chatMessage.trim()) return;

    sendRoomMessage(
      currentRoom.id,
      {
        id: user?.id || 'guest',
        name: user?.name || 'Student',
        photoURL: user?.photoURL,
      },
      chatMessage.trim(),
      isDoubt ? 'DOUBT' : 'MESSAGE'
    );
    setChatMessage('');
  };

  // ── MCQ Battle Handlers & Host Free Lesson Launch ─────────────────────────
  const handleLaunchCuratedMcq = async () => {
    if (!currentRoom || !isHost) return;
    const selectedSet = availableBattleSets.find((s) => s.id === selectedCuratedSet);
    if (!selectedSet || !selectedSet.questions.length) {
      alert('Kripya pehle koi lesson chunein!');
      return;
    }

    await handleLaunchRealLessonMcq(
      {
        id: selectedSet.id,
        lessonTitle: selectedSet.name,
        classLevel: selectedSet.classLevel,
        subject: selectedSet.subject,
        questions: selectedSet.questions,
      },
      currentRoom.mcqType
    );
  };

  // Host launches ANY real lesson MCQ for FREE (0 credits)
  const handleLaunchRealLessonMcq = async (
    lesson: {
      id: string;
      lessonTitle: string;
      classLevel?: string;
      subject?: string;
      questions: GroupStudyMcqQuestion[];
    },
    targetMcqType?: StudyRoomMcqType
  ) => {
    if (launchingLessonId) return;

    // 1. Reliably resolve target room
    let targetRoom: GroupStudyRoom | null = currentRoom || activeRoom || null;
    if (!targetRoom && lastCreatedRoomId) {
      targetRoom = getCachedRooms()[lastCreatedRoomId] || null;
    }
    if (!targetRoom) {
      const cached = getCachedRooms();
      const allCached = Object.values(cached).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (allCached.length > 0) {
        targetRoom = allCached[0];
      }
    }

    if (!targetRoom) {
      alert('Room connect nahi ho paya. Kripya pehle room create karein ya dobara join karein.');
      return;
    }

    const rawQuestions = Array.isArray(lesson.questions) ? lesson.questions : [];
    const cleanQuestions: GroupStudyMcqQuestion[] = rawQuestions
      .map((q, idx) => ({
        question: String(q?.question || `Question ${idx + 1}`).trim(),
        options: (Array.isArray(q?.options) ? q.options : ['A', 'B', 'C', 'D'])
          .slice(0, 4)
          .map((opt, oIdx) => String(opt ?? `Option ${oIdx + 1}`).trim()),
        correctIndex: typeof q?.correctIndex === 'number' ? Math.max(0, Math.min(3, q.correctIndex)) : 0,
        explanation: q?.explanation ? String(q.explanation).trim() : '',
      }))
      .filter((q) => q.question.length > 0 && q.options.length >= 2);

    if (cleanQuestions.length === 0) {
      alert('Is lesson me koi MCQ uplabdh nahi hai.');
      return;
    }

    // Check host authority generously (creator, admin, host ID, name)
    const userIsHost =
      isHost ||
      (user?.id && targetRoom.hostId === user.id) ||
      (auth.currentUser?.uid && targetRoom.hostId === auth.currentUser.uid) ||
      (user?.name && targetRoom.hostName && user.name.toLowerCase() === targetRoom.hostName.toLowerCase()) ||
      isRoomCreatedByMe(targetRoom.id, targetRoom.hostId, user?.id) ||
      isAdmin;

    if (!userIsHost) {
      alert('Sirf Room Host hi live MCQ battle shuru kar sakte hain.');
      return;
    }

    // Close chooser modal immediately so user transitions to the arena right away
    setShowChapterChooser(false);
    setActiveTab('MCQ');
    setIsLoadingChapterMcq(true);
    setLaunchingLessonId(lesson.id);

    try {
      const chosenType: StudyRoomMcqType = targetMcqType || chooserMcqType || targetRoom.mcqType || 'PROJECTOR_MODE';
      const duration = selectedTimerDuration || (
        chosenType === 'REVISION_HUB' ? 15 : (chosenType === 'PROJECTOR_MODE' ? 25 : 20)
      );
      const displayTitle = `${lesson.lessonTitle} (${lesson.classLevel === 'COMPETITION' ? 'Competition' : `Class ${lesson.classLevel}`} • ${lesson.subject || 'MCQ'})`;

      // 2. IMMEDIATE local update: show live MCQ arena instantly!
      const updatedRoom: GroupStudyRoom = {
        ...targetRoom,
        mode: 'LIVE_MCQ',
        mcqType: chosenType,
        liveMcq: {
          isActive: true,
          title: displayTitle,
          currentQuestionIndex: 0,
          totalQuestions: cleanQuestions.length,
          questionStartTime: Date.now(),
          durationPerQuestion: duration,
          autoAdvance: autoAdvanceEnabled,
          status: 'QUESTION',
          questions: cleanQuestions,
          scores: {},
          questionAnswers: {},
        },
        lastActive: Date.now(),
      };

      saveCachedRoom(updatedRoom);
      setCurrentRoom(updatedRoom);
      if (onActiveRoomChange) onActiveRoomChange(updatedRoom);

      // 3. Background sync to RTDB & peers
      await startLiveMcqBattle(
        targetRoom.id,
        displayTitle,
        cleanQuestions,
        duration,
        autoAdvanceEnabled
      );

      if (chosenType !== targetRoom.mcqType) {
        await setRoomMcqType(targetRoom.id, chosenType);
      }
    } catch (err: any) {
      console.warn('[GroupStudy] Live battle background sync error:', err);
    } finally {
      setIsLoadingChapterMcq(false);
      setLaunchingLessonId(null);
    }
  };

  // Host launches ANY lesson MCQ for FREE (0 credits)
  const handleLaunchFreeLessonMcq = async (chapterTitle: string, subjectKey: string) => {
    if (!currentRoom || !isHost) return;
    setIsLoadingChapterMcq(true);
    try {
      let questions: GroupStudyMcqQuestion[] = [];

      // 1. Fetch from Firestore / local storage via getChapterData
      try {
        const chapterData = await getChapterData(chapterTitle) || await getChapterData(`nst_${chapterTitle}`);
        if (chapterData && Array.isArray(chapterData.mcq) && chapterData.mcq.length > 0) {
          questions = chapterData.mcq.map((q: any) => ({
            question: q.question,
            options: (q.options || []).slice(0, 4),
            correctIndex: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
            explanation: q.explanation || '',
          })).filter((q: any) => q.question && q.options.length >= 2);
        }
      } catch (e) {
        console.warn('Chapter MCQ fetch note:', e);
      }

      // 2. If chapter didn't have stored MCQs, pick from syllabus bank or curated sets
      if (questions.length === 0) {
        const fallbackSet = availableBattleSets[0];
        if (fallbackSet && fallbackSet.questions.length > 0) {
          questions = fallbackSet.questions.slice(0, 15);
        }
      }

      if (questions.length === 0) {
        alert('Is chapter ke MCQs abhi taiyaar nahi hain. Kripya doosra chapter chunein.');
        return;
      }

      const duration = selectedTimerDuration || (
        currentRoom.mcqType === 'REVISION_HUB' ? 15 : (currentRoom.mcqType === 'PROJECTOR_MODE' ? 25 : 20)
      );

      await startLiveMcqBattle(
        currentRoom.id,
        `${chapterTitle} · Free Lesson MCQ`,
        questions,
        duration,
        autoAdvanceEnabled
      );

      setShowChapterChooser(false);
    } catch (err: any) {
      alert('MCQ shuru karne me samasya: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoadingChapterMcq(false);
    }
  };

  // Host adjusts question timer on the fly
  const handleSetDuration = async (sec: number) => {
    setSelectedTimerDuration(sec);
    setCurrentRoom((prev) => {
      if (!prev || !prev.liveMcq) return prev;
      const updated = {
        ...prev,
        liveMcq: {
          ...prev.liveMcq,
          durationPerQuestion: sec,
        },
      };
      saveCachedRoom(updated);
      return updated;
    });
    if (currentRoom?.id && isHost) {
      await setRoomMcqDuration(currentRoom.id, sec);
    }
  };

  // Host toggles auto-advance
  const handleToggleAutoAdvance = async () => {
    const nextVal = !autoAdvanceEnabled;
    setAutoAdvanceEnabled(nextVal);
    if (currentRoom?.id && isHost) {
      await setRoomMcqAutoAdvance(currentRoom.id, nextVal);
    }
  };

  // Host manually finishes and submits battle early
  const handleForceEndBattle = async () => {
    if (!currentRoom?.id || !isHost || !currentRoom.liveMcq) return;
    const confirmEnd = window.confirm('Kya aap sach me Live MCQ Battle submit karke sabhi ko final data dikhana chahte hain?');
    if (!confirmEnd) return;
    await advanceMcqQuestion(currentRoom.id, currentRoom.liveMcq.currentQuestionIndex, true);
    if (user?.id) {
      await awardFinalStreakBonus(currentRoom.id, user.id);
    }
  };

  // Reveal answer in battle with immediate optimistic state update
  const handleRevealAnswer = async () => {
    if (!currentRoom?.id || !currentRoom.liveMcq) return;
    if (currentRoom.liveMcq.status === 'REVEAL' || currentRoom.liveMcq.status === 'ENDED') return;

    // Optimistically update currentRoom immediately
    setCurrentRoom((prev) => {
      if (!prev || !prev.liveMcq) return prev;
      if (prev.liveMcq.status === 'REVEAL' || prev.liveMcq.status === 'ENDED') return prev;
      const updated = {
        ...prev,
        liveMcq: {
          ...prev.liveMcq,
          status: 'REVEAL' as const,
        },
      };
      saveCachedRoom(updated);
      return updated;
    });

    try {
      await revealMcqAnswer(currentRoom.id);
    } catch (err) {
      console.warn('Error revealing answer in RTDB:', err);
    }
  };

  // Student/Member submits answer
  const handleSelectOption = async (optIdx: number) => {
    if (!currentRoom || hasAnsweredCurrentQ || !currentRoom.liveMcq) return;
    setSelectedOption(optIdx);
    setHasAnsweredCurrentQ(true);

    const q = currentRoom.liveMcq.questions[currentRoom.liveMcq.currentQuestionIndex];
    const isCorrect = optIdx === q.correctIndex;
    const durationLimit = currentRoom.liveMcq.durationPerQuestion || 20;
    const timeTaken = Math.max(0.5, durationLimit - mcqSecondsLeft);
    const curIdx = currentRoom.liveMcq.currentQuestionIndex;

    // Optimistically record the answer in currentRoom.liveMcq.questionAnswers immediately
    setCurrentRoom((prev) => {
      if (!prev || !prev.liveMcq) return prev;
      const existingAnswers = prev.liveMcq.questionAnswers?.[curIdx] || {};
      const updatedAnswers = {
        ...existingAnswers,
        [user?.id || 'guest']: {
          userId: user?.id || 'guest',
          userName: user?.name || 'Student',
          isCorrect,
          selectedOption: optIdx,
          timeTakenSec: timeTaken,
          submittedAt: Date.now(),
        },
      };
      const updatedLiveMcq = {
        ...prev.liveMcq,
        questionAnswers: {
          ...(prev.liveMcq.questionAnswers || {}),
          [curIdx]: updatedAnswers,
        },
      };
      const updatedRoom = { ...prev, liveMcq: updatedLiveMcq };
      saveCachedRoom(updatedRoom);
      return updatedRoom;
    });

    const outcome = await submitMcqAnswer(
      currentRoom.id,
      user?.id || 'guest',
      user?.name || 'Student',
      isCorrect,
      timeTaken,
      optIdx,
      currentRoom.liveMcq.currentQuestionIndex,
      user?.photoURL
    );

    setLastXpOutcome(outcome);
    setShowXpBanner(true);

    // Synchronize XP to user profile & localStorage & Firebase
    if (outcome.netXpChange !== 0 && user?.id) {
      const currentXp = user.xp || user.totalScore || 0;
      const newXp = Math.max(0, currentXp + outcome.netXpChange);
      const updatedUser = {
        ...user,
        xp: newXp,
        totalScore: newXp,
      };

      try {
        localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
        localStorage.setItem(`nst_user_profile_${user.id}`, JSON.stringify(updatedUser));
      } catch (_) {}

      saveUserToLive(updatedUser, { immediate: true }).catch(() => {});
      onUserUpdate?.(updatedUser);
    }
  };

  const handleNextMcqQuestion = async () => {
    if (!currentRoom || !currentRoom.liveMcq) return;
    const { liveMcq } = currentRoom;
    const nextIdx = (liveMcq.currentQuestionIndex || 0) + 1;
    const totalQuestions = liveMcq.totalQuestions || liveMcq.questions?.length || 0;
    const isFinished = nextIdx >= totalQuestions;

    // Reset local option selection & timers for next question
    setSelectedOption(null);
    setHasAnsweredCurrentQ(false);
    setShowXpBanner(false);
    setRevealSecondsLeft(2);
    setMcqSecondsLeft(liveMcq.durationPerQuestion || 20);

    // 1. Optimistically update local React state immediately so UI switches to next question instantly!
    setCurrentRoom((prev) => {
      if (!prev || !prev.liveMcq) return prev;
      const updatedLiveMcq = {
        ...prev.liveMcq,
        currentQuestionIndex: nextIdx,
        status: isFinished ? ('ENDED' as const) : ('QUESTION' as const),
        questionStartTime: Date.now(),
        isActive: !isFinished,
      };
      const updatedRoom: GroupStudyRoom = {
        ...prev,
        liveMcq: updatedLiveMcq,
        isExpired: isFinished ? true : prev.isExpired,
      };
      saveCachedRoom(updatedRoom);
      return updatedRoom;
    });

    // 2. Broadcast to RTDB so other members in the room also advance
    try {
      if (isFinished) {
        await advanceMcqQuestion(currentRoom.id, nextIdx, true);
        if (user?.id) {
          await awardFinalStreakBonus(currentRoom.id, user.id);
        }
      } else {
        await advanceMcqQuestion(currentRoom.id, nextIdx, false);
      }
    } catch (err) {
      console.warn('Error advancing question in RTDB:', err);
    }
  };

  const handleSwitchMcqType = async (type: StudyRoomMcqType) => {
    if (!currentRoom || !isHost) return;
    const updated: GroupStudyRoom = { ...currentRoom, mcqType: type };
    setCurrentRoom(updated);
    saveCachedRoom(updated);
    setChooserMcqType(type);
    try {
      await setRoomMcqType(currentRoom.id, type);
    } catch (err) {
      console.warn('Failed to sync mcqType to RTDB:', err);
    }
  };

  // Filtered Live Rooms for Search
  const filteredActiveRooms = useMemo(() => {
    const q = roomSearchQuery.trim().toLowerCase();
    if (!q) return activeRooms;
    return activeRooms.filter(
      (r) =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.subject && r.subject.toLowerCase().includes(q)) ||
        (r.hostName && r.hostName.toLowerCase().includes(q)) ||
        (r.code && r.code.toLowerCase().includes(q))
    );
  }, [activeRooms, roomSearchQuery]);

  const brandColor = tierTheme?.primary || '#6366f1';

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 font-sans"
      id="group-study-modal-overlay"
    >
      <div
        className="w-full h-full md:h-[92vh] md:max-w-4xl bg-slate-900 border border-slate-700/70 md:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        style={{
          boxShadow: `0 25px 50px -12px ${brandColor}33`,
        }}
      >
        {/* ── TOP NAV BAR ── */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/90 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black shadow-md text-white shrink-0"
              style={{ background: brandColor }}
            >
              <Trophy size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm md:text-base tracking-wide text-white line-clamp-1">
                  {currentRoom ? currentRoom.name : 'Study Room · Live MCQ Arena'}
                </span>
                {currentRoom && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      currentRoom.mcqType === 'REVISION_HUB'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}
                  >
                    {currentRoom.mcqType === 'REVISION_HUB'
                      ? '⚡ MCQ +'
                      : '🎯 MCQ'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">
                {currentRoom
                  ? `${currentRoom.subject} • ${Object.keys(currentRoom.members || {}).length} Online • Free MCQ Hosting`
                  : 'Live peer MCQ battles, instant XP (+5 / -2), streak bonuses & projector mode'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isMcqRunning && currentRoom && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-mono font-bold ${
                  roomSecondsLeft <= 120
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                    : 'bg-slate-800/80 text-amber-300 border-slate-700'
                }`}
                title="Room Auto-Submit Timer"
              >
                <Clock size={13} />
                <span>{formatSeconds(roomSecondsLeft)}</span>
              </div>
            )}

            {currentRoom && (
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 active:scale-95 transition"
                title="Room Code copy karein"
              >
                {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span className="font-mono text-[11px]">{copiedCode ? 'Copied!' : currentRoom.code}</span>
              </button>
            )}

            {currentRoom && isHost && !isMcqRunning && (
              <button
                onClick={() => setActiveTab('MCQ')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black active:scale-95 transition shadow cursor-pointer"
                title="Wahi se koi bhi lesson ka MCQ start karein"
              >
                <Play size={13} />
                <span>Start MCQ</span>
              </button>
            )}

            {!isMcqRunning && currentRoom && isHost && (
              <button
                onClick={() => handleDestroyRoom()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-black active:scale-95 transition shadow-md cursor-pointer border border-rose-500"
                title="Host: Is Study Room ko destroy / delete karein"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Destroy</span>
              </button>
            )}

            {currentRoom && (
              <button
                onClick={handleLeaveRoom}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white text-xs font-bold active:scale-95 transition cursor-pointer"
                title="Room se bahar aayein"
              >
                Leave
              </button>
            )}

            {!currentRoom && (
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-black shadow-md active:scale-95 transition cursor-pointer"
                style={{ background: brandColor }}
              >
                <Plus size={14} />
                <span>+ Room Banayein</span>
              </button>
            )}

            <button
              onClick={() => {
                if (currentRoom) {
                  handleLeaveRoom();
                } else {
                  onClose();
                }
              }}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center active:scale-90 transition shrink-0 cursor-pointer"
              title={currentRoom ? 'Leave Room' : 'Close'}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── CONDITIONAL CONTENT: LOBBY vs ACTIVE ROOM ── */}
        {!currentRoom ? (
          /* ─────────────────────────────────────────────────────────────────
             LOBBY VIEW (Explore active live rooms, search by name, join via password)
          ─────────────────────────────────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Banner with Tier Quotas */}
            <div
              className="rounded-2xl p-5 relative overflow-hidden border border-indigo-500/30 shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${brandColor}22, #0f172a 80%)`,
              }}
            >
              <div className="relative z-10 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                      isAdmin
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                        : userTier === 'ULTRA'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-400/40'
                        : userTier === 'BASIC'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {isAdmin
                      ? '👑 Admin: Unlimited Rooms & 4 Hr Max'
                      : userTier === 'ULTRA'
                      ? `👑 Ultra VIP: ${todayCreatedRoomsCount}/5 Daily Rooms (2 Hr Max)`
                      : userTier === 'BASIC'
                      ? `⭐ Basic Plan: ${todayCreatedRoomsCount}/3 Daily Rooms (1 Hr Max)`
                      : `🆓 Free User: ${todayCreatedRoomsCount}/2 Daily Rooms (30 Min Max)`}
                  </span>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    🎁 Free Lesson MCQs (0 Credits)
                  </span>
                </div>

                <h2 className="text-xl md:text-2xl font-black text-white leading-tight mb-2">
                  Live MCQ Study Room me Doston ke Sath Muqabala Karein!
                </h2>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-4">
                  Har sahi jawab par <b>+5 XP</b> aur galat par <b>-2 XP</b>. Continuous streak todne par payein{' '}
                  <b>+10, +15, ya +20 XP Bonus</b>! Password enter karke room join karein ya apna room banayein.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  {!isCreateRoomGloballyHidden && (
                    <button
                      onClick={handleOpenCreateModal}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-black text-xs md:text-sm shadow-xl active:scale-95 transition cursor-pointer"
                      style={{ background: brandColor }}
                    >
                      <Plus size={16} /> Apna MCQ Room Banayein
                    </button>
                  )}

                  <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-700 rounded-xl px-2.5 py-1">
                    <input
                      type="text"
                      placeholder="Enter 6-digit Code"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      className="bg-transparent border-0 outline-none text-xs font-mono uppercase text-white px-1 py-1 w-32 placeholder:text-slate-500"
                      maxLength={6}
                    />
                    <button
                      onClick={handleJoinByCode}
                      disabled={!joinCodeInput.trim() || isLoading}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      Join
                    </button>
                  </div>
                </div>

                {joinCodeError && (
                  <p className="text-xs font-bold text-rose-400 mt-2">{joinCodeError}</p>
                )}
              </div>
            </div>

            {/* Room Discovery & Search Header */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Radio size={16} className="text-emerald-400 animate-pulse" />
                  <h3 className="font-black text-base text-white">Live MCQ Rooms</h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300">
                    {filteredActiveRooms.length} Live
                  </span>
                </div>

                {/* Search Input */}
                <div className="w-full sm:w-72 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by room name, subject or host..."
                    value={roomSearchQuery}
                    onChange={(e) => setRoomSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition"
                  />
                  {roomSearchQuery && (
                    <button
                      onClick={() => setRoomSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Rooms Grid */}
              {filteredActiveRooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredActiveRooms.map((room, rIdx) => {
                    const memberCount = Object.keys(room.members || {}).length;
                    const modeBadge =
                      room.mcqType === 'REVISION_HUB'
                        ? { label: '⚡ MCQ +', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' }
                        : { label: '🎯 MCQ', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };

                    const expiry = room.expiresAt || (room.createdAt + (room.durationMinutes || 30) * 60 * 1000);
                    const remainingMin = Math.max(0, Math.ceil((expiry - Date.now()) / (60 * 1000)));
                    const isMyRoom = isRoomCreatedByMe(room.id, room.hostId, user?.id) ||
                      (Boolean(auth.currentUser?.uid) && room.hostId === auth.currentUser.uid) ||
                      (Boolean(user?.name && room.hostName) && user?.name?.toLowerCase() === room.hostName?.toLowerCase()) ||
                      isAdmin;

                    return (
                      <div
                        key={room.id || room.code || `room_${rIdx}`}
                        className={`border rounded-2xl p-4 transition flex flex-col justify-between group shadow-sm ${
                          isMyRoom 
                            ? 'bg-slate-800/90 border-emerald-500/50 shadow-emerald-950/30 ring-1 ring-emerald-500/30' 
                            : 'bg-slate-800/70 border-slate-700/80 hover:border-slate-600'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${modeBadge.bg}`}>
                                {modeBadge.label}
                              </span>
                              {isMyRoom && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                  👑 Aap Host Hain
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                              <span className="flex items-center gap-1">
                                <Clock size={11} className="text-amber-400" />
                                <span className="text-slate-300 font-bold">{remainingMin}m</span> left
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Users size={12} />
                                <span className="text-white font-bold">{memberCount}</span>/{room.maxMembers}
                              </span>
                            </div>
                          </div>

                          <h4 className="font-black text-sm text-white group-hover:text-indigo-300 transition line-clamp-1">
                            {room.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 mb-3">
                            Topic: <span className="text-slate-200 font-semibold">{room.subject}</span>
                          </p>

                          <div className="flex items-center justify-between gap-2 mb-4 text-xs text-slate-400 flex-wrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
                                {room.hostName?.charAt(0)?.toUpperCase() || 'H'}
                              </div>
                              <span>Host: {room.hostName}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isMyRoom ? (
                                <>
                                  {room.password && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-md" title="Room password (sirf host ko dikhta hai)">
                                      🔑 PW: {room.password}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDestroyRoom(room.id);
                                    }}
                                    className="inline-flex items-center gap-1 text-[10px] font-black text-rose-400 hover:text-white bg-rose-950/50 hover:bg-rose-600 border border-rose-500/40 px-2 py-0.5 rounded-full transition cursor-pointer"
                                    title="Aap host hain: is room ko destroy / delete karein"
                                  >
                                    <Trash2 size={10} /> Delete Room
                                  </button>
                                </>
                              ) : (
                                room.password ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                    <Lock size={10} /> Password
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                    Open
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isMyRoom ? (
                            <button
                              type="button"
                              onClick={() => handleJoinRoom(room)}
                              disabled={isLoading}
                              className="flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white"
                            >
                              <Sparkles size={13} className="text-yellow-200" /> Enter Room (Aap Host Hain) <ChevronRight size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInitiateJoin(room)}
                              disabled={isLoading}
                              className="flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition cursor-pointer"
                              style={{
                                background: brandColor,
                                color: '#ffffff',
                              }}
                            >
                              {room.password ? (
                                <>
                                  <Lock size={13} /> Join Room (Enter Password) <ChevronRight size={14} />
                                </>
                              ) : (
                                <>
                                  <Play size={13} /> Join Room <ChevronRight size={14} />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center bg-slate-900/50">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3 text-indigo-400">
                    <Trophy size={24} />
                  </div>
                  <h4 className="text-base font-black text-white mb-1">
                    {roomSearchQuery ? 'Search me koi room nahi mila' : 'Abhi koi Live MCQ Room nahi hai'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                    {roomSearchQuery
                      ? 'Dusre keyword se search karein ya naya MCQ study room banayein.'
                      : 'Aap pehla Live MCQ room banakar password aur room code doston ke sath share karein!'}
                  </p>
                  {!isCreateRoomGloballyHidden && (
                    <button
                      onClick={handleOpenCreateModal}
                      className="px-5 py-2.5 rounded-xl text-white font-black text-xs shadow-lg active:scale-95 transition inline-flex items-center gap-2 cursor-pointer"
                      style={{ background: brandColor }}
                    >
                      <Plus size={14} /> Pehla MCQ Room Banayein
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────────
             ACTIVE ROOM VIEW (Live MCQ Arena, Host Lesson Picker, Real-time XP & Podium)
          ─────────────────────────────────────────────────────────────────── */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Main Battle Stage */}
            <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 border-b md:border-b-0 md:border-r border-slate-800">
              {/* During active MCQ running: Clean, uncluttered, and optimized for mobile */}
              {isMcqRunning ? (
                <div className="mb-2 flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileRoomInfo(!showMobileRoomInfo);
                        if (!showMobileRoomInfo) {
                          setShowMobileInvite(false);
                          setShowMobileHostControls(false);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                        showMobileRoomInfo
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-slate-900/90 text-slate-400 hover:text-white border-slate-800'
                      }`}
                    >
                      <Info size={12} /> {showMobileRoomInfo ? 'Hide Rules ▴' : 'Rules ▾'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileInvite(!showMobileInvite);
                        if (!showMobileInvite) {
                          setShowMobileRoomInfo(false);
                          setShowMobileHostControls(false);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                        showMobileInvite
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : 'bg-slate-900/90 text-slate-400 hover:text-white border-slate-800'
                      }`}
                    >
                      <Share2 size={12} /> Invite ({currentRoom.code}) ▾
                    </button>

                    {isHost && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMobileHostControls(!showMobileHostControls);
                          if (!showMobileHostControls) {
                            setShowMobileRoomInfo(false);
                            setShowMobileInvite(false);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                          showMobileHostControls
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                            : 'bg-slate-900/90 text-slate-400 hover:text-white border-slate-800'
                        }`}
                      >
                        <Settings size={12} /> {showMobileHostControls ? 'Hide Host ▴' : 'Host ⚙️ ▾'}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto text-[11px]">
                    <span className="font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                      🔴 Live Arena
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Top Banner: Expiry Countdown & Host Controls */}
                  <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                          Live Room Auto-Submit: {formatSeconds(roomSecondsLeft)}
                        </span>
                      </div>

                      {isHost && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">MCQ Mode:</span>
                          <button
                            onClick={() => handleSwitchMcqType('PROJECTOR_MODE')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition ${
                              currentRoom.mcqType === 'PROJECTOR_MODE' || currentRoom.mcqType === 'MCQ_PRACTICE'
                                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                                : 'bg-slate-800 text-slate-300 hover:text-white'
                            }`}
                            title="Ek Lesson ke Pure MCQs (Notes, Lucent & Homework)"
                          >
                            🎯 MCQ
                          </button>
                          <button
                            onClick={() => handleSwitchMcqType('REVISION_HUB')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition ${
                              currentRoom.mcqType === 'REVISION_HUB'
                                ? 'bg-purple-500 text-slate-950 shadow-sm'
                                : 'bg-slate-800 text-slate-300 hover:text-white'
                            }`}
                            title="Revision Hub ke Subjects & Lessons"
                          >
                            ⚡ MCQ +
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold">Rules:</span>
                        <span className="text-slate-300">
                          Sahi: <b className="text-emerald-400">+5 XP</b> | Galat: <b className="text-rose-400">-2 XP</b> |
                          Streak Bonus (3: <b className="text-amber-300">+10</b>, 5: <b className="text-amber-300">+15</b>, 7+: <b className="text-amber-300">+20</b>)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Invite & Share Bar (No Instagram) */}
                  <div className="mb-4 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">👥 Doston ko bulayein:</span>
                      <span className="font-mono text-xs font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/30">
                        Code: {currentRoom.code}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleCopyCode}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 active:scale-95 transition cursor-pointer"
                      >
                        {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                      </button>
                      {isHost && (
                        <button
                          onClick={() => setActiveTab('MCQ')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md active:scale-95 transition cursor-pointer"
                          title="Wahi se koi bhi lesson ka MCQ start karein"
                        >
                          <Play size={13} /> Start Live MCQ
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Collapsible Info during active MCQ */}
              {isMcqRunning && showMobileRoomInfo && (
                <div className="mb-3 p-3 rounded-2xl bg-slate-900 border border-amber-500/40 text-white text-xs space-y-1.5 animate-in slide-in-from-top duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-black flex items-center gap-1">
                      <Info size={13} /> Scoring & XP Rules:
                    </span>
                    <button onClick={() => setShowMobileRoomInfo(false)} className="text-slate-400 hover:text-white text-[11px] cursor-pointer">✕ Close</button>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Sahi Uttar: <b className="text-emerald-400">+5 XP</b> | Galat: <b className="text-rose-400">-2 XP</b><br />
                    Streak Bonus: 3 Sahi: <b className="text-amber-300">+10</b>, 5 Sahi: <b className="text-amber-300">+15</b>, 7+ Sahi: <b className="text-amber-300">+20 XP</b>
                  </p>
                </div>
              )}

              {/* Collapsible Invite during active MCQ */}
              {isMcqRunning && showMobileInvite && (
                <div className="mb-3 p-3 rounded-2xl bg-slate-900 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2 animate-in slide-in-from-top duration-150">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300">Room Code:</span>
                    <span className="font-mono text-xs font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">{currentRoom.code}</span>
                    {currentRoom.password && (
                      <span className="font-mono text-xs font-bold text-amber-300">🔑 PW: {currentRoom.password}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyCode}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                    <button onClick={() => setShowMobileInvite(false)} className="text-slate-400 hover:text-white text-xs pl-1 cursor-pointer">✕</button>
                  </div>
                </div>
              )}

              {/* Collapsible Host Settings during active MCQ */}
              {isMcqRunning && isHost && showMobileHostControls && (
                <div className="mb-3 p-3 rounded-2xl bg-slate-900 border border-indigo-500/40 text-white text-xs space-y-2 animate-in slide-in-from-top duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-400 font-black flex items-center gap-1">
                      <Settings size={13} /> Host Battle Controls:
                    </span>
                    <button onClick={() => setShowMobileHostControls(false)} className="text-slate-400 hover:text-white text-[11px] cursor-pointer">✕ Close</button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-400 text-[11px]">Timer per Q:</span>
                      <div className="flex items-center gap-1">
                        {[10, 15, 20, 30, 45, 60].map((sec) => (
                          <button
                            key={`dur_drawer_${sec}`}
                            type="button"
                            onClick={() => handleSetDuration(sec)}
                            className={`px-2 py-1 rounded-lg font-black transition cursor-pointer text-[10px] ${
                              duration === sec
                                ? 'bg-amber-500 text-slate-950 shadow'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={handleToggleAutoAdvance}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                          autoAdvanceEnabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        ⚡ Auto-Next: {autoAdvanceEnabled ? 'ON' : 'OFF'}
                      </button>
                      <button
                        type="button"
                        onClick={handleForceEndBattle}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-[10px] hover:bg-rose-500/30 cursor-pointer"
                      >
                        🏁 Submit & End
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Floating Dynamic XP Outcome Notification */}
              {showXpBanner && lastXpOutcome && (
                <div
                  className={`mb-3 p-3 rounded-2xl border flex items-center justify-between text-xs font-black animate-in slide-in-from-top duration-200 ${
                    lastXpOutcome.isCorrect
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                      : lastXpOutcome.streakBonusXp > 0
                      ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                      : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{lastXpOutcome.isCorrect ? '🎉' : '⚠️'}</span>
                    <span>
                      {lastXpOutcome.isCorrect
                        ? `Sahi Uttar! +5 XP mila! 🔥 Current Streak: ${lastXpOutcome.currentStreak}`
                        : lastXpOutcome.streakBonusXp > 0
                        ? `Galat Answer (-2 XP) · 🏆 Streak Tooti (${lastXpOutcome.streakBrokenAt} streak) Bonus: +${lastXpOutcome.streakBonusXp} XP! (Net: +${lastXpOutcome.netXpChange} XP)`
                        : `Galat Answer (-2 XP). Agla sawal sahi karke naya streak banayein!`}
                    </span>
                  </div>
                  <span className="font-mono text-sm">
                    {lastXpOutcome.netXpChange >= 0 ? `+${lastXpOutcome.netXpChange}` : lastXpOutcome.netXpChange} XP
                  </span>
                </div>
              )}

              {/* Room Mode Tabs: MCQ vs LEADERBOARD vs MEMBERS - Hidden during active MCQ on mobile to save vertical space */}
              {!isMcqRunning && (
                <div className="flex items-center justify-between mb-4 bg-slate-950/60 p-2 rounded-2xl border border-slate-800 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveTab('MCQ')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'MCQ'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Trophy size={14} className="text-amber-400" />
                      <span>Live MCQ Battle</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('LEADERBOARD')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'LEADERBOARD'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Award size={14} />
                      <span>Leaderboard & Scores</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('MEMBERS')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'MEMBERS'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Users size={14} />
                      <span>{Object.keys(currentRoom.members || {}).length} Online</span>
                    </button>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400">
                    Room: <b className="text-slate-200">{currentRoom.code}</b>
                  </div>
                </div>
              )}

              {/* ── TAB 1: LIVE MCQ BATTLE ── */}
              {activeTab === 'MCQ' && (
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  {/* Battle State: WAITING (Host launches quiz) */}
                  {(!currentRoom.liveMcq?.isActive || currentRoom.liveMcq?.status === 'WAITING') && (
                    <div className="rounded-2xl bg-slate-800/60 border border-slate-700 p-6 text-center space-y-4 my-auto shadow-xl">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-3xl">
                        🎯
                      </div>
                      <h3 className="text-xl font-black text-white">Live MCQ Battle Arena</h3>
                      <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                        Sabhi members ek hi samay par sawal hal karenge. Har sahi sawal par <b>+5 XP</b> aur speed points
                        milenge. Galat uttar par <b>-2 XP</b> aur streak tootne par bonus milega!
                      </p>

                      {isHost ? (
                        <div className="space-y-3.5 max-w-lg mx-auto pt-2 text-left">
                          {/* 1. Mode Switcher (🎯 MCQ vs ⚡ MCQ +) */}
                          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                                <span>1. MCQ Battle Mode:</span>
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {currentRoom.mcqType === 'REVISION_HUB' ? '⚡ MCQ + Active' : '🎯 MCQ Mode Active'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  handleSwitchMcqType('PROJECTOR_MODE');
                                  setBattleSearch('');
                                  setBattleSubject('ALL');
                                  setBattleCategory('ALL');
                                  setBattleBook('ALL');
                                }}
                                className={`p-2.5 rounded-xl border text-left cursor-pointer transition relative ${
                                  currentRoom.mcqType !== 'REVISION_HUB'
                                    ? 'bg-cyan-600/30 border-cyan-400 text-white shadow ring-1 ring-cyan-500/50'
                                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black flex items-center gap-1">
                                    <span>🎯</span> MCQ Mode
                                  </span>
                                  {currentRoom.mcqType !== 'REVISION_HUB' && (
                                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                  )}
                                </div>
                                <p className="text-[9px] text-slate-300 mt-0.5">Syllabus & All Competition Books</p>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  handleSwitchMcqType('REVISION_HUB');
                                  setBattleSearch('');
                                  setBattleSubject('ALL');
                                  setBattleBook('ALL');
                                }}
                                className={`p-2.5 rounded-xl border text-left cursor-pointer transition relative ${
                                  currentRoom.mcqType === 'REVISION_HUB'
                                    ? 'bg-purple-600/30 border-purple-400 text-white shadow ring-1 ring-purple-500/50'
                                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black flex items-center gap-1">
                                    <span>⚡</span> MCQ + Mode
                                  </span>
                                  {currentRoom.mcqType === 'REVISION_HUB' && (
                                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                  )}
                                </div>
                                <p className="text-[9px] text-slate-300 mt-0.5">Revision Hub & Only Lucent Comp</p>
                              </button>
                            </div>

                            {/* 1.1 Sub-Category: Academic Syllabus vs Competition */}
                            <div className="pt-2 border-t border-slate-800">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                                  <span>2. Section Chunein:</span>
                                </span>
                                <span className="text-[9px] text-amber-300 font-bold">
                                  {currentRoom.mcqType === 'REVISION_HUB'
                                    ? battleDomain === 'COMPETITION'
                                      ? '⚡ Revision Hub: Only Lucent'
                                      : '⚡ Board Syllabus'
                                    : battleDomain === 'COMPETITION'
                                    ? '🎯 Sabhi Competition Books'
                                    : '🎯 Academic Notes & HW'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBattleDomain('ACADEMIC');
                                    setBattleSubject('ALL');
                                    setBattleCategory('ALL');
                                  }}
                                  className={`px-3 py-2 rounded-xl border text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                    battleDomain === 'ACADEMIC'
                                      ? currentRoom.mcqType === 'REVISION_HUB'
                                        ? 'bg-purple-600 text-white border-purple-400 shadow'
                                        : 'bg-cyan-600 text-white border-cyan-400 shadow'
                                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <span>📚</span>
                                  <span>Academic Syllabus</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setBattleDomain('COMPETITION');
                                    setBattleSubject('ALL');
                                    setBattleBook('ALL');
                                  }}
                                  className={`px-3 py-2 rounded-xl border text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                    battleDomain === 'COMPETITION'
                                      ? 'bg-amber-600 text-white border-amber-400 shadow'
                                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <span>🏆</span>
                                  <span>
                                    Competition {currentRoom.mcqType === 'REVISION_HUB' ? '(Only Lucent)' : '(All Books)'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 2. Timer & Auto-Advance Settings */}
                          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                <Clock size={14} className="text-amber-400" /> Har Sawal Ka Timer:
                              </span>
                              <span className="text-xs font-black text-amber-400">
                                {selectedTimerDuration} Sec
                              </span>
                            </div>
                            <div className="grid grid-cols-6 gap-1.5">
                              {[10, 15, 20, 30, 45, 60].map((sec) => (
                                <button
                                  key={`dur_top_${sec}`}
                                  type="button"
                                  onClick={() => setSelectedTimerDuration(sec)}
                                  className={`py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                                    selectedTimerDuration === sec
                                      ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300'
                                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  {sec}s
                                </button>
                              ))}
                            </div>

                            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                <Zap size={14} className="text-emerald-400" /> Auto-Advance (Agla Sawal):
                              </span>
                              <button
                                type="button"
                                onClick={() => setAutoAdvanceEnabled(!autoAdvanceEnabled)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                                  autoAdvanceEnabled
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {autoAdvanceEnabled ? '⚡ ON (3s Auto)' : 'OFF (Manual)'}
                              </button>
                            </div>
                          </div>

                          {/* 3. Filter Section based on Mode & Domain */}
                          {currentRoom.mcqType === 'REVISION_HUB' ? (
                            battleDomain === 'ACADEMIC' ? (
                              /* ⚡ MCQ+ Mode: Academic Syllabus (Class 6-12) */
                              <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2.5">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-purple-300">Class Chunein:</span>
                                    <span className="text-[10px] text-slate-400 font-bold">
                                      Revision Hub (Class 6th se 12th)
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBattleClass('ALL');
                                        setBattleSubject('ALL');
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition ${
                                        battleClass === 'ALL'
                                          ? 'bg-purple-500 text-slate-950 shadow-md'
                                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                                      }`}
                                    >
                                      Sabhi Classes
                                    </button>
                                    {academicClasses.map((cls, cIdx) => {
                                      const revCount = allRealLessons.filter(
                                        (l) => l.sourceType === 'REVISION_HUB' && l.classLevel === cls
                                      ).length;
                                      return (
                                        <button
                                          key={`avail_cls_${cls || cIdx}`}
                                          type="button"
                                          onClick={() => {
                                            setBattleClass(cls);
                                            setBattleSubject('ALL');
                                          }}
                                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition ${
                                            battleClass === cls
                                              ? 'bg-purple-500 text-slate-950 shadow-md'
                                              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                                          }`}
                                        >
                                          Class {cls} {revCount > 0 ? `(${revCount})` : ''}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Subject Selection */}
                                {(() => {
                                  const classLessons = allRealLessons.filter(
                                    (l) =>
                                      l.sourceType === 'REVISION_HUB' &&
                                      l.classLevel !== 'COMPETITION' &&
                                      (battleClass === 'ALL' || l.classLevel === battleClass)
                                  );
                                  const subjects = Array.from(new Set(classLessons.map((l) => l.subject))).filter(Boolean).sort();
                                  if (subjects.length === 0) return null;
                                  return (
                                    <div className="space-y-1">
                                      <span className="text-[11px] font-bold text-purple-300 block">Subject Chunein:</span>
                                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                                        <button
                                          type="button"
                                          onClick={() => setBattleSubject('ALL')}
                                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                                            battleSubject === 'ALL'
                                              ? 'bg-purple-600 text-white font-black shadow'
                                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                                          }`}
                                        >
                                          Sabhi ({classLessons.length})
                                        </button>
                                        {subjects.map((sub, subIdx) => {
                                          const subCount = classLessons.filter((l) => l.subject === sub).length;
                                          return (
                                            <button
                                              key={`avail_sub_${sub || subIdx}`}
                                              type="button"
                                              onClick={() => setBattleSubject(sub)}
                                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                                                battleSubject === sub
                                                  ? 'bg-purple-600 text-white font-black shadow'
                                                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                                              }`}
                                            >
                                              {sub} ({subCount})
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Search input */}
                                <div className="relative">
                                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                  <input
                                    type="text"
                                    value={battleSearch}
                                    onChange={(e) => setBattleSearch(e.target.value)}
                                    placeholder="🔍 Revision Hub syllabus lesson search karein..."
                                    className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-400"
                                  />
                                  {battleSearch && (
                                    <button
                                      type="button"
                                      onClick={() => setBattleSearch('')}
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* ⚡ MCQ+ Mode: Competition (STRICTLY ONLY LUCENT) */
                              <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2.5">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-amber-300">
                                      📖 Lucent Samanya Gyan / GK (Only Lucent):
                                    </span>
                                    <span className="text-[10px] text-amber-400 font-bold">
                                      ⚡ Revision Hub Competition
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400">
                                    MCQ + Mode me competition me Revision Hub se <b>sirf Lucent</b> ke sets aate hain.
                                  </p>
                                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                                    <button
                                      type="button"
                                      onClick={() => setBattleSubject('ALL')}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                                        battleSubject === 'ALL'
                                          ? 'bg-amber-500 text-slate-950 font-black shadow'
                                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                                      }`}
                                    >
                                      Sabhi Lucent Topics
                                    </button>
                                    {lucentSubjectOptions.map((opt) => (
                                      <button
                                        key={`luc_subj_${opt.id}`}
                                        type="button"
                                        onClick={() => setBattleSubject(opt.name)}
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                                          battleSubject === opt.name
                                            ? 'bg-amber-500 text-slate-950 font-black shadow'
                                            : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                                        }`}
                                      >
                                        {opt.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="relative">
                                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                  <input
                                    type="text"
                                    value={battleSearch}
                                    onChange={(e) => setBattleSearch(e.target.value)}
                                    placeholder="🔍 Lucent topic ya chapter search karein..."
                                    className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                                  />
                                  {battleSearch && (
                                    <button
                                      type="button"
                                      onClick={() => setBattleSearch('')}
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          ) : (
                            /* 🎯 MCQ Mode: Academic vs Competition */
                            battleDomain === 'ACADEMIC' ? (
                              /* 🎯 MCQ Mode: Academic Syllabus (Notes & Homework) */
                              <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2.5">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-cyan-300">Class Chunein:</span>
                                    <span className="text-[10px] text-slate-400 font-bold">
                                      Notes & Homework Sets
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setBattleClass('ALL')}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition ${
                                        battleClass === 'ALL'
                                          ? 'bg-cyan-500 text-slate-950 shadow-md'
                                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                                      }`}
                                    >
                                      Sabhi Classes
                                    </button>
                                    {academicClasses.map((cls, cIdx) => (
                                      <button
                                        key={`mcq_acad_cls_${cls || cIdx}`}
                                        type="button"
                                        onClick={() => setBattleClass(cls)}
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition ${
                                          battleClass === cls
                                            ? 'bg-cyan-500 text-slate-950 shadow-md'
                                            : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                                        }`}
                                      >
                                        Class {cls}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[11px] font-bold text-cyan-300 block">Category:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {(['ALL', 'NOTES', 'HOMEWORK'] as const).map((cat, catIdx) => (
                                      <button
                                        key={`cat_${cat}_${catIdx}`}
                                        type="button"
                                        onClick={() => setBattleCategory(cat)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition ${
                                          battleCategory === cat
                                            ? 'bg-cyan-500 text-slate-950 shadow-md'
                                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                                        }`}
                                      >
                                        {cat === 'ALL'
                                          ? 'Sabhi'
                                          : cat === 'NOTES'
                                          ? '📖 Notes ke MCQs'
                                          : '📝 Homework'}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="relative">
                                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                  <input
                                    type="text"
                                    value={battleSearch}
                                    onChange={(e) => setBattleSearch(e.target.value)}
                                    placeholder="🔍 Lesson ka naam search karein (Math, Science, Chapter)..."
                                    className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                                  />
                                  {battleSearch && (
                                    <button
                                      type="button"
                                      onClick={() => setBattleSearch('')}
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* 🎯 MCQ Mode: Competition (ALL COMPETITION BOOKS) */
                              <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2.5">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-amber-300">
                                      📚 Competition Book Chunein (Sabhi Books):
                                    </span>
                                    <span className="text-[10px] text-amber-400 font-bold">
                                      {allCompetitionBooks.length} Books
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                                    {allCompetitionBooks.map((b) => (
                                      <button
                                        key={`comp_book_${b.id}`}
                                        type="button"
                                        onClick={() => setBattleBook(b.id)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition flex items-center gap-1 ${
                                          battleBook === b.id
                                            ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-300'
                                            : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                                        }`}
                                      >
                                        <span>{b.emoji}</span>
                                        <span>{b.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="relative">
                                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                  <input
                                    type="text"
                                    value={battleSearch}
                                    onChange={(e) => setBattleSearch(e.target.value)}
                                    placeholder="🔍 Book / Chapter / Subject search karein..."
                                    className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                                  />
                                  {battleSearch && (
                                    <button
                                      type="button"
                                      onClick={() => setBattleSearch('')}
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          )}

                          {/* 4. Lesson Selection List */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                {currentRoom.mcqType === 'REVISION_HUB' ? (
                                  <span className="text-purple-300 flex items-center gap-1.5">
                                    <Zap size={14} className="text-purple-400 fill-purple-400" />
                                    <span>3. Lesson Chunein:</span>
                                  </span>
                                ) : (
                                  <span className="text-cyan-300 flex items-center gap-1.5">
                                    <BookOpen size={14} className="text-cyan-400" />
                                    <span>Lesson Chunein:</span>
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] font-black text-slate-400">
                                {availableBattleSets.length} Lessons Uplabdh
                              </span>
                            </div>

                            {availableBattleSets.length > 0 ? (
                              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                {availableBattleSets.map((set, sIdx) => {
                                  const isSelected = selectedCuratedSet === set.id;
                                  const isRevision = currentRoom.mcqType === 'REVISION_HUB';
                                  return (
                                    <label
                                      key={set.id ? `${set.id}_${sIdx}` : `battle_set_${sIdx}`}
                                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition text-left ${
                                        isSelected
                                          ? isRevision
                                            ? 'bg-purple-600/25 border-purple-400 text-white ring-1 ring-purple-500/50 shadow-md'
                                            : 'bg-cyan-600/25 border-cyan-400 text-white ring-1 ring-cyan-500/50 shadow-md'
                                          : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name="mcqSet"
                                        checked={isSelected}
                                        onChange={() => setSelectedCuratedSet(set.id)}
                                        className="sr-only"
                                      />
                                      <span className="text-xl shrink-0">{set.emoji}</span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <p className="text-xs font-black truncate">{set.name}</p>
                                          {set.tag && (
                                            <span
                                              className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border shrink-0 ${
                                                set.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                                              }`}
                                            >
                                              {set.tag}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                          {set.questions.length} Questions • {selectedTimerDuration}s per question
                                        </p>
                                      </div>
                                      {isSelected && (
                                        <CheckCircle2
                                          size={16}
                                          className={`shrink-0 ${isRevision ? 'text-purple-400' : 'text-cyan-400'}`}
                                        />
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="py-4 text-center space-y-2 bg-slate-900/60 rounded-xl border border-slate-800 p-3">
                                <p className="text-xs text-slate-400 font-semibold">
                                  Is filter me koi lesson nahi mila.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBattleSearch('');
                                    setBattleSubject('ALL');
                                    setBattleClass('ALL');
                                    setBattleCategory('ALL');
                                  }}
                                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition cursor-pointer"
                                >
                                  Filter Reset Karein
                                </button>
                              </div>
                            )}
                          </div>

                          {/* 5. Big Launch Button */}
                          <button
                            onClick={handleLaunchCuratedMcq}
                            disabled={availableBattleSets.length === 0}
                            className={`w-full py-3.5 rounded-xl font-black text-sm shadow-xl active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 ${
                              availableBattleSets.length === 0
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : currentRoom.mcqType === 'REVISION_HUB'
                                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-purple-900/30'
                                : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-900/30'
                            }`}
                          >
                            <Play size={16} className="fill-current" />
                            <span>
                              🚀 Launch {currentRoom.mcqType === 'REVISION_HUB' ? 'MCQ + Battle' : 'MCQ Battle'} Now ({selectedTimerDuration}s)
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="py-6 space-y-2 text-center">
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black animate-pulse">
                            <Clock size={16} /> Host live MCQ quiz start karne wala hai...
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Jaise hi host quiz shuru karega, aapke mobile par automatically sawal load ho jayega!
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Battle State: QUESTION or REVEAL */}
                  {currentRoom.liveMcq?.isActive &&
                    (currentRoom.liveMcq.status === 'QUESTION' || currentRoom.liveMcq.status === 'REVEAL') &&
                    (() => {
                      const qIdx = currentRoom.liveMcq!.currentQuestionIndex;
                      const q = currentRoom.liveMcq!.questions[qIdx];
                      if (!q) return null;

                      const isReveal = currentRoom.liveMcq!.status === 'REVEAL';
                      const isProjector = currentRoom.mcqType === 'PROJECTOR_MODE';
                      const isRevision = currentRoom.mcqType === 'REVISION_HUB';
                      const totalQuestions = currentRoom.liveMcq!.totalQuestions || currentRoom.liveMcq!.questions.length;
                      const duration = currentRoom.liveMcq!.durationPerQuestion || 20;

                      const currentQAnswers = currentRoom.liveMcq!.questionAnswers?.[qIdx] || {};
                      const roomMembers = Object.values(currentRoom.members || {});
                      const answeredCount = Object.keys(currentQAnswers).length;
                      const totalMembersCount = Math.max(roomMembers.length, 1);

                      return (
                        <div
                          className={`flex-1 flex flex-col justify-between space-y-4 ${
                            isProjector ? 'p-2 sm:p-4 rounded-3xl bg-slate-950 border-2 border-cyan-500/40' : ''
                          }`}
                        >
                          {/* Progress & Countdown Header */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                              <span className={isProjector ? 'text-sm font-black text-cyan-300' : ''}>
                                Question {qIdx + 1} of {totalQuestions}
                                {isRevision && (
                                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/30 text-purple-300 border border-purple-500/50">
                                    ⚡ MCQ + Sprint
                                  </span>
                                )}
                              </span>

                              {/* Timer Badge */}
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
                                  {answeredCount}/{totalMembersCount} Answered
                                </span>
                                {isReveal ? (
                                  <span className="font-mono font-black px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 text-xs animate-pulse">
                                    <FastForward size={14} /> Agla Sawal: {revealSecondsLeft}s
                                  </span>
                                ) : (
                                  <span
                                    className={`font-mono font-black flex items-center gap-1 ${
                                      isProjector
                                        ? 'text-xl sm:text-2xl text-cyan-300'
                                        : mcqSecondsLeft <= 5
                                        ? 'text-rose-400 animate-pulse text-base'
                                        : 'text-amber-400 text-sm'
                                    }`}
                                  >
                                    <Timer size={14} /> {mcqSecondsLeft}s
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Progress Bars */}
                            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                              {isReveal ? (
                                <div
                                  className="h-full bg-emerald-400 transition-all duration-1000"
                                  style={{
                                    width: `${Math.max(10, ((2 - revealSecondsLeft) / 2) * 100)}%`,
                                  }}
                                />
                              ) : (
                                <div
                                  className={`h-full transition-all duration-1000 ${
                                    isProjector
                                      ? 'bg-cyan-400'
                                      : isRevision
                                      ? 'bg-purple-500'
                                      : mcqSecondsLeft <= 5
                                      ? 'bg-rose-500 animate-pulse'
                                      : 'bg-amber-400'
                                  }`}
                                  style={{
                                    width: `${Math.max(0, Math.min(100, (mcqSecondsLeft / duration) * 100))}%`,
                                  }}
                                />
                              )}
                            </div>
                          </div>

                          {/* Question Card */}
                          <div
                            className={`rounded-2xl p-4 sm:p-5 shadow-xl transition-all ${
                              isProjector
                                ? 'bg-slate-900 border border-cyan-500/50'
                                : 'bg-slate-800/90 border border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  isProjector
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                Live MCQ #{qIdx + 1}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                Sahi: <b className="text-emerald-400">+5 XP</b> | Galat: <b className="text-rose-400">-2 XP</b>
                              </span>
                            </div>

                            <h4
                              className={`font-black text-white leading-relaxed ${
                                isProjector
                                  ? 'text-lg sm:text-2xl tracking-wide text-cyan-50'
                                  : 'text-base sm:text-lg'
                              }`}
                            >
                              {q.question}
                            </h4>
                          </div>

                          {/* Options Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options.map((opt, optIdx) => {
                              let btnStyle = isProjector
                                ? 'bg-slate-900/90 border-slate-700 text-white hover:border-cyan-400 text-base sm:text-lg'
                                : 'bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs md:text-sm';

                              if (selectedOption === optIdx) {
                                btnStyle = isProjector
                                  ? 'bg-cyan-600/50 border-cyan-400 text-white ring-2 ring-cyan-400'
                                  : 'bg-indigo-600/40 border-indigo-400 text-white ring-2 ring-indigo-400';
                              }

                              if (isReveal) {
                                if (optIdx === q.correctIndex) {
                                  btnStyle =
                                    'bg-emerald-600/40 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500';
                                } else if (selectedOption === optIdx && optIdx !== q.correctIndex) {
                                  btnStyle = 'bg-rose-600/40 border-rose-500 text-rose-200';
                                }
                              }

                              return (
                                <button
                                  key={`battle_opt_${optIdx}`}
                                  onClick={() => handleSelectOption(optIdx)}
                                  disabled={hasAnsweredCurrentQ || isReveal}
                                  className={`p-3.5 sm:p-4 rounded-2xl border text-left font-bold flex items-center gap-3 transition active:scale-95 disabled:cursor-not-allowed cursor-pointer ${btnStyle}`}
                                >
                                  <span
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black shrink-0 ${
                                      isProjector
                                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-sm'
                                        : 'bg-slate-950/70 text-slate-300 text-xs'
                                    }`}
                                  >
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span className="flex-1 leading-snug">{opt}</span>
                                  {isReveal && optIdx === q.correctIndex && (
                                    <Check size={18} className="text-emerald-400 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Answer Status or Explanation */}
                          {isReveal ? (
                            <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-3 text-xs text-emerald-200 space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="font-black text-sm text-emerald-300 flex items-center gap-1.5">
                                  <CheckCircle2 size={16} /> Sahi Uttar: Option {String.fromCharCode(65 + q.correctIndex)}
                                </p>
                                {autoAdvanceEnabled && (
                                  <span className="text-[11px] font-black text-emerald-400 bg-emerald-900/50 px-2 py-0.5 rounded">
                                    Agla Sawal {revealSecondsLeft}s me 🚀
                                  </span>
                                )}
                              </div>
                              {q.explanation && (
                                <p className="text-xs text-emerald-300/90 pt-0.5">{q.explanation}</p>
                              )}
                            </div>
                          ) : hasAnsweredCurrentQ ? (
                            <div className="text-center text-xs font-medium text-slate-400">
                              <span className="text-emerald-300 font-black flex items-center justify-center gap-1.5">
                                <CheckCircle2 size={15} /> Uttar Lock Ho Gaya! Timer khatam hote hi agla sawal aayega ({mcqSecondsLeft}s)...
                              </span>
                            </div>
                          ) : null}

                          {/* ── REAL-TIME PARTICIPANT LEADERBOARD: Kon Banaya Kon Nahi, Kitna Der Me ── */}
                          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-2.5 space-y-2">
                            <div
                              onClick={() => setShowLiveAnswersSheet(!showLiveAnswersSheet)}
                              className="flex items-center justify-between cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                <h5 className="text-xs font-black text-white flex items-center gap-1.5">
                                  <BarChart3 size={13} className="text-amber-400" /> Live Tracker (Q{qIdx + 1})
                                </h5>
                                <span className="text-[11px] font-bold text-slate-400">
                                  • {answeredCount}/{totalMembersCount} Answered
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300">
                                {showLiveAnswersSheet ? 'Hide ▴' : 'Show Details ▾'}
                              </span>
                            </div>

                            {showLiveAnswersSheet && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                                {roomMembers.map((m, mIdx) => {
                                  const ans = currentQAnswers[m.id];
                                  const userScore = currentRoom.liveMcq?.scores?.[m.id];
                                  const isCurrentUser = m.id === user?.id;

                                  return (
                                    <div
                                      key={m?.id ? `member_${m.id}_${mIdx}` : `member_${mIdx}`}
                                      className={`p-2 rounded-xl border flex items-center justify-between text-xs transition ${
                                        isCurrentUser
                                          ? 'bg-indigo-950/40 border-indigo-500/50 shadow-sm'
                                          : 'bg-slate-800/60 border-slate-700/60'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden">
                                          {m.photoURL ? (
                                            <img src={m.photoURL} alt={m.name} className="w-full h-full object-cover" />
                                          ) : (
                                            m.name.charAt(0).toUpperCase()
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-bold text-slate-200 truncate text-[11px]">
                                            {m.name} {isCurrentUser && '(Aap)'}
                                          </p>
                                          <p className="text-[10px] text-amber-400 font-black">
                                            {userScore?.score || 0} pts • 🔥 {userScore?.currentStreak || 0}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Live Response Status */}
                                      <div className="text-right shrink-0">
                                        {ans ? (
                                          isReveal ? (
                                            <div className="flex flex-col items-end">
                                              <span
                                                className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                                  ans.isCorrect
                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                }`}
                                              >
                                                {ans.isCorrect ? '✅ Sahi' : '❌ Galat'} ({String.fromCharCode(65 + ans.selectedOption)})
                                              </span>
                                              <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                                                ⚡ {ans.timeTakenSec.toFixed(1)}s me
                                              </span>
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-end">
                                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                ✅ Banaya
                                              </span>
                                              <span className="text-[9px] text-amber-300 font-mono font-bold mt-0.5">
                                                ⚡ {ans.timeTakenSec.toFixed(1)}s me
                                              </span>
                                            </div>
                                          )
                                        ) : (
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400 animate-pulse">
                                            ⏳ Soch raha hai...
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Host Controls */}
                          {isHost && (
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                              <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">
                                Host Action Bar
                              </span>
                              <div className="flex items-center gap-2 ml-auto">
                                {!isReveal ? (
                                  <button
                                    onClick={handleRevealAnswer}
                                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                                  >
                                    <Eye size={15} /> Show Answer (Reveal)
                                  </button>
                                ) : (
                                  <button
                                    onClick={handleNextMcqQuestion}
                                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                                  >
                                    {qIdx + 1 >= totalQuestions ? (
                                      <>Final Results & XP 🏆</>
                                    ) : (
                                      <>Next Question ➡️ ({revealSecondsLeft}s)</>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  {/* Battle State: ENDED (Complete Results, Podium & Question-by-Question Review) */}
                  {(currentRoom.liveMcq?.status === 'ENDED' || currentRoom.isExpired) && (() => {
                    const scores = Object.entries(currentRoom.liveMcq?.scores || {}).sort(
                      (a, b) => (b[1].score || 0) - (a[1].score || 0)
                    );
                    const myScore = user?.id ? currentRoom.liveMcq?.scores?.[user.id] : null;
                    const myRank = user?.id ? scores.findIndex(([uid]) => uid === user.id) + 1 : 0;
                    const totalQ = currentRoom.liveMcq?.totalQuestions || currentRoom.liveMcq?.questions?.length || 0;
                    const questions = currentRoom.liveMcq?.questions || [];
                    const allAnswersMap = currentRoom.liveMcq?.questionAnswers || {};

                    const myAccuracy =
                      myScore && totalQ > 0
                        ? Math.round(((myScore.correctCount || 0) / totalQ) * 100)
                        : 0;

                    return (
                      <div className="rounded-2xl bg-slate-900/95 border border-slate-700 p-5 sm:p-6 text-center space-y-6 shadow-2xl overflow-y-auto max-h-[75vh]">
                        <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center mx-auto text-3xl shadow-lg">
                          🏆
                        </div>

                        <div>
                          <h3 className="text-xl sm:text-2xl font-black text-white">
                            Live MCQ Battle Final Results & Report
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">
                            {currentRoom.name} • {totalQ} Questions Completed • {scores.length} Participants
                            {currentRoom.isExpired && ' • Room Time Expired & Auto-Submitted'}
                          </p>
                        </div>

                        {/* Podium Top 3 */}
                        <div className="flex items-end justify-center gap-3 pt-2">
                          {scores[1] && (
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-bold text-slate-300 truncate max-w-[85px]">
                                {scores[1][1].name}
                              </span>
                              <span className="text-[10px] text-amber-400 font-bold">{scores[1][1].score} pts</span>
                              <div className="w-20 sm:w-24 h-20 rounded-t-2xl bg-slate-700 flex flex-col items-center justify-center font-black text-slate-300 mt-1 shadow">
                                <span className="text-lg">🥈</span>
                                <span className="text-xs">2nd</span>
                              </div>
                            </div>
                          )}
                          {scores[0] && (
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-black text-amber-300 truncate max-w-[95px]">
                                👑 {scores[0][1].name}
                              </span>
                              <span className="text-[11px] text-amber-400 font-black">{scores[0][1].score} pts</span>
                              <div className="w-24 sm:w-28 h-28 rounded-t-2xl bg-gradient-to-t from-amber-600/40 to-amber-500/40 border-2 border-amber-400 flex flex-col items-center justify-center font-black text-amber-300 mt-1 shadow-xl">
                                <span className="text-2xl">🥇</span>
                                <span className="text-sm">1st Place</span>
                              </div>
                            </div>
                          )}
                          {scores[2] && (
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-bold text-slate-300 truncate max-w-[85px]">
                                {scores[2][1].name}
                              </span>
                              <span className="text-[10px] text-amber-400 font-bold">{scores[2][1].score} pts</span>
                              <div className="w-20 sm:w-24 h-16 rounded-t-2xl bg-amber-900/40 flex flex-col items-center justify-center font-black text-amber-500 mt-1 shadow">
                                <span className="text-lg">🥉</span>
                                <span className="text-xs">3rd</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Personal Performance Scorecard */}
                        {myScore && (
                          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 max-w-xl mx-auto text-left space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
                                <Medal size={14} className="text-amber-400" /> Aapka Performance Card
                              </h4>
                              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Rank #{myRank || 1} • {myScore.score || 0} Points
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                <span className="block text-[10px] text-slate-400 font-bold">Sahi (+5 XP)</span>
                                <span className="text-base font-black text-emerald-400">
                                  {myScore.correctCount || 0}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                <span className="block text-[10px] text-slate-400 font-bold">Galat (-2 XP)</span>
                                <span className="text-base font-black text-rose-400">
                                  {myScore.wrongCount || 0}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                <span className="block text-[10px] text-slate-400 font-bold">Accuracy</span>
                                <span className="text-base font-black text-cyan-400">
                                  {myAccuracy}%
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40">
                                <span className="block text-[10px] text-indigo-300 font-bold">Room XP</span>
                                <span className="text-base font-black text-white">
                                  +{myScore.userXp || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Full Participants Leaderboard Table */}
                        <div className="max-w-xl mx-auto text-left space-y-2">
                          <h4 className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                            <Trophy size={14} className="text-amber-400" /> Sabhi Participants Ka Final Result
                          </h4>
                          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
                            <div className="grid grid-cols-12 gap-1 p-2 bg-slate-900 text-[10px] font-black text-slate-400 uppercase">
                              <div className="col-span-2">Rank</div>
                              <div className="col-span-5">Student</div>
                              <div className="col-span-2 text-center">Sahi</div>
                              <div className="col-span-3 text-right">Points / XP</div>
                            </div>
                            <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto">
                              {scores.map(([uid, data], idx) => {
                                const isCurrentUser = uid === user?.id;
                                return (
                                  <div
                                    key={uid ? `score_${uid}_${idx}` : `score_${idx}`}
                                    className={`grid grid-cols-12 gap-1 p-2 text-xs items-center ${
                                      isCurrentUser ? 'bg-indigo-950/40 font-black text-white' : 'text-slate-300'
                                    }`}
                                  >
                                    <div className="col-span-2 font-black">
                                      {idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`}
                                    </div>
                                    <div className="col-span-5 truncate flex items-center gap-1.5">
                                      <span className="truncate">{data.name}</span>
                                      {isCurrentUser && <span className="text-[9px] text-indigo-400 font-bold">(Aap)</span>}
                                    </div>
                                    <div className="col-span-2 text-center font-bold text-emerald-400">
                                      {data.correctCount || 0}/{totalQ}
                                    </div>
                                    <div className="col-span-3 text-right font-black text-amber-400">
                                      {data.score} pts
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* ── QUESTION-BY-QUESTION DEEP REVIEW (Har Ek Sawal Ka Vishleshan) ── */}
                        {questions.length > 0 && (
                          <div className="max-w-xl mx-auto text-left space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                                <BookOpen size={14} className="text-emerald-400" /> Har Ek Sawal Ka Full Analysis & Answers
                              </h4>
                              <span className="text-[11px] font-bold text-slate-400">
                                {questions.length} Questions Review
                              </span>
                            </div>

                            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                              {questions.map((questionItem, qIndex) => {
                                const qAnswers = allAnswersMap[qIndex] || {};
                                const myAnswer = user?.id ? qAnswers[user.id] : null;
                                const isExpanded = selectedReviewQIdx === qIndex;

                                const correctCountInRoom = Object.values(qAnswers).filter((a) => a.isCorrect).length;
                                const totalAnsweredInRoom = Object.keys(qAnswers).length;

                                return (
                                  <div
                                    key={`rev_q_${qIndex}`}
                                    className="p-3 rounded-xl border border-slate-800 bg-slate-800/60 space-y-2"
                                  >
                                    <div
                                      onClick={() => setSelectedReviewQIdx(isExpanded ? null : qIndex)}
                                      className="flex items-start justify-between gap-2 cursor-pointer"
                                    >
                                      <div className="flex items-start gap-2 min-w-0">
                                        <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                                          {qIndex + 1}
                                        </span>
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-white line-clamp-2">
                                            {questionItem.question}
                                          </p>
                                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                                            {myAnswer ? (
                                              myAnswer.isCorrect ? (
                                                <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                                                  <CheckCircle2 size={11} /> Aapka Sahi (⚡ {myAnswer.timeTakenSec.toFixed(1)}s)
                                                </span>
                                              ) : (
                                                <span className="text-rose-400 font-bold flex items-center gap-0.5">
                                                  <XCircle size={11} /> Aapka Galat (⚡ {myAnswer.timeTakenSec.toFixed(1)}s)
                                                </span>
                                              )
                                            ) : (
                                              <span className="text-slate-400">
                                                Aapne attempt nahi kiya
                                              </span>
                                            )}
                                            <span className="text-slate-500">•</span>
                                            <span className="text-slate-400">
                                              Room me {correctCountInRoom}/{Math.max(totalAnsweredInRoom, 1)} ne sahi kiya
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <span className="text-[10px] font-bold text-indigo-400 shrink-0 mt-1">
                                        {isExpanded ? 'Chhupayein' : 'Dekhein'}
                                      </span>
                                    </div>

                                    {/* Expanded Detail View of Question */}
                                    {isExpanded && (
                                      <div className="pt-2 border-t border-slate-700/60 space-y-2 text-xs">
                                        <div className="space-y-1">
                                          {questionItem.options.map((optText, optI) => {
                                            const isCorrectOpt = optI === questionItem.correctIndex;
                                            const wasSelectedByMe = myAnswer && myAnswer.selectedOption === optI;

                                            return (
                                              <div
                                                key={`rev_opt_${optI}`}
                                                className={`p-2 rounded-lg text-xs font-bold flex items-center justify-between ${
                                                  isCorrectOpt
                                                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                                                    : wasSelectedByMe
                                                    ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
                                                    : 'bg-slate-900/60 text-slate-400'
                                                }`}
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className="w-5 h-5 rounded bg-slate-950/60 text-[10px] flex items-center justify-center font-black">
                                                    {String.fromCharCode(65 + optI)}
                                                  </span>
                                                  <span>{optText}</span>
                                                </div>
                                                <div className="text-[10px] font-black flex items-center gap-1">
                                                  {isCorrectOpt && (
                                                    <span className="text-emerald-400 flex items-center gap-0.5">
                                                      <Check size={12} /> Sahi Uttar
                                                    </span>
                                                  )}
                                                  {wasSelectedByMe && !isCorrectOpt && (
                                                    <span className="text-rose-400 flex items-center gap-0.5">
                                                      <X size={12} /> Aapka Chuna Uttar
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {questionItem.explanation && (
                                          <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-[11px] leading-relaxed">
                                            <b>Vishleshan (Explanation):</b> {questionItem.explanation}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
                          {isHost ? (
                            <>
                              <button
                                onClick={() => endLiveMcqBattle(currentRoom.id)}
                                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                              >
                                <BookOpen size={14} /> Agla MCQ Lesson Chunein (Lobby Me Jayein)
                              </button>
                              <button
                                onClick={() => endLiveMcqBattle(currentRoom.id)}
                                className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                              >
                                <RotateCcw size={14} /> Reset Arena (Naya Battle)
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setActiveTab('CHAT')}
                              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                            >
                              <MessageSquare size={14} /> Classroom Chat & Doubts Me Jayein
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── TAB 2: LEADERBOARD ── */}
              {activeTab === 'LEADERBOARD' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Trophy size={16} className="text-amber-400" /> Room Battle Leaderboard & XP
                  </h4>

                  {currentRoom.liveMcq?.scores && Object.keys(currentRoom.liveMcq.scores).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(currentRoom.liveMcq.scores)
                        .sort((a, b) => (b[1].score || 0) - (a[1].score || 0))
                        .map(([uid, data], idx) => (
                          <div
                            key={uid ? `tab_score_${uid}_${idx}` : `tab_score_${idx}`}
                            className={`flex items-center justify-between p-3 rounded-xl border ${
                              uid === user?.id
                                ? 'bg-indigo-950/50 border-indigo-500/50'
                                : 'bg-slate-800/70 border-slate-700/80'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-6 text-center font-black text-xs ${
                                  idx === 0
                                    ? 'text-amber-400'
                                    : idx === 1
                                    ? 'text-slate-300'
                                    : idx === 2
                                    ? 'text-amber-600'
                                    : 'text-slate-500'
                                }`}
                              >
                                #{idx + 1}
                              </span>
                              <div>
                                <p className="text-xs font-black text-white">
                                  {data.name} {uid === user?.id && '(Aap)'}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {data.correctCount || 0} Sahi (+5 XP) • {data.wrongCount || 0} Galat (-2 XP) • Max Streak: 🔥{data.maxStreak || 0}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-amber-400 block">{data.score || 0} pts</span>
                              <span className="text-[10px] font-bold text-emerald-400">+{data.userXp || 0} XP</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-6 text-center">
                      Abhi koi MCQ Battle nahi hui hai. MCQ tab par jakar live battle shuru karein!
                    </p>
                  )}
                </div>
              )}

              {/* ── TAB 3: MEMBERS LIST ── */}
              {activeTab === 'MEMBERS' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Users size={16} /> Online Room Members ({Object.keys(currentRoom.members || {}).length})
                  </h4>

                  <div className="space-y-2">
                    {Object.entries(currentRoom.members || {}).map(([memKey, m], mIdx) => (
                      <div
                        key={m?.id ? `mem_${m.id}_${mIdx}` : `mem_${memKey}_${mIdx}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white">
                            {m.name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-white">{m.name}</span>
                              {m.isHost && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                  Host
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">Level {m.level || 1}</span>
                          </div>
                        </div>

                        {m.handRaised && (
                          <span className="text-xs font-bold text-amber-400 animate-bounce">✋ Hand Raised</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Host Danger Zone / Room Destruction */}
                  {isHost && (
                    <div className="mt-6 p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-2.5">
                      <div className="flex items-center gap-2 text-rose-400">
                        <Trash2 size={16} />
                        <h5 className="text-xs font-black text-white">Host Controls: Room Destroy Karein</h5>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Aap is room ke <b>Host</b> hain. Agar aapka study session poora ho gaya hai ya aap room ko band karna chahte hain, toh yahan se room ko poori tarah destroy/delete kar sakte hain. Sabhi participants auto-disconnect ho jayenge.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDestroyRoom()}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-2 active:scale-95 transition shadow-lg cursor-pointer"
                      >
                        <Trash2 size={14} /> Room Destroy Karein
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── SIDE PANEL: ROOM CHAT & DOUBTS ── */}
            <div className={`w-full md:w-80 flex flex-col bg-slate-950/60 shrink-0 ${
              isMcqRunning && !showMobileChat ? 'h-auto md:h-auto' : 'h-64 md:h-auto'
            }`}>
              <div
                onClick={() => {
                  if (isMcqRunning) setShowMobileChat(!showMobileChat);
                }}
                className={`flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900/50 ${
                  isMcqRunning ? 'cursor-pointer select-none' : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-indigo-400" />
                  <span className="text-xs font-black text-white">Live Discussion</span>
                  {isMcqRunning && (
                    <span className="md:hidden text-[10px] text-indigo-400 font-bold ml-1">
                      {showMobileChat ? '▴ Hide' : '▾ Tap to Chat'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setChatFilter('ALL');
                    }}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      chatFilter === 'ALL' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setChatFilter('DOUBTS');
                    }}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      chatFilter === 'DOUBTS'
                        ? 'bg-amber-600/30 text-amber-300 font-bold border border-amber-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    💡 Doubts
                  </button>
                </div>
              </div>

              {/* Message Feed & Input (Collapsible on mobile during running MCQ) */}
              <div className={`${isMcqRunning && !showMobileChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-hidden`}>
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-48 md:max-h-none">
                  {currentRoom.chat &&
                    Object.entries(currentRoom.chat)
                      .filter(([_, msg]) => (chatFilter === 'DOUBTS' ? msg.type === 'DOUBT' : true))
                      .map(([msgKey, msg], msgIdx) => {
                        const isMe = msg.userId === user?.id;
                        const isDoubt = msg.type === 'DOUBT';
                        const isSystem = msg.type === 'SYSTEM';

                        if (isSystem) {
                          return (
                            <p
                              key={msg?.id ? `msg_${msg.id}_${msgIdx}` : `msg_${msgKey}_${msgIdx}`}
                              className="text-[10px] text-center text-slate-400 py-1 font-medium bg-slate-900/40 rounded-lg"
                            >
                              {msg.text}
                            </p>
                          );
                        }

                        return (
                          <div key={msg?.id ? `msg_${msg.id}_${msgIdx}` : `msg_${msgKey}_${msgIdx}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <span className="text-[9px] text-slate-400 mb-0.5 px-1">{isMe ? 'You' : msg.userName}</span>
                            <div
                              className={`p-2.5 rounded-2xl max-w-[85%] text-xs leading-snug break-words ${
                                isDoubt
                                  ? 'bg-amber-950/50 border border-amber-500/40 text-amber-200'
                                  : isMe
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-800 text-slate-200'
                              }`}
                            >
                              {isDoubt && (
                                <span className="block text-[9px] font-black text-amber-400 uppercase tracking-wide mb-0.5">
                                  💡 Doubt
                                </span>
                              )}
                              {msg.text}
                            </div>
                          </div>
                        );
                      })}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat Input */}
                <form
                  onSubmit={(e) => handleSendChat(e, false)}
                  className="p-2 border-t border-slate-800 bg-slate-900/80 flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    placeholder="Type message or doubt..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={(e) => handleSendChat(e as any, true)}
                    className="px-2 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-black cursor-pointer"
                    title="Ask Doubt"
                  >
                    💡
                  </button>
                  <button
                    type="submit"
                    disabled={!chatMessage.trim()}
                    className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center disabled:opacity-40 transition shrink-0 cursor-pointer"
                  >
                    <Send size={13} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MOBILE DEDICATED LIVE DISCUSSION DRAWER (During active MCQ battle) ── */}
      {showMobileChat && isMcqRunning && currentRoom && (
        <div className="fixed inset-0 z-[10002] md:hidden flex flex-col bg-slate-950/95 backdrop-blur-md animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-indigo-400" />
              <span className="font-black text-sm text-white">Live Discussion & Doubts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setChatFilter('ALL')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    chatFilter === 'ALL' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setChatFilter('DOUBTS')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    chatFilter === 'DOUBTS'
                      ? 'bg-amber-600/30 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  💡 Doubts
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileChat(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer ml-1"
                title="Close Chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {currentRoom.chat &&
              Object.entries(currentRoom.chat)
                .filter(([_, msg]) => (chatFilter === 'DOUBTS' ? msg.type === 'DOUBT' : true))
                .map(([msgKey, msg], msgIdx) => {
                  const isMe = msg.userId === user?.id;
                  const isDoubt = msg.type === 'DOUBT';
                  const isSystem = msg.type === 'SYSTEM';

                  if (isSystem) {
                    return (
                      <p key={msg?.id ? `msg_${msg.id}_${msgIdx}` : `msg_${msgKey}_${msgIdx}`} className="text-[10px] text-center text-slate-400 py-1 font-medium bg-slate-900/40 rounded-lg">
                        {msg.text}
                      </p>
                    );
                  }

                  return (
                    <div key={msg?.id ? `msg_${msg.id}_${msgIdx}` : `msg_${msgKey}_${msgIdx}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-[9px] text-slate-400 mb-0.5 px-1">{isMe ? 'You' : msg.userName}</span>
                      <div
                        className={`p-2.5 rounded-2xl max-w-[85%] text-xs leading-snug break-words ${
                          isDoubt
                            ? 'bg-amber-950/50 border border-amber-500/40 text-amber-200'
                            : isMe
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        {isDoubt && (
                          <span className="block text-[9px] font-black text-amber-400 uppercase tracking-wide mb-0.5">
                            💡 Doubt
                          </span>
                        )}
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
            <div ref={chatBottomRef} />
          </div>

          {/* Input bar */}
          <form
            onSubmit={(e) => handleSendChat(e, false)}
            className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Type message or doubt..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
            />
            <button
              type="button"
              onClick={(e) => handleSendChat(e as any, true)}
              className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black cursor-pointer"
              title="Ask Doubt"
            >
              💡
            </button>
            <button
              type="submit"
              disabled={!chatMessage.trim()}
              className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center disabled:opacity-40 transition shrink-0 cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* ── CREATE ROOM MODAL (Mandatory Password & MCQ Mode Selection) ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-3.5 text-slate-100 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Trophy size={18} className="text-indigo-400" /> Naya MCQ Study Room Banayein
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3.5 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Room Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mission Bihar SSC & Lucent MCQ Battle"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              {/* Mandatory Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>
                    Room Password <span className="text-rose-400">* (Compulsory / Zaroori)</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold">🔒 Entry ke liye zaroori</span>
                </label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    required
                    placeholder="Enter Secret Room Password (e.g. 1234)"
                    value={newRoomPassword}
                    onChange={(e) => setNewRoomPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400 pr-10 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showCreatePassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Bina is password ke koi bhi user room me enter nahi kar sakega.
                </p>
              </div>

              {/* Informational Card: MCQ Mode & Chapter Selection happens inside the Room Lobby */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 text-xs text-slate-200 flex items-start gap-2.5">
                <span className="text-base shrink-0">💡</span>
                <div className="space-y-1">
                  <p className="font-bold text-white text-xs">
                    MCQ Mode & Chapter Selection:
                  </p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Room banne ke baad aap Room Lobby me <b>🎯 MCQ Mode</b> ya <b>⚡ MCQ + Mode</b> chunn sakte hain aur kisi bhi book ya chapter ka Live Test start kar sakte hain.
                  </p>
                </div>
              </div>

              {/* Room Duration Selection based on Plan */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Room Duration (Time Limit):</span>
                  <span className="text-[10px] text-amber-300 font-bold">
                    {isAdmin
                      ? '👑 Unlimited / Up to 4 Hours (Admin)'
                      : userTier === 'FREE'
                      ? '30 Min Max (Free Plan)'
                      : userTier === 'BASIC'
                      ? '1 Hour Max (Basic Plan)'
                      : '2 Hours Max (Ultra Plan)'}
                  </span>
                </label>
                <select
                  value={newRoomDurationMinutes}
                  onChange={(e) => setNewRoomDurationMinutes(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  {durationOptions.map((m) => (
                    <option key={`dur_opt_${m}`} value={m}>
                      {m} Minutes {m === 60 ? '(1 Hour)' : m === 120 ? '(2 Hours)' : m === 180 ? '(3 Hours)' : m === 240 ? '(4 Hours)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px]">
                <span className="text-slate-400">Daily Room Limit:</span>
                <span className="font-bold">
                  {isAdmin ? (
                    <span className="text-emerald-400 font-black flex items-center gap-1">
                      <Crown size={12} className="text-yellow-400" /> Unlimited Rooms (Admin Access)
                    </span>
                  ) : (
                    <span className="text-indigo-300 font-bold">
                      {todayCreatedRoomsCount}/{maxRoomsPerDay} Used Today ({userTier} Plan)
                    </span>
                  )}
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl font-black text-xs text-white shadow-xl active:scale-95 transition cursor-pointer shrink-0"
                style={{ background: brandColor }}
              >
                {isLoading ? 'Creating Room...' : '🚀 Room Banayein (Lobby Kholein)'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── JOIN ROOM WITH PASSWORD MODAL ── */}
      {passwordModalRoom && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Lock size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Enter Room Password</h3>
                  <p className="text-[10px] text-slate-400">{passwordModalRoom.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalRoom(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Yeh room password protected hai. Is room me entry karne ke liye Host dwara set kiya gaya password enter karein.
            </p>

            <form onSubmit={handleVerifyPasswordAndJoin} className="space-y-3">
              <div className="relative">
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder="Room Password yahan likhein..."
                  value={enteredPassword}
                  onChange={(e) => {
                    setEnteredPassword(e.target.value);
                    setPasswordError('');
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPasswordText ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {passwordError && (
                <p className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  <AlertCircle size={12} /> {passwordError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={!enteredPassword.trim()}
                  className="flex-1 py-2.5 rounded-xl font-black text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  Unlock & Join Room
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordModalRoom(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 active:scale-95 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DAILY ROOM LIMIT UPGRADE MODAL ── */}
      {upgradePromptReason && (
        <div className="fixed inset-0 z-[10003] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
                  ⭐
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Daily Room Creation Limit Reached</h3>
                  <p className="text-[11px] text-slate-400">Upgrade for more rooms & longer duration</p>
                </div>
              </div>
              <button
                onClick={() => setUpgradePromptReason(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 text-xs text-slate-200 leading-relaxed">
              <p>
                Aapke aaj ke <strong>{maxRoomsPerDay} Study Rooms</strong> create karne ki limit poori ho chuki hai.
              </p>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2 text-slate-300">
                  <span>🆓</span> <b>Free User:</b> 2 Rooms per day (Max 30 min duration)
                </div>
                <div className="flex items-center gap-2 text-cyan-300">
                  <span>⭐</span> <b>Basic User:</b> 3 Rooms per day (Max 1 Hour duration)
                </div>
                <div className="flex items-center gap-2 text-purple-300">
                  <span>👑</span> <b>Ultra User:</b> 5 Rooms per day (Max 2 Hours duration)
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setUpgradePromptReason(null);
                  onClose();
                  onOpenStore?.();
                }}
                className="flex-1 py-2.5 rounded-xl font-black text-xs text-slate-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-md active:scale-95 transition cursor-pointer"
              >
                ⚡ Store Me Upgrade Karein
              </button>
              <button
                onClick={() => setUpgradePromptReason(null)}
                className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 active:scale-95 transition cursor-pointer"
              >
                Band Karein
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

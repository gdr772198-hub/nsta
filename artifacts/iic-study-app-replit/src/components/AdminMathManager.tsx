import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  CheckCircle2,
  Sparkles,
  Upload,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Loader2,
  ExternalLink,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { uploadImageToImgBB } from '../services/imgbbService';
import { saveChapterData, getChapterData, saveMcqLesson } from '../firebase';
import { MathImagePage, MCQItem } from '../types';

interface Props {
  onBack: () => void;
  currentUser?: any;
}

const CLASSES = ['6', '7', '8', '9', '10', '11', '12', 'COMPETITION'];
const BOARDS = [
  { id: 'ALL', label: 'All Boards (Universal)' },
  { id: 'BSEB', label: 'Bihar Board (BSEB)' },
  { id: 'CBSE', label: 'CBSE Board' },
  { id: 'UP', label: 'UP Board' },
  { id: 'NCERT_EN', label: 'NCERT (English)' },
  { id: 'NCERT_HI', label: 'NCERT (Hindi)' },
];

export const AdminMathManager: React.FC<Props> = ({ onBack, currentUser }) => {
  const [selectedClass, setSelectedClass] = useState<string>('10');
  const [selectedBoard, setSelectedBoard] = useState<string>('BSEB');
  const [chapterId, setChapterId] = useState<string>('ch_1');
  const [chapterTitle, setChapterTitle] = useState<string>('वास्तविक संख्याएँ (Real Numbers)');

  // 4 Modes
  const [activeTab, setActiveTab] = useState<'BOOK' | 'PREMIUM_NOTES' | 'SOLUTION' | 'MCQ'>('BOOK');

  // Pages state
  const [bookPages, setBookPages] = useState<MathImagePage[]>([]);
  const [premiumNotesPages, setPremiumNotesPages] = useState<MathImagePage[]>([]);
  const [solutionPages, setSolutionPages] = useState<MathImagePage[]>([]);
  const [mcqs, setMcqs] = useState<MCQItem[]>([]);

  // Loading & Saving states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'SUCCESS' | 'ERROR' } | null>(null);

  // Single URL inputs
  const [singleUrl, setSingleUrl] = useState<string>('');
  const [singleTitle, setSingleTitle] = useState<string>('');

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // File input refs for multi-upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Construct standard storage key
  const getContentKey = (board: string, cls: string, chId: string) => {
    return `nst_content_${board}_${cls}_Mathematics_${chId}`;
  };

  // Load content whenever class, board, or chapter changes
  const loadChapterContent = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const key = getContentKey(selectedBoard, selectedClass, chapterId);
      const data = await getChapterData(key);
      if (data) {
        setChapterTitle(data.chapterTitle || data.title || chapterTitle);
        setBookPages(data.mathBookPages || []);
        setPremiumNotesPages(data.mathPremiumNotesPages || []);
        setSolutionPages(data.mathSolutionPages || []);
        setMcqs(data.mcqs || data.manualMcqData || data.mcqData || []);
      } else {
        // Reset pages if empty
        setBookPages([]);
        setPremiumNotesPages([]);
        setSolutionPages([]);
        setMcqs([]);
      }
    } catch (err) {
      console.error('Error loading Math chapter content:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChapterContent();
  }, [selectedClass, selectedBoard, chapterId]);

  // Handle Multi-file upload via ImgBB
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadProgress(`0 / ${files.length} images uploading...`);
    const newPages: MathImagePage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setUploadProgress(`${i + 1} / ${files.length}: Uploading ${file.name}...`);
        const url = await uploadImageToImgBB(file, file.name, { isHd: true });
        if (url) {
          newPages.push({
            id: `page_${Date.now()}_${i}`,
            pageNo: i + 1,
            imageUrl: url,
            title: `Page ${file.name.replace(/\.[^/.]+$/, '')}`,
          });
        }
      } catch (uploadErr) {
        console.warn(`Failed to upload ${file.name}:`, uploadErr);
      }
    }

    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (newPages.length > 0) {
      if (activeTab === 'BOOK') {
        setBookPages(prev => [...prev, ...newPages.map((p, idx) => ({ ...p, pageNo: prev.length + idx + 1 }))]);
      } else if (activeTab === 'PREMIUM_NOTES') {
        setPremiumNotesPages(prev => [...prev, ...newPages.map((p, idx) => ({ ...p, pageNo: prev.length + idx + 1 }))]);
      } else if (activeTab === 'SOLUTION') {
        setSolutionPages(prev => [...prev, ...newPages.map((p, idx) => ({ ...p, pageNo: prev.length + idx + 1 }))]);
      }
      setStatusMessage({ text: `${newPages.length} images kamyabi se upload ho gayi!`, type: 'SUCCESS' });
    }
  };

  // Add single image URL manually
  const handleAddSingleUrl = () => {
    if (!singleUrl.trim()) return;
    const newPage: MathImagePage = {
      id: `page_${Date.now()}`,
      pageNo: 1,
      imageUrl: singleUrl.trim(),
      title: singleTitle.trim() || undefined,
    };

    if (activeTab === 'BOOK') {
      setBookPages(prev => [...prev, { ...newPage, pageNo: prev.length + 1 }]);
    } else if (activeTab === 'PREMIUM_NOTES') {
      setPremiumNotesPages(prev => [...prev, { ...newPage, pageNo: prev.length + 1 }]);
    } else if (activeTab === 'SOLUTION') {
      setSolutionPages(prev => [...prev, { ...newPage, pageNo: prev.length + 1 }]);
    }

    setSingleUrl('');
    setSingleTitle('');
  };

  // Delete page
  const handleDeletePage = (mode: 'BOOK' | 'PREMIUM_NOTES' | 'SOLUTION', index: number) => {
    if (mode === 'BOOK') {
      setBookPages(prev => prev.filter((_, i) => i !== index).map((p, idx) => ({ ...p, pageNo: idx + 1 })));
    } else if (mode === 'PREMIUM_NOTES') {
      setPremiumNotesPages(prev => prev.filter((_, i) => i !== index).map((p, idx) => ({ ...p, pageNo: idx + 1 })));
    } else if (mode === 'SOLUTION') {
      setSolutionPages(prev => prev.filter((_, i) => i !== index).map((p, idx) => ({ ...p, pageNo: idx + 1 })));
    }
  };

  // Reorder page
  const handleMovePage = (mode: 'BOOK' | 'PREMIUM_NOTES' | 'SOLUTION', index: number, direction: 'UP' | 'DOWN') => {
    const listSetter =
      mode === 'BOOK' ? setBookPages : mode === 'PREMIUM_NOTES' ? setPremiumNotesPages : setSolutionPages;

    listSetter(prev => {
      const copy = [...prev];
      const targetIdx = direction === 'UP' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((p, idx) => ({ ...p, pageNo: idx + 1 }));
    });
  };

  // ===================== MCQ ADD FORM =====================
  const [newQuestion, setNewQuestion] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctOption, setCorrectOption] = useState<number>(0);
  const [explanation, setExplanation] = useState('');

  const handleAddMcq = () => {
    if (!newQuestion.trim() || !optionA.trim() || !optionB.trim()) {
      setStatusMessage({ text: 'Question aur kam se kam 2 options zaroori hain!', type: 'ERROR' });
      return;
    }

    const newItem: MCQItem = {
      question: newQuestion.trim(),
      options: [optionA.trim(), optionB.trim(), optionC.trim() || 'C', optionD.trim() || 'D'],
      correctAnswer: correctOption,
      explanation: explanation.trim(),
    };

    setMcqs(prev => [...prev, newItem]);
    setNewQuestion('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setExplanation('');
    setStatusMessage({ text: 'MCQ question add ho gaya!', type: 'SUCCESS' });
  };

  const handleDeleteMcq = (idx: number) => {
    setMcqs(prev => prev.filter((_, i) => i !== idx));
  };

  // Save All Math Content
  const handleSaveAll = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const key = getContentKey(selectedBoard, selectedClass, chapterId);
      const payload: any = {
        id: chapterId,
        chapterTitle: chapterTitle.trim() || 'Math Chapter',
        title: chapterTitle.trim() || 'Math Chapter',
        subjectName: 'Mathematics',
        classLevel: selectedClass,
        board: selectedBoard,
        mathBookPages: bookPages,
        mathPremiumNotesPages: premiumNotesPages,
        mathSolutionPages: solutionPages,
        manualMcqData: mcqs,
        mcqData: mcqs,
        mcqs,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || 'Admin',
      };

      // 1. Save chapter data in Firestore / local storage
      await saveChapterData(key, payload);

      // 2. Also register MCQ lesson for Study Room / Arena
      if (mcqs.length > 0) {
        try {
          await saveMcqLesson({
            id: `math_${selectedClass}_${chapterId}`,
            title: `${chapterTitle} (Math Cl-${selectedClass})`,
            subject: 'Mathematics',
            classLevel: selectedClass,
            questions: mcqs,
            authorName: currentUser?.name || 'Admin',
            createdAt: new Date().toISOString(),
          } as any);
        } catch (arenaErr) {
          console.warn('Study Room MCQ registration warning:', arenaErr);
        }
      }

      setStatusMessage({ text: '✅ Math Chapter data kamyabi se save ho gaya!', type: 'SUCCESS' });
    } catch (err: any) {
      console.error('Error saving Math Chapter:', err);
      setStatusMessage({ text: `❌ Save nahi ho paya: ${err?.message || 'Error'}`, type: 'ERROR' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* ── TOP HEADER ── */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 transition cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">📐</span>
              <h1 className="text-base sm:text-lg font-black text-white truncate">
                Math Master Content Manager
              </h1>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Class 6-12 &amp; Competition
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Math ke Book, Premium Notes, Solution images aur MCQs ek hi jagah se add karein
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadChapterContent}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 transition"
            title="Reload content"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/30 active:scale-95 transition cursor-pointer ${
              isSaving ? 'opacity-70 cursor-wait' : ''
            }`}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{isSaving ? 'Saving...' : 'Save Math Chapter'}</span>
          </button>
        </div>
      </div>

      {/* ── STATUS ALERT NOTIFICATION ── */}
      {statusMessage && (
        <div
          className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between transition-all ${
            statusMessage.type === 'SUCCESS' ? 'bg-emerald-900/80 text-emerald-200' : 'bg-red-900/80 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'SUCCESS' ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-white/60 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* ── MAIN BODY ── */}
      <div className="max-w-6xl w-full mx-auto p-4 space-y-5 flex-1">
        {/* CHAPTER & TARGET SELECTOR CARD */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span>🎯 Target Settings</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Class */}
            <div>
              <label className="text-[10.5px] font-bold text-slate-400 mb-1 block">Class Level:</label>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
              >
                {CLASSES.map(cls => (
                  <option key={cls} value={cls}>
                    {cls === 'COMPETITION' ? '🏆 Competition (General Math)' : `Class ${cls}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Board */}
            <div>
              <label className="text-[10.5px] font-bold text-slate-400 mb-1 block">Board:</label>
              <select
                value={selectedBoard}
                onChange={e => setSelectedBoard(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
              >
                {BOARDS.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Chapter ID */}
            <div>
              <label className="text-[10.5px] font-bold text-slate-400 mb-1 block">Chapter ID / Key:</label>
              <input
                type="text"
                value={chapterId}
                onChange={e => setChapterId(e.target.value)}
                placeholder="e.g. ch_1, ch_2"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
              />
            </div>

            {/* Chapter Title */}
            <div>
              <label className="text-[10.5px] font-bold text-slate-400 mb-1 block">Chapter Title / Naam:</label>
              <input
                type="text"
                value={chapterTitle}
                onChange={e => setChapterTitle(e.target.value)}
                placeholder="e.g. द्विघात समीकरण (Quadratic Equations)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ── 4 CONTENT MODE TABS ── */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
          {/* Tab 1: Book */}
          <button
            onClick={() => setActiveTab('BOOK')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
              activeTab === 'BOOK'
                ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/25'
                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            <BookOpen size={15} />
            <span>1. 📖 Book Pages</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
              {bookPages.length}
            </span>
          </button>

          {/* Tab 2: Premium Notes */}
          <button
            onClick={() => setActiveTab('PREMIUM_NOTES')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
              activeTab === 'PREMIUM_NOTES'
                ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/25'
                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            <FileText size={15} />
            <span>2. 📑 Premium Notes</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
              {premiumNotesPages.length}
            </span>
          </button>

          {/* Tab 3: Solution */}
          <button
            onClick={() => setActiveTab('SOLUTION')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
              activeTab === 'SOLUTION'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/25'
                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            <CheckCircle2 size={15} />
            <span>3. 💡 Book Solution</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
              {solutionPages.length}
            </span>
          </button>

          {/* Tab 4: MCQ */}
          <button
            onClick={() => setActiveTab('MCQ')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
              activeTab === 'MCQ'
                ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/25'
                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            <Sparkles size={15} />
            <span>4. 🎯 MCQ Practice</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
              {mcqs.length}
            </span>
          </button>
        </div>

        {/* ── IMAGE MODES CONTENT AREA (BOOK / PREMIUM NOTES / SOLUTION) ── */}
        {activeTab !== 'MCQ' && (
          <div className="space-y-4">
            {/* Upload Toolbar Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <ImageIcon size={16} className="text-blue-400" />
                    <span>
                      {activeTab === 'BOOK'
                        ? 'Book Pages (किताब के पेज)'
                        : activeTab === 'PREMIUM_NOTES'
                        ? 'Premium Notes Pages (हैंडरिटन / फॉर्मूला नोट्स)'
                        : 'Book Solution Pages (एक्सरसाइज का हल)'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ImgBB se ek saath multiple photos upload karein ya direct photo URL daalein.
                  </p>
                </div>

                {/* Direct ImgBB File Upload Button */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!!uploadProgress}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    <Upload size={15} />
                    <span>Multi-Photo Upload (ImgBB)</span>
                  </button>
                </div>
              </div>

              {/* Uploading progress notification */}
              {uploadProgress && (
                <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-800 flex items-center gap-2 text-xs font-bold text-blue-300">
                  <Loader2 size={16} className="animate-spin text-blue-400" />
                  <span>{uploadProgress}</span>
                </div>
              )}

              {/* Single URL Input Row */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <input
                  type="text"
                  value={singleUrl}
                  onChange={e => setSingleUrl(e.target.value)}
                  placeholder="Ya direct Image URL paste karein (https://i.ibb.co/...)"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={singleTitle}
                  onChange={e => setSingleTitle(e.target.value)}
                  placeholder="Optional Page Title (e.g. Formula Sheet)"
                  className="w-48 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddSingleUrl}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 active:scale-95 transition cursor-pointer shrink-0"
                >
                  <Plus size={14} />
                  <span>Add URL</span>
                </button>
              </div>
            </div>

            {/* List of current pages */}
            {(() => {
              const pages =
                activeTab === 'BOOK'
                  ? bookPages
                  : activeTab === 'PREMIUM_NOTES'
                  ? premiumNotesPages
                  : solutionPages;

              if (pages.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl text-slate-500">
                    <p className="text-sm font-bold">Koi page nahi joda gaya hai abhi tak.</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Upar "Multi-Photo Upload" button se photos select karke jodein.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
                    <span>Kul Pages: {pages.length}</span>
                    <span className="text-[10px] text-slate-500">
                      User ko yeh Continuous Scroll aur Flip dono modes me dikhenge.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pages.map((page, idx) => (
                      <div
                        key={page.id || idx}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center gap-3 shadow-md hover:border-slate-700 transition"
                      >
                        {/* Page Number badge */}
                        <span className="w-7 h-7 rounded-xl bg-slate-800 text-blue-400 border border-slate-700 text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        {/* Thumbnail */}
                        <div
                          onClick={() => setPreviewImage(page.imageUrl)}
                          className="w-14 h-14 rounded-xl bg-black border border-slate-800 overflow-hidden shrink-0 cursor-pointer relative group"
                        >
                          <img
                            src={page.imageUrl}
                            alt={`Page ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Eye size={14} className="text-white" />
                          </div>
                        </div>

                        {/* Page info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {page.title || `Page ${idx + 1}`}
                          </p>
                          <a
                            href={page.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-400 hover:underline truncate block mt-0.5"
                          >
                            {page.imageUrl}
                          </a>
                        </div>

                        {/* Reorder and Delete Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMovePage(activeTab, idx, 'UP')}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 active:scale-90 transition"
                            title="Move Up"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMovePage(activeTab, idx, 'DOWN')}
                            disabled={idx === pages.length - 1}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 active:scale-90 transition"
                            title="Move Down"
                          >
                            <ChevronDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePage(activeTab, idx)}
                            className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-900 text-red-400 hover:text-red-200 active:scale-90 transition"
                            title="Delete Page"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── MCQ MODE CONTENT AREA ── */}
        {activeTab === 'MCQ' && (
          <div className="space-y-4">
            {/* MCQ Add Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <span>Naya Math MCQ Question Jodein</span>
              </h3>

              {/* Question Text */}
              <div>
                <label className="text-[10.5px] font-bold text-slate-400 mb-1 block">
                  Question (Formula / Equation ke liye normal ya LaTeX text likhein):
                </label>
                <textarea
                  value={newQuestion}
                  onChange={e => setNewQuestion(e.target.value)}
                  rows={2}
                  placeholder="e.g. yadi ax² + bx + c = 0 ke mool saman hain toh b² - 4ac ka maan kya hoga?"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-medium text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Options A, B, C, D */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10.5px] font-bold text-slate-400 mb-1 block">Option A:</label>
                  <input
                    type="text"
                    value={optionA}
                    onChange={e => setOptionA(e.target.value)}
                    placeholder="Option A ka uttar"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-bold text-slate-400 mb-1 block">Option B:</label>
                  <input
                    type="text"
                    value={optionB}
                    onChange={e => setOptionB(e.target.value)}
                    placeholder="Option B ka uttar"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-bold text-slate-400 mb-1 block">Option C:</label>
                  <input
                    type="text"
                    value={optionC}
                    onChange={e => setOptionC(e.target.value)}
                    placeholder="Option C ka uttar"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-bold text-slate-400 mb-1 block">Option D:</label>
                  <input
                    type="text"
                    value={optionD}
                    onChange={e => setOptionD(e.target.value)}
                    placeholder="Option D ka uttar"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Correct Option & Explanation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10.5px] font-bold text-slate-400 mb-1 block">Sahi Answer (Correct):</label>
                  <select
                    value={correctOption}
                    onChange={e => setCorrectOption(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 outline-none focus:border-emerald-500"
                  >
                    <option value={0}>Option A</option>
                    <option value={1}>Option B</option>
                    <option value={2}>Option C</option>
                    <option value={3}>Option D</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10.5px] font-bold text-slate-400 mb-1 block">
                    Math Explanation / Solution (व्याख्या):
                  </label>
                  <input
                    type="text"
                    value={explanation}
                    onChange={e => setExplanation(e.target.value)}
                    placeholder="Step-by-step solution ya short formula"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddMcq}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-500 active:scale-95 transition cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <Plus size={15} />
                  <span>MCQ Question Add Karein</span>
                </button>
              </div>
            </div>

            {/* List of current MCQs */}
            {mcqs.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl text-slate-500">
                <p className="text-sm font-bold">Koi MCQ nahi joda gaya hai.</p>
                <p className="text-xs text-slate-600 mt-1">Upar form se questions jodein.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
                  <span>Kul MCQs: {mcqs.length}</span>
                  <span className="text-[10px] text-slate-500">
                    Yeh Study Room (Live Arena) aur MCQ test mode dono me dikhenge.
                  </span>
                </div>

                {mcqs.map((q, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-md space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-white">{q.question}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMcq(idx)}
                        className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-900 text-red-400 hover:text-red-200 active:scale-90 transition"
                        title="Delete Question"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Options list */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={`p-2 rounded-xl border flex items-center gap-2 ${
                            optIdx === q.correctAnswer
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-bold'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-md bg-slate-800 text-[10px] font-black flex items-center justify-center shrink-0">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="truncate">{opt}</span>
                          {optIdx === q.correctAnswer && <Check size={14} className="text-emerald-400 ml-auto" />}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div className="text-[11px] text-slate-400 bg-slate-900/80 rounded-xl p-2 border border-slate-800">
                        <span className="font-bold text-amber-400">हल: </span>
                        <span>{q.explanation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── IMAGE PREVIEW MODAL ── */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden p-2 shadow-2xl relative">
            <img src={previewImage} alt="Preview" className="w-full h-auto max-h-[85vh] object-contain rounded-xl" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMathManager;

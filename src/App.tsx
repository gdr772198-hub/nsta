import React, { useState, useEffect } from 'react';
import { WhatsAppChatModal } from './components/WhatsAppChatModal';
import { User } from './types';
import { MessageSquare, Sparkles, User as UserIcon, Shield, Send } from 'lucide-react';

const LOCAL_STORAGE_USER_KEY = 'nsta_messenger_user';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim() || 'Nsta User';
    const cleanPhone = phoneInput.trim() || `user_${Date.now().toString().slice(-6)}`;
    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      phone: cleanPhone,
      role: 'STUDENT',
      level: 1,
      score: 100,
      credits: 50,
      isPremium: true,
      subscriptionLevel: 'ULTRA',
      profilePhoto: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newUser));
    setCurrentUser(newUser);
    setIsChatOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-2xl border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Logo & Header */}
          <div className="text-center mb-6 relative">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/25 mb-3">
              <MessageSquare size={36} className="text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              Nsta Messenger
              <Sparkles size={20} className="text-amber-400" />
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Private Realtime Chat • Unlimited Cloud Vault • Voice Notes
            </p>
          </div>

          {/* Login / Profile Form */}
          <form onSubmit={handleStartChat} className="space-y-4 relative">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Aapka Naam (Your Name)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <UserIcon size={18} className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mobile Number / Username (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 9876543210 ya rahul12"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 hover:from-indigo-500 to-purple-600 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer mt-2"
            >
              <span>Chat Shuru Karein</span>
              <Send size={16} />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <Shield size={12} className="text-emerald-400" />
              <span>End-to-End Private • 0 Firestore Quota Usage</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Fallback bar if user minimizes modal */}
      {!isChatOpen && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="p-4 bg-indigo-600/20 border border-indigo-500/40 rounded-3xl mb-4">
            <MessageSquare size={48} className="text-indigo-400 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Nsta Messenger Minimized</h2>
          <p className="text-sm text-slate-400 mb-6">
            Log in as: <strong className="text-indigo-300">{currentUser.name}</strong> ({currentUser.phone})
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsChatOpen(true)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              Chat Kholein
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Main Fullscreen Nsta Messenger Modal */}
      <WhatsAppChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        user={currentUser}
      />
    </div>
  );
}

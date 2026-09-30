# 💬 Nsta Messenger App (Standalone Project)

WhatsApp jaisa ultra-fast, private realtime chat app with voice notes, photo sharing, chat lock, and unlimited cloud vault powered by Telegram!

---

## 🌟 Features:
- **1-to-1 Private Realtime Chat**: Instant 0.1s message delivery with double-ticks.
- **Voice Notes (Audio Messages)**: Record and play voice messages directly in chat.
- **Photos & Media Sharing**: Free and unlimited image upload via Telegram Bot Storage Vault.
- **Chat Lock & Privacy PIN**: 4-digit secret PIN protection for sensitive chats.
- **Group Chats**: Create and join study & discussion groups.
- **Status & Online Presence**: Live online/offline status with typing indicator.
- **0 Quota Cost**: Firebase Realtime Database + Telegram Cloud = 100% Free Lifetime.

---

## 🚀 How to Run (Kaise Chalayein):

### Option 1: Local Computer / VS Code
1. Zip file ko extract (unzip) karein.
2. Terminal me folder khol kar dependencies install karein:
   ```bash
   npm install
   ```
3. Development server run karein:
   ```bash
   npm run dev
   ```
4. Browser me `http://localhost:3000` khol kar use karein!

---

### Option 2: Replit
1. Replit par "Import / Upload from ZIP" karein.
2. Run button click karein ya console me `npm install && npm run dev` karein.

---

### Option 3: Vercel / Netlify Deploy
1. GitHub par push karein.
2. Vercel par "New Project" select karein aur Deploy par click karein.
3. Environment variables me `.env` ka data paste kar dein.

---

## 🔑 Environment Variables (`.env`):
```env
TELEGRAM_STORAGE_BOT_TOKEN=8938213127:AAEjjjXmxjOuqpo5PP2TgorWOa17uYeD-Dw
TELEGRAM_STORAGE_CHAT_ID=7849468653
TELEGRAM_BOT_TOKEN=8938213127:AAEjjjXmxjOuqpo5PP2TgorWOa17uYeD-Dw
```

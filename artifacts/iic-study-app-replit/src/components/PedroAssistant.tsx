import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Volume2, VolumeX, X, Sparkles, ChevronRight, RotateCcw, ArrowLeft, Move, HelpCircle, Compass } from 'lucide-react';
import type { PedroItemDetail, PedroCategory, PedroPageConfig } from '../types';

export type { PedroItemDetail, PedroCategory, PedroPageConfig };

// ══════════════════ COMPREHENSIVE KNOWLEDGE HIERARCHY ══════════════════
export const PEDRO_PAGE_KNOWLEDGE: Record<string, PedroPageConfig> = {
  HOME: {
    pageId: 'HOME',
    pageTitle: 'Home Screen',
    pageIcon: '🏠',
    introSpeech: 'Hello! Main hoon Pedro, aapka smart robot guide! Home screen par aap kiske baare mein dekhna chahte hain? Option chuniye!',
    categories: [
      {
        id: 'TOP_BAR',
        title: 'Top Bar',
        icon: '🔝',
        description: 'Class switcher, guide, streak aur 3-dot tools.',
        targetSelector: '#top-banner-container',
        speechText: 'Yeh hai aapka Top Bar! Isme class switch karne, app guide, mailbox alerts aur 3-dot settings ke sare top tools milte hain. Kaunsa tool dekhna hai?',
        items: [
          {
            id: 'APP_NAME_ASSEMBLE',
            title: 'App Name & Assemble Animation',
            icon: '✨',
            summary: 'App ke naam aur logo par tap karke home page assemble animation replay karein.',
            speechText: 'Top bar me yeh hamare App ka Naam aur Logo hai! Is par tap karne se home page ka majestic assemble animation play hota hai aur page smoothly upar scroll ho jata hai.',
            bullets: ['App logo aur verified badge.', 'Tap karne par assemble animation trigger hota hai.'],
            targetSelector: '#nsta-header-brand-btn',
            actionKey: 'SIMULATE_APP_LOGO',
          },
          {
            id: 'APP_GUIDE',
            title: 'App User Guide',
            icon: '📖',
            summary: 'Poori app ki visual user manual aur feature explanations.',
            speechText: 'App Guide button par tap karne se poori app ka step-by-step visual handbook khul jata hai, jisme har feature ka screen demo diya gaya hai.',
            bullets: ['Step-by-step visual illustrations.', 'Naye students ke liye best guide.'],
            targetSelector: '#topbar-app-guide-btn',
            actionKey: 'SIMULATE_APP_GUIDE',
          },
          {
            id: 'INBOX_MAIL',
            title: 'Mailbox & Announcements',
            icon: '📫',
            summary: 'Admin ke zaroori notices, circulars aur gifts.',
            speechText: 'Mailbox me teachers aur admin ki taraf se aane wale official updates, exam circulars aur bonus gift claims aate hain.',
            bullets: ['Official notices aur exam timetables.', 'Special gift claims.'],
            targetSelector: '#topbar-mail-btn',
            actionKey: 'SIMULATE_MAILBOX',
          },
          {
            id: 'EVENTS_STATUS',
            title: 'Events & System Status',
            icon: '⚡',
            summary: 'Live events, study streak aur cloud database connection dots.',
            speechText: 'Yahan active score boost events, streak flame aur green dots database connection ka live status dikhate hain.',
            bullets: ['Active events countdown.', 'Cloud connection status dots.'],
            targetSelector: '#topbar-events-btn',
            actionKey: 'SIMULATE_EVENTS',
          },
          {
            id: 'THREE_DOTS',
            title: '3-Dot Menu (Board Switcher & Tools)',
            icon: '⋮',
            summary: 'Board switcher (NCERT / BSEB), theme changer aur system settings.',
            speechText: 'Yeh dekhiye, 3-dot menu khul gaya! Iske andar sabse upar Board Switcher hai jahan se aap NCERT English, NCERT Hindi aur BSEB board switch kar sakte hain. Saath hi Day/Night themes aur rules bhi yahan se badal sakte hain.',
            bullets: ['Board switcher (NCERT English, Hindi, BSEB).', 'Day/Night luxury themes.', 'Rules aur settings shortcuts.'],
            targetSelector: '#topbar-3dots-btn',
            actionKey: 'SIMULATE_3DOTS',
          }
        ]
      },
      {
        id: 'CLASS_6_12',
        title: 'Class 6-12 Card',
        icon: '🏫',
        description: 'School classes 6th to 12th ka full syllabus aur chapters.',
        targetSelector: '#home-class-6-12-card',
        actionKey: 'SPOTLIGHT_CLASS_6_12',
        speechText: 'Yeh hai Class 6 se 12 ka Selection Desk! Yahan se aap Class 6, 7, 8, 9, 10, 11 ya 12 me se apni class chun sakte hain. Chunne ke baad sare subjects aur chapter notes automatically load ho jate hain.',
        items: [
          {
            id: 'CLASS_6_12_ITEM',
            title: 'Class 6-12 Desk',
            icon: '🏫',
            summary: 'Select your class from 6th to 12th.',
            speechText: 'Yeh hai Class 6 se 12 ka Selection Desk! Yahan se aap Class 6, 7, 8, 9, 10, 11 ya 12 me se apni class chun sakte hain. Chunne ke baad sare subjects aur chapter notes automatically load ho jate hain.',
            bullets: ['Class 6th se 12th tak sabhi classes.', 'NCERT aur State Board syllabus.'],
            targetSelector: '#home-class-6-12-card',
            actionKey: 'SPOTLIGHT_CLASS_6_12'
          }
        ]
      },
      {
        id: 'COMPETITION',
        title: 'Competition Card',
        icon: '🎯',
        description: 'Competitive · Govt. Exams preparation desk.',
        targetSelector: '#home-competition-card',
        actionKey: 'SIMULATE_COMPETITION',
        speechText: 'Yeh hai Competitive aur Government Exams ka card! Isme SSC, Railway, Banking, Defense aur State exams ke syllabus, previous year papers aur comprehensive notes milte hain.',
        items: [
          {
            id: 'COMPETITION_ITEM',
            title: 'Competitive Exams',
            icon: '🎯',
            summary: 'SSC, Railway, Banking, Defense exams.',
            speechText: 'Yeh hai Competitive aur Government Exams ka card! Isme SSC, Railway, Banking, Defense aur State exams ke syllabus, previous year papers aur comprehensive notes milte hain.',
            bullets: ['SSC, Railway, Banking, Defense exams.', 'Previous year papers aur full notes.'],
            targetSelector: '#home-competition-card',
            actionKey: 'SIMULATE_COMPETITION'
          }
        ]
      },
      {
        id: 'ROUTINE',
        title: 'Routine Card',
        icon: '⏰',
        description: 'Daily timetable, study targets aur habit streak.',
        targetSelector: '#home-routine-card',
        actionKey: 'SIMULATE_ROUTINE',
        speechText: 'Yeh hai My Routine card! Is par tap karke aap apna daily timetable, study target aur habit streak track kar sakte hain taaki roz sahi time par focused padhai ho sake.',
        items: [
          {
            id: 'ROUTINE_ITEM',
            title: 'My Routine Planner',
            icon: '⏰',
            summary: 'Daily timetable & study targets.',
            speechText: 'Yeh hai My Routine card! Is par tap karke aap apna daily timetable, study target aur habit streak track kar sakte hain taaki roz sahi time par focused padhai ho sake.',
            bullets: ['Daily study timetable.', 'Study target hours.', 'Habit streak.'],
            targetSelector: '#home-routine-card',
            actionKey: 'SIMULATE_ROUTINE'
          }
        ]
      },
      {
        id: 'REVISION_HUB',
        title: 'Revision Hub Card',
        icon: '⚡',
        description: 'Fast revision, Lucent GK aur one-liner recall.',
        targetSelector: '#home-revision-card',
        actionKey: 'SIMULATE_REVISION',
        speechText: 'Yeh hai Revision Hub card! Yahan se Lucent GK, quick formula sheets aur fast revision notes ek jagah milte hain taaki exam se pehle superfast revision ho sake.',
        items: [
          {
            id: 'REVISION_HUB_ITEM',
            title: 'Revision Hub',
            icon: '⚡',
            summary: 'Lucent GK & fast revision points.',
            speechText: 'Yeh hai Revision Hub card! Yahan se Lucent GK, quick formula sheets aur fast revision notes ek jagah milte hain taaki exam se pehle superfast revision ho sake.',
            bullets: ['Lucent GK high-yield points.', 'Fast chapter summaries.'],
            targetSelector: '#home-revision-card',
            actionKey: 'SIMULATE_REVISION'
          }
        ]
      },
      {
        id: 'FUTURE_WHEEL',
        title: 'Future Wheel',
        icon: '🎡',
        description: 'Screen par floating quick actions wheel.',
        targetSelector: '#nsta-quick-fab',
        actionKey: 'SIMULATE_WHEEL',
        speechText: 'Yeh hai screen par floating Feature Wheel! Is par tap karte hi ghumne wala circular wheel khulta hai jisse aap bina kisi page par jaye 10 important tools aur messenger turant use kar sakte hain.',
        items: [
          {
            id: 'FUTURE_WHEEL_ITEM',
            title: 'NSTA Quick Wheel',
            icon: '🎡',
            summary: '10 tools & messenger in floating wheel.',
            speechText: 'Yeh hai screen par floating Feature Wheel! Is par tap karte hi ghumne wala circular wheel khulta hai jisse aap bina kisi page par jaye 10 important tools aur messenger turant use kar sakte hain.',
            bullets: ['10 tools instant finger reach par.', 'Floating draggable icon.'],
            targetSelector: '#nsta-quick-fab',
            actionKey: 'SIMULATE_WHEEL'
          }
        ]
      }
    ]
  },

  PRO: {
    pageId: 'PRO',
    pageTitle: 'Pro & Updates Page',
    pageIcon: '🚀',
    introSpeech: 'Pro aur Updates screen par aapka swagat hai! Yahan app ki advance study utilities aur official updates milti hain. Kiske baare me dekhna chahte hain?',
    categories: [
      {
        id: 'UPDATES_TOP_BAR',
        title: 'Top Bar & Navigation',
        icon: '🔙',
        description: 'Screen back button aur navigation.',
        targetSelector: '#updates-back-btn',
        speechText: 'Yeh Top Bar hai! Is back button par tap karke aap seedhe wapas Home screen par laut sakte hain.',
        items: [
          {
            id: 'UPDATES_BACK',
            title: 'Back to Home',
            icon: '🔙',
            summary: 'Wapas Home Screen par jayein.',
            speechText: 'Is back button par tap karke aap seedhe wapas Home screen par laut sakte hain.',
            targetSelector: '#updates-back-btn',
            bullets: ['Instant return to Home screen.', 'Smooth transition.']
          }
        ]
      },
      {
        id: 'UPDATES_SECTIONS',
        title: 'Section Switcher Tabs',
        icon: '📑',
        description: 'Advance Tools aur Events & Updates ke beech switch karein.',
        targetSelector: '#updates-tabs-container',
        speechText: 'Yeh dono main tabs hain — Advance Tools aur Events & Updates. Kaunsa section dekhna chahte hain?',
        items: [
          {
            id: 'TAB_ADVANCE_TOOLS',
            title: 'Advance Tools Tab',
            icon: '🛠️',
            summary: 'Daily Challenge, Messenger, Study Room aur Demand tools.',
            speechText: 'Advance Tools tab me Daily Challenge, Student Messenger, Group Study Room aur Demand Content jaise power tools milte hain.',
            targetSelector: '#updates-tab-advance-tools',
            bullets: ['Daily challenge & targets.', 'Messenger & Study Room.']
          },
          {
            id: 'TAB_EVENTS_UPDATES',
            title: 'Events & Updates Tab',
            icon: '📢',
            summary: 'Live school notices, exam events aur system announcements.',
            speechText: 'Events and Updates tab me school ki official notices, test series events aur app ke updates ki list dikhti hai.',
            targetSelector: '#updates-tab-events-updates',
            bullets: ['Official circulars.', 'Upcoming live tests.']
          }
        ]
      },
      {
        id: 'DAILY_CHALLENGE',
        title: 'Daily Study Challenge',
        icon: '🏆',
        description: 'Roz naye questions aur targets complete karke reward payein.',
        targetSelector: '#updates-daily-challenge-card',
        speechText: 'Yeh Daily Challenge card hai! Roz yahan naye questions aur target tasks aate hain. Inhe poora karne se aapko bonus XP aur extra coins milte hain!',
        items: [
          {
            id: 'DAILY_CHALLENGE_ITEM',
            title: 'Daily Challenge Hub',
            icon: '🏆',
            summary: 'Complete daily targets for bonus XP.',
            speechText: 'Yeh Daily Challenge card hai! Roz yahan naye questions aur target tasks aate hain. Inhe poora karne se aapko bonus XP aur extra coins milte hain!',
            targetSelector: '#updates-daily-challenge-card',
            bullets: ['Roz naye questions.', 'Extra bonus XP aur coins.']
          }
        ]
      },
      {
        id: 'MESSENGER',
        title: 'Student Messenger',
        icon: '💬',
        description: 'Doston aur batchmates ke sath peer-to-peer study chat.',
        targetSelector: '#updates-messenger-card',
        speechText: 'Yeh Student Messenger card hai! Isme aap apne batchmates aur doston ke sath direct study chat kar sakte hain, doubt discuss kar sakte hain aur notes share kar sakte hain.',
        items: [
          {
            id: 'MESSENGER_ITEM',
            title: 'Study Messenger',
            icon: '💬',
            summary: 'Chat with classmates & study partners.',
            speechText: 'Yeh Student Messenger card hai! Isme aap apne batchmates aur doston ke sath direct study chat kar sakte hain, doubt discuss kar sakte hain aur notes share kar sakte hain.',
            targetSelector: '#updates-messenger-card',
            bullets: ['Direct peer chat.', 'Study discussions & notes sharing.']
          }
        ]
      },
      {
        id: 'STUDY_ROOM',
        title: 'Live Study Room',
        icon: '👥',
        description: 'Group study, live study timer aur silent focus sessions.',
        targetSelector: '#updates-study-room-card',
        speechText: 'Yeh Live Study Room card hai! Yahan students ek sath virtual library ki tarah live timer ke sath silent study karte hain. Free users roz 2 study rooms bana sakte hain, aur VIP members unlimited rooms bana sakte hain!',
        items: [
          {
            id: 'STUDY_ROOM_ITEM',
            title: 'Virtual Study Room',
            icon: '👥',
            summary: 'Group focus sessions with live timer.',
            speechText: 'Yeh Live Study Room card hai! Yahan students ek sath virtual library ki tarah live timer ke sath silent study karte hain. Free users roz 2 study rooms bana sakte hain, aur VIP members unlimited rooms bana sakte hain!',
            targetSelector: '#updates-study-room-card',
            bullets: [
              'Free User: Roz 2 study rooms create karein (Max 30 min).',
              'VIP User: Unlimited study rooms aur extended time.',
              'Pomodoro timer, silent study aur live classmates.'
            ]
          }
        ]
      },
      {
        id: 'CONTENT_DEMAND',
        title: 'Content Demand Desk',
        icon: '📝',
        description: 'Kisi bhi book, chapter ya coaching material ki direct demand karein.',
        targetSelector: '#updates-content-demand-card',
        speechText: 'Yeh Content Demand Desk hai! Agar aapko koi specific chapter, coaching notes ya previous year question bank chahiye jo app me nahi mil raha, toh yahan request karein. Admin team 24 ghante me verified material upload karti hai!',
        items: [
          {
            id: 'CONTENT_DEMAND_ITEM',
            title: 'Request New Material',
            icon: '📝',
            summary: 'Direct request to app admin team.',
            speechText: 'Yeh Content Demand Desk hai! Agar aapko koi specific chapter, coaching notes ya previous year question bank chahiye jo app me nahi mil raha, toh yahan request karein. Admin team 24 ghante me verified material upload karti hai!',
            targetSelector: '#updates-content-demand-card',
            bullets: ['24 hour fast upload.', 'Verified authentic notes.']
          }
        ]
      },
      {
        id: 'OFFLINE_STORAGE',
        title: 'Offline Storage Desk',
        icon: '📥',
        description: 'Downloaded books, audio notes aur offline access.',
        targetSelector: '#updates-offline-card',
        speechText: 'Yeh Offline Storage card hai! Aapne jo bhi chapter notes, offline PDFs aur audio lectures download kiye hain, wo bina internet ke yahan se chalte hain.',
        items: [
          {
            id: 'OFFLINE_STORAGE_ITEM',
            title: 'Zero-Data Offline Vault',
            icon: '📥',
            summary: 'Access downloaded notes without internet.',
            speechText: 'Yeh Offline Storage card hai! Aapne jo bhi chapter notes, offline PDFs aur audio lectures download kiye hain, wo bina internet ke yahan se chalte hain.',
            targetSelector: '#updates-offline-card',
            bullets: ['Save mobile data.', 'Instant offline reading.']
          }
        ]
      },
      {
        id: 'INSTITUTE_CONNECT',
        title: 'School & Coaching Connect',
        icon: '🏫',
        description: 'Apne school aur coaching institute ka portal connect karein.',
        targetSelector: '#updates-school-card',
        speechText: 'Yeh School aur Coaching connection cards hain! Inse aapke institute ka official timetable, attendance aur assigned test series synchronize hoti hai.',
        items: [
          {
            id: 'SCHOOL_CARD',
            title: 'School Desk',
            icon: '🏫',
            summary: 'School timetable, notices aur exams.',
            speechText: 'School Desk par tap karke aap apne school ke official circulars, routine aur class tests dekh sakte hain.',
            targetSelector: '#updates-school-card',
            bullets: ['School notices & timetable.', 'Official calendar.']
          },
          {
            id: 'COACHING_CARD',
            title: 'Coaching Desk',
            icon: '🎓',
            summary: 'Coaching batches, mock tests aur DPPs.',
            speechText: 'Coaching Desk se aapke coaching batches, daily practice problems aur rank tests link hote hain.',
            targetSelector: '#updates-coaching-card',
            bullets: ['Coaching test series.', 'DPP daily practice problems.']
          }
        ]
      }
    ]
  },

  MCQ: {
    pageId: 'MCQ',
    pageTitle: 'MCQ Arena & Battles',
    pageIcon: '⚔️',
    introSpeech: 'MCQ Arena me aapka swagat hai! Yahan speed tests, official 100 MCQs aur 1v1 battle practice hoti hai. Kiske baare me dekhna chahte hain?',
    categories: [
      {
        id: 'MCQ_TOP_BAR',
        title: 'Top Bar & Back',
        icon: '🔙',
        description: 'Test exit button aur top status.',
        targetSelector: '#mcq-back-btn',
        speechText: 'Yeh Top Bar hai! Is back button se aap bina data lose kiye test arena se wapas ja sakte hain.',
        items: [
          {
            id: 'MCQ_BACK',
            title: 'Back Button',
            icon: '🔙',
            summary: 'Test se bahar nikal kar wapas jayein.',
            speechText: 'Is back button se aap bina data lose kiye test arena se wapas ja sakte hain.',
            targetSelector: '#mcq-back-btn',
            bullets: ['Safe exit from test arena.']
          }
        ]
      },
      {
        id: 'MCQ_MODES',
        title: 'Test Modes Switcher',
        icon: '🎯',
        description: 'Official 100 MCQs aur 1v1 Live Battle mode.',
        targetSelector: '#mcq-mode-tabs',
        speechText: 'Yahan se aap test mode chun sakte hain — Official 100 questions ka standard test ya phir dusre students ke sath 1v1 battle!',
        items: [
          {
            id: 'MODE_OFFICIAL',
            title: 'Official 100 MCQs Mode',
            icon: '📋',
            summary: '100 questions ka full exam pattern mock test.',
            speechText: 'Official 100 MCQs mode me complete exam syllabus ke 100 questions timer ke sath aate hain, jisse real exam ka time management banta hai.',
            targetSelector: '#mcq-tab-official',
            bullets: ['100 real exam questions.', 'Timer & Accuracy score.']
          },
          {
            id: 'MODE_BATTLE',
            title: '1v1 Live MCQ Battle',
            icon: '⚔️',
            summary: 'Real-time live battle with batchmates.',
            speechText: 'MCQ Battle me aap live doosre students ke sath compete karte hain. Jo sabse tez aur sahi answer dega, wahi battle jeetega aur rank badhegi!',
            targetSelector: '#mcq-tab-battle',
            bullets: ['Real-time live multiplayer.', 'Instant rank points.']
          }
        ]
      },
      {
        id: 'CLASS_DRAWER',
        title: 'Class & Subject Selector',
        icon: '📚',
        description: 'Class 6th se 12th aur subject choose karein.',
        targetSelector: '#mcq-class-drawer-trigger-official',
        speechText: 'Yeh Class aur Subject Selector drawer hai! Is par tap karke aap apni class aur chapter badal kar kisi bhi subject ka MCQ test shuru kar sakte hain.',
        items: [
          {
            id: 'CLASS_DRAWER_ITEM',
            title: 'Change Class & Subject',
            icon: '📚',
            summary: 'Select any class from 6th to 12th.',
            speechText: 'Yeh Class aur Subject Selector drawer hai! Is par tap karke aap apni class aur chapter badal kar kisi bhi subject ka MCQ test shuru kar sakte hain.',
            targetSelector: '#mcq-class-drawer-trigger-official',
            bullets: ['Class 6th se 12th.', 'All subjects & chapters.']
          }
        ]
      },
      {
        id: 'TEST_CONTROLS',
        title: 'Test Controls & Audio',
        icon: '⚙️',
        description: 'Review grid, restart test aur sound toggle.',
        targetSelector: '#mcq-controls-bar',
        speechText: 'Yeh aapke test controls hain! Review All, Restart aur Sound effect switch. Kaunsa tool dekhna hai?',
        items: [
          {
            id: 'BTN_REVIEW',
            title: 'Review All Questions',
            icon: '👁️',
            summary: 'Sabhi 100 questions ka summary grid dekhein.',
            speechText: 'Review All button se test ke sabhi questions ka bird-eye grid khulta hai, jisme attempted, skipped aur doubtful questions saaf dikhte hain.',
            targetSelector: '#mcq-btn-review-all',
            bullets: ['Full question grid palette.', 'Jump to any question.']
          },
          {
            id: 'BTN_RESTART',
            title: 'Restart Test',
            icon: '🔄',
            summary: 'Test ko zero se restart karein.',
            speechText: 'Restart button par click karke aap test ko fresh state me dobara shuru kar sakte hain.',
            targetSelector: '#mcq-btn-restart',
            bullets: ['Fresh start.', 'Reset timer and score.']
          },
          {
            id: 'BTN_SOUND',
            title: 'Sound FX Toggle',
            icon: '🔊',
            summary: 'Correct/wrong answer sound effect.',
            speechText: 'Sound toggle button se right ya wrong answer par bajne wale audio effects ko on ya off kar sakte hain.',
            targetSelector: '#mcq-btn-sound',
            bullets: ['Haptic audio cues.', 'Mute option available.']
          }
        ]
      },
      {
        id: 'ACTIVE_QUESTION',
        title: 'Question Arena & Options',
        icon: '❓',
        description: 'Active question card, timer aur answer options.',
        targetSelector: '#mcq-question-card',
        speechText: 'Yeh aapka main Question Card hai! Question dhyan se padhein, 4 options me se sahi option select karein aur har question ke baad instant formula explanation check karein.',
        items: [
          {
            id: 'ACTIVE_QUESTION_ITEM',
            title: 'Question Card',
            icon: '❓',
            summary: 'Interactive options and detailed solutions.',
            speechText: 'Yeh aapka main Question Card hai! Question dhyan se padhein, 4 options me se sahi option select karein aur har question ke baad instant formula explanation check karein.',
            targetSelector: '#mcq-question-card',
            bullets: ['High quality questions.', 'Instant explanation & KaTeX formulas.']
          }
        ]
      }
    ]
  },

  ROUTINE: {
    pageId: 'ROUTINE',
    pageTitle: 'Routine & Timetable Planner',
    pageIcon: '⏰',
    introSpeech: 'My Routine screen par aapka swagat hai! Yeh aapka personal study time-table aur habit coach hai. Kiske baare me janna chahte hain?',
    categories: [
      {
        id: 'ROUTINE_HEADER',
        title: 'Header & Back',
        icon: '🔙',
        description: 'Routine header aur back button.',
        targetSelector: '#routine-back-btn',
        speechText: 'Yeh routine header hai! Is back button par tap karke aap wapas dashboard par ja sakte hain.',
        items: [
          {
            id: 'ROUTINE_BACK',
            title: 'Back Button',
            icon: '🔙',
            summary: 'Wapas dashboard par lautne ke liye.',
            speechText: 'Is back button par tap karke aap Dashboard par wapas ja sakte hain.',
            targetSelector: '#routine-back-btn',
            bullets: ['Instant return to dashboard.']
          }
        ]
      },
      {
        id: 'ROUTINE_TOGGLE',
        title: 'Routine Master Switch',
        icon: '⚡',
        description: 'Daily routine tracking on ya off karein.',
        targetSelector: '#routine-toggle-switch',
        speechText: 'Yeh Routine Master Switch hai! Isko ON rakhne par aapke study targets active rehte hain aur time par alert aate hain.',
        items: [
          {
            id: 'ROUTINE_TOGGLE_ITEM',
            title: 'Master Power Toggle',
            icon: '⚡',
            summary: 'Activate or pause daily routine tracking.',
            speechText: 'Yeh Routine Master Switch hai! Isko ON rakhne par aapke study targets active rehte hain aur time par alert aate hain.',
            targetSelector: '#routine-toggle-switch',
            bullets: ['Master tracking on/off.', 'Preserves saved targets.']
          }
        ]
      },
      {
        id: 'ROUTINE_TABS',
        title: 'Planner View Tabs',
        icon: '📑',
        description: 'Daily Hub, Subjects aur My Syllabus tabs.',
        targetSelector: '#routine-tabs-bar',
        speechText: 'Yahan 3 main tabs hain — Daily Hub, Subjects aur My Syllabus. Kisko explore karna hai?',
        items: [
          {
            id: 'TAB_DAILY_HUB',
            title: 'Daily Hub Tab',
            icon: '📅',
            summary: 'Morning se evening tak ke daily study slots.',
            speechText: 'Daily Hub tab me aapke din bhar ke subah se raat tak ke study slots, ongoing target aur complete kiye gaye ghante dikhte hain.',
            targetSelector: '#routine-tab-daily-hub',
            bullets: ['Daily slot timeline.', 'Target study hours meter.']
          },
          {
            id: 'TAB_SUBJECTS',
            title: 'Subjects Allotment Tab',
            icon: '📚',
            summary: 'Har subject ke time and priority breakdown.',
            speechText: 'Subjects tab me har subject ko kitna time mila hai aur kis subject me zyada revision ki zaroorat hai, yeh analyze hota hai.',
            targetSelector: '#routine-tab-subjects',
            bullets: ['Subject-wise hours.', 'High-priority tags.']
          },
          {
            id: 'TAB_SYLLABUS',
            title: 'My Syllabus Tab',
            icon: '📊',
            summary: 'Chapter completion percentage tracker.',
            speechText: 'My Syllabus tab me aapki class ke sabhi chapters ka progress graph dikhta hai ki kitne chapters padh liye aur kitne baaki hain.',
            targetSelector: '#routine-tab-syllabus',
            bullets: ['Syllabus completion percentage.', 'Pending chapter checklist.']
          }
        ]
      },
      {
        id: 'ROUTINE_SETTINGS',
        title: 'Class & Target Settings',
        icon: '⚙️',
        description: 'Class, waking hours aur routine slots customize karein.',
        targetSelector: '#routine-settings-btn',
        speechText: 'Yeh Routine Settings button hai! Yahan se aap apni class, school timing aur daily self-study hours customize kar sakte hain.',
        items: [
          {
            id: 'ROUTINE_SETTINGS_ITEM',
            title: 'Custom Routine Setup',
            icon: '⚙️',
            summary: 'Configure sleep, school & study time.',
            speechText: 'Yeh Routine Settings button hai! Yahan se aap apni class, school timing aur daily self-study hours customize kar sakte hain.',
            targetSelector: '#routine-settings-btn',
            bullets: ['Custom sleep and study hours.', 'Category distribution.']
          }
        ]
      },
      {
        id: 'ROUTINE_SLOTS',
        title: 'Active Daily Study Slots',
        icon: '🕒',
        description: 'Timeline par lage daily time slots aur tasks.',
        targetSelector: '#routine-slots-container',
        speechText: 'Yeh aapka study slots timeline hai! Har slot me target chapter likha hota hai. Padhai poori hone par checkmark dabayein taaki streak maintain rahe!',
        items: [
          {
            id: 'ROUTINE_SLOTS_ITEM',
            title: 'Study Slots Timeline',
            icon: '🕒',
            summary: 'Slot checklist with checkmarks.',
            speechText: 'Yeh aapka study slots timeline hai! Har slot me target chapter likha hota hai. Padhai poori hone par checkmark dabayein taaki streak maintain rahe!',
            targetSelector: '#routine-slots-container',
            bullets: ['Slot completion checkmarks.', 'Dynamic break reminders.']
          }
        ]
      }
    ]
  },

  REVISION_HUB: {
    pageId: 'REVISION_HUB',
    pageTitle: 'Revision Hub & Lucent GK',
    pageIcon: '⚡',
    introSpeech: 'Revision Hub me aapka swagat hai! Yeh exam se theek pehle fast recall aur high-yield revision ke liye bana hai. Kiske baare me dekhna chahte hain?',
    categories: [
      {
        id: 'REVISION_HEADER',
        title: 'Header & Back',
        icon: '🔙',
        description: 'Back navigation button.',
        targetSelector: '#revision-hub-back-btn',
        speechText: 'Is back button se aap Revision Hub se wapas Dashboard par laut sakte hain.',
        items: [
          {
            id: 'REVISION_BACK',
            title: 'Back to Dashboard',
            icon: '🔙',
            summary: 'Dashboard par wapas jayein.',
            speechText: 'Is button se aap Revision Hub se wapas Dashboard par laut sakte hain.',
            targetSelector: '#revision-hub-back-btn',
            bullets: ['Instant return to home.']
          }
        ]
      },
      {
        id: 'REVISION_TABS',
        title: 'Revision Navigation Tabs',
        icon: '📑',
        description: 'MCQ Revision, Performance Analytics aur Test History tabs.',
        targetSelector: '#revision-hub-tabs-bar',
        speechText: 'Yahan Revision Hub ke 3 main sections hain — MCQ Revision, Performance aur History. Kaunsa section samjhna hai?',
        items: [
          {
            id: 'TAB_REV_MCQ',
            title: 'MCQ Revision Tab',
            icon: '🎯',
            summary: 'Fast high-yield questions practice.',
            speechText: 'MCQ Revision tab me direct exam questions ka rapid practice set hota hai taaki facts aur formulas jaldi dimag me set ho sakein.',
            targetSelector: '#revision-hub-tab-mcq',
            bullets: ['High yield fast questions.', 'Exam-focused points.']
          },
          {
            id: 'TAB_REV_PERFORMANCE',
            title: 'Performance & Analytics',
            icon: '📈',
            summary: 'Accuracy graph aur weak points report.',
            speechText: 'Performance tab me aapka revision accuracy rate, speed per question aur kaunse chapters me marks kat rahe hain, sab dikhta hai.',
            targetSelector: '#revision-hub-tab-performance',
            bullets: ['Accuracy breakdown.', 'Weak subject alerts.']
          },
          {
            id: 'TAB_REV_HISTORY',
            title: 'Revision Test History',
            icon: '📜',
            summary: 'Pichle sabhi revision tests ka record.',
            speechText: 'History tab me aapke diye gaye sabhi purane revision tests ke scorecards aur solutions save rehte hain.',
            targetSelector: '#revision-hub-tab-history',
            bullets: ['Past scorecards.', 'Re-attempt mistakes.']
          }
        ]
      },
      {
        id: 'NSTA_FAB',
        title: 'NSTA Floating Bar Controller',
        icon: '🔘',
        description: 'Screen par bottom navigation bar ko show ya hide karein.',
        targetSelector: '#revision-hub-nsta-fab',
        speechText: 'Yeh NSTA Floating Button hai! Revision karte waqt agar aapko full screen view chahiye toh is button se bottom navigation bar hide ya show kar sakte hain.',
        items: [
          {
            id: 'NSTA_FAB_ITEM',
            title: 'Fullscreen Nav Toggle',
            icon: '🔘',
            summary: 'Toggle bottom navigation bar visibility.',
            speechText: 'Yeh NSTA Floating Button hai! Revision karte waqt agar aapko full screen view chahiye toh is button se bottom navigation bar hide ya show kar sakte hain.',
            targetSelector: '#revision-hub-nsta-fab',
            bullets: ['Distraction-free fullscreen mode.', 'Easy tap toggle.']
          }
        ]
      }
    ]
  },

  STUDY_MODE: {
    pageId: 'STUDY_MODE',
    pageTitle: 'Study Mode & Chapter Studio',
    pageIcon: '📖',
    introSpeech: 'Welcome to Study Mode! Yahan aapko padhai ke 9 powerful study modes, live timer aur smart reading tools milte hain.',
    categories: [
      {
        id: 'ALL_NINE_MODES',
        title: '9 Core Study Modes',
        icon: '🎯',
        description: 'Reading, Writing, MCQ, Projector, Flashcard, Q&A, PDF, Video aur Audio.',
        items: [
          {
            id: 'MODE_READING',
            title: '1. Reading Mode',
            icon: '📖',
            summary: 'Distraction-free chunked reading.',
            speechText: 'Reading mode me chapter ke saare notes step-by-step chunked format me khulte hain, zero distraction ke sath!',
            bullets: ['Chunked reading.', 'KaTeX formulas.']
          },
          {
            id: 'MODE_WRITING',
            title: '2. Writing Mode & Digital Slate',
            icon: '✍️',
            summary: 'Likh kar practice karein.',
            speechText: 'Writing mode me aap khud definitions aur formula likh kar practice karte hain aur smart correction marks deta hai!',
            bullets: ['Digital handwriting practice.', 'WriteModeCorrection engine.']
          },
          {
            id: 'MODE_MCQ',
            title: '3. MCQ Practice Mode',
            icon: '🧠',
            summary: 'Har question ka instant explanation.',
            speechText: 'MCQ practice mode me chapter ke important questions aate hain. Option select karte hi answer aur explanation samne aata hai!',
            bullets: ['Instant explanation.', 'Negative marking.']
          },
          {
            id: 'MODE_FLASHCARD',
            title: '4. Flashcard Mode',
            icon: '🗂️',
            summary: 'Rapid formula recall cards.',
            speechText: 'Flashcard mode me quick flip cards hote hain. 5 minute me pure chapter ke 50 formulas refresh ho jate hain!',
            bullets: ['Interactive card flip.', 'Spaced repetition.']
          }
        ]
      }
    ]
  },

  STORE: {
    pageId: 'STORE',
    pageTitle: 'Store, Currencies & VIP',
    pageIcon: '💎',
    introSpeech: 'Store me aapka swagat hai! Yahan VIP plans, Coins, Diamonds aur exciting study perks milte hain. Kiske baare me dekhna chahte hain?',
    categories: [
      {
        id: 'STORE_HEADER',
        title: 'Header & Back',
        icon: '🔙',
        description: 'Store se bahar jane ke liye back button.',
        targetSelector: '#store-back-btn',
        speechText: 'Yeh Store header hai! Is button par tap karke aap Store se wapas Dashboard par laut sakte hain.',
        items: [
          {
            id: 'STORE_BACK',
            title: 'Back to Dashboard',
            icon: '🔙',
            summary: 'Wapas dashboard par jayein.',
            speechText: 'Is button par tap karke aap Store se wapas Dashboard par laut sakte hain.',
            targetSelector: '#store-back-btn',
            bullets: ['Instant back navigation.']
          }
        ]
      },
      {
        id: 'STORE_CURRENCIES',
        title: 'Diamonds & Credits Wallets',
        icon: '🪙',
        description: 'Aapke Diamonds aur Study Credits ka live balance.',
        targetSelector: '#store-diamonds-pill',
        speechText: 'Yeh aapka wallet balance hai — Diamonds aur Credits! Kiske baare me janna chahte hain?',
        items: [
          {
            id: 'WALLET_DIAMONDS',
            title: 'Diamonds Balance 💎',
            icon: '💎',
            summary: 'Permanent premium content unlock currency.',
            speechText: 'Diamonds app ki sabse premium currency hain! Inse tests, locked PDF notes aur exclusive perks permanently unlock hote hain. Tap karke Diamond Store khol sakte hain.',
            targetSelector: '#store-diamonds-pill',
            bullets: ['Permanent unlock power.', 'Never expires.']
          },
          {
            id: 'WALLET_CREDITS',
            title: 'Coins / Credits Balance 🪙',
            icon: '🪙',
            summary: 'Daily study, streak & test coins.',
            speechText: 'Credits aapki study currency hai! Roz padhai karne, streaks banaye rakhne aur challenges jeetne par free milte hain. Tap karke Credit Store khol sakte hain.',
            targetSelector: '#store-credits-pill',
            bullets: ['Earn by studying.', 'Spend on practice tests.']
          }
        ]
      },
      {
        id: 'STORE_TABS',
        title: 'Store Sections & VIP Plans',
        icon: '👑',
        description: 'VIP Plans, Free vs VIP Compare, Credits, Diamonds aur Exchange.',
        targetSelector: '#store-tab-subscription',
        speechText: 'Store ke sabhi sections yahan hain — VIP Subscriptions, Free vs VIP Table, Credits, Diamonds aur History. Kiske baare me samjhoon?',
        items: [
          {
            id: 'TAB_VIP_SUB',
            title: 'VIP Subscriptions',
            icon: '👑',
            summary: 'Pro & Max plans with 2.0x XP Boost.',
            speechText: 'VIP Subscriptions me Pro aur Max plans aate hain, jisme unlimited MCQs, PDF notes, 2.0x Super XP Boost aur Golden Crown badge milta hai.',
            targetSelector: '#store-tab-subscription',
            bullets: ['2.0X XP multiplier.', 'Unlimited reading notes & tests.']
          },
          {
            id: 'TAB_COMPARE',
            title: 'Free vs VIP Compare',
            icon: '⚖️',
            summary: 'Detailed feature-by-feature comparison table.',
            speechText: 'Comparison table me aap dekh sakte hain ki Free student aur VIP student ko kya kya extra features aur daily limits milti hain.',
            targetSelector: '#store-tab-compare',
            bullets: ['Feature comparison chart.', 'Transparent benefits.']
          },
          {
            id: 'TAB_CREDITS_STORE',
            title: 'Credits Store',
            icon: '🪙',
            summary: 'Instant coin packs aur Daily Credit pass.',
            speechText: 'Credits store se aap instant coin packages ya Daily Credit Pass le sakte hain jisse roz automatic coins aate hain.',
            targetSelector: '#store-tab-credits',
            bullets: ['Instant coin packs.', 'Daily pass bonuses.']
          },
          {
            id: 'TAB_DIAMONDS_STORE',
            title: 'Diamonds Store',
            icon: '💎',
            summary: 'Exclusive Diamond packs & Daily drops.',
            speechText: 'Diamonds store me exclusive Diamond bundles aur Daily Diamond subscriptions milti hain.',
            targetSelector: '#store-tab-diamonds',
            bullets: ['Exclusive packs.', 'Daily diamond drops.']
          },
          {
            id: 'TAB_EXCHANGE',
            title: 'Currency Exchange',
            icon: '🔄',
            summary: 'Diamonds ko instant credits me swap karein.',
            speechText: 'Exchange counter par aap apne unused Diamonds ko instant Study Credits me swap kar sakte hain.',
            targetSelector: '#store-tab-exchange',
            bullets: ['Instant currency swap.', 'Flexible conversion.']
          },
          {
            id: 'TAB_HISTORY',
            title: 'Purchase History',
            icon: '📜',
            summary: 'Sabhi invoices aur plan validity.',
            speechText: 'History tab me aapke pichle sabhi active plans, recharge receipts aur transaction history rehti hai.',
            targetSelector: '#store-tab-history',
            bullets: ['Past transactions.', 'Plan validity status.']
          }
        ]
      }
    ]
  },

  PROFILE: {
    pageId: 'PROFILE',
    pageTitle: 'Profile, Level & Settings',
    pageIcon: '👤',
    introSpeech: 'Aapki Profile screen par aapka swagat hai! Yahan aapka rank level, rewards, security aur effects customize hote hain. Kiske baare me dekhna hai?',
    categories: [
      {
        id: 'PROFILE_HERO',
        title: 'Identity Card & Rank Level',
        icon: '🪪',
        description: 'Level status, badge, XP progress aur discount.',
        targetSelector: '#profile-user-card',
        speechText: 'Yeh aapka main Identity Card hai! Isme aapka current level, badge emoji, XP meter aur level discount dikhta hai. Tap karne par poora level ladder khulta hai!',
        items: [
          {
            id: 'PROFILE_HERO_ITEM',
            title: 'Level Rank Hero Card',
            icon: '🪪',
            summary: 'Current rank level & XP progress bar.',
            speechText: 'Yeh aapka main Identity Card hai! Isme aapka current level, badge emoji, XP meter aur level discount dikhta hai. Tap karne par poora level ladder khulta hai!',
            targetSelector: '#profile-user-card',
            bullets: ['Level 1 se 15 ladder.', 'XP progress bar.', 'Level discount perks.']
          }
        ]
      },
      {
        id: 'PROFILE_STATS',
        title: 'Student Stats Row',
        icon: '📊',
        description: 'Diamonds, Credits, Streak flame aur Total XP.',
        targetSelector: '#profile-diamonds-btn',
        speechText: 'Yeh aapka live stats row hai! Diamonds, Credits, Study Streak aur XP Score. Kiske baare me janna chahte hain?',
        items: [
          {
            id: 'STAT_DIAMONDS',
            title: 'Diamonds Wallet',
            icon: '💎',
            summary: 'Tap karke Diamond Store kholein.',
            speechText: 'Aapke pass kitne 💎 Diamonds hain yeh yahan dikhta hai. Tap karke aap turant Diamond Store me ja sakte hain.',
            targetSelector: '#profile-diamonds-btn',
            bullets: ['Diamond balance.', 'Direct store link.']
          },
          {
            id: 'STAT_CREDITS',
            title: 'Credits Balance',
            icon: '🪙',
            summary: 'Tap karke Coin Store kholein.',
            speechText: 'Aapka 🪙 Credits balance yahan hai. Test unlock karne ya study pass ke liye use hota hai.',
            targetSelector: '#profile-credits-btn',
            bullets: ['Credit balance.', 'Direct coin store link.']
          },
          {
            id: 'STAT_STREAK',
            title: 'Study Streak Flame',
            icon: '🔥',
            summary: 'Roz padhne par badhne wali flame.',
            speechText: 'Yeh aapki Study Streak hai! Agar aap roz bina break ke padhai karte hain, toh yeh flame badhti hai aur reward milte hain.',
            targetSelector: '#profile-streak-btn',
            bullets: ['Daily streak count.', 'Streak protection.']
          },
          {
            id: 'STAT_XP',
            title: 'Total XP Score',
            icon: '⭐',
            summary: 'Total accumulated experience score.',
            speechText: 'Yeh aapka Total XP Score hai! Har test dene, answer likhne aur video dekhne par XP milta hai jo aapki rank badhata hai.',
            targetSelector: '#profile-xp-btn',
            bullets: ['Total earned XP.', 'Leaderboard rank booster.']
          }
        ]
      },
      {
        id: 'PROFILE_RECOVERY',
        title: 'Account Recovery Card',
        icon: '🔐',
        description: 'Mobile, Email aur Security Question.',
        targetSelector: '#profile-recovery-card',
        speechText: 'Yeh Account Recovery Card hai! Yahan aapka registered mobile number, email aur secret security question save hota hai taaki phone khone ya badalne par aapka account hamesha safe rahe.',
        items: [
          {
            id: 'PROFILE_RECOVERY_ITEM',
            title: 'Security & Recovery',
            icon: '🔐',
            summary: 'Keep your student account safe.',
            speechText: 'Yeh Account Recovery Card hai! Yahan aapka registered mobile number, email aur secret security question save hota hai taaki phone khone ya badalne par aapka account hamesha safe rahe.',
            targetSelector: '#profile-recovery-card',
            bullets: ['Mobile & Email verification.', 'Security question backup.', 'Account protection.']
          }
        ]
      },
      {
        id: 'PROFILE_EFFECTS',
        title: 'Visual Effects & Toggles',
        icon: '✨',
        description: 'Name effect, Card glow aur Level animations.',
        targetSelector: '#profile-name-fx-toggle-btn',
        speechText: 'Yahan se aap app ke glowing visual effects customize kar sakte hain — Name Effect, Card Effect aur Level Animation. Kaunsa option dekhna hai?',
        items: [
          {
            id: 'FX_NAME',
            title: 'Name Glow Effect',
            icon: '✨',
            summary: 'Profile me naam par glowing animation.',
            speechText: 'Is switch se aap apne naam ke animated glowing effect ko on ya off kar sakte hain.',
            targetSelector: '#profile-name-fx-toggle-btn',
            bullets: ['Animated gradient text.', 'Battery saving static toggle.']
          },
          {
            id: 'FX_CARD',
            title: 'Card Glow Effect',
            icon: '🃏',
            summary: 'Profile card ke glowing borders.',
            speechText: 'Is switch se profile identity card ke border glow aur aura effect ko control kiya jata hai.',
            targetSelector: '#profile-card-fx-toggle-btn',
            bullets: ['Level aura border.', 'Simple clean mode.']
          },
          {
            id: 'FX_LEVEL_ANIM',
            title: 'Level Animation Toggle',
            icon: '⚡',
            summary: 'Top Bar aur Profile card level animations.',
            speechText: 'Is switch se Top Bar aur Profile Card ke level animation ko on ya off (static) kiya ja sakta hai.',
            targetSelector: '#profile-level-anim-toggle-btn',
            bullets: ['Dynamic vs static level animations.']
          }
        ]
      }
    ]
  },

  COMMUNITY: {
    pageId: 'COMMUNITY',
    pageTitle: 'Community & Chat',
    pageIcon: '💬',
    introSpeech: 'Community me students ek dusre ki doubts solve karte hain aur study tips share karte hain. Option chunein!',
    categories: [
      {
        id: 'DOUBTS',
        title: 'Doubt Solving Desk',
        icon: '❓',
        description: 'Apne sawal post karein aur mentors se solution payein.',
        items: [
          {
            id: 'POST_DOUBT',
            title: 'Doubt Kaise Poochein',
            icon: '📸',
            summary: 'Question image ya text post karein.',
            speechText: 'Community me kisi sawal me fas gaye hain toh post karein. Seniors aur verified mentors step-by-step solution dete hain!',
            bullets: ['Image upload support.', 'Verified mentor badges.']
          }
        ]
      }
    ]
  }
};

// ══════════════════ SMART GREETING HELPER ══════════════════
const getSmartGreeting = (robotName: string, pageTitle?: string, pageIntro?: string): { speech: string; isFirstToday: boolean } => {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning!' : hour < 17 ? 'Good afternoon!' : 'Good evening!';
  const todayDate = new Date().toDateString();
  const lastGreetDate = typeof window !== 'undefined' ? localStorage.getItem('nst_pedro_last_greet_date') : null;
  const isFirstToday = lastGreetDate !== todayDate;

  const targetName = pageTitle || 'Is screen';

  if (isFirstToday) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nst_pedro_last_greet_date', todayDate);
    }
    return {
      speech: `${timeGreeting} Main hoon ${robotName || 'Pedro'}! ${pageIntro || `${targetName} par aap kiske baare mein dekhna chahte hain? Option chuniye!`}`,
      isFirstToday: true
    };
  } else {
    return {
      speech: `${timeGreeting} ${pageIntro || `${targetName} par aap kiske baare mein dekhna chahte hain? Option chuniye!`}`,
      isFirstToday: false
    };
  }
};

// ══════════════════ INTERFACES ══════════════════
interface PedroAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  currentPageContext?: string;
  onNavigateTab?: (tab: string) => void;
  onTriggerAction?: (actionKey: string) => void;
  customKnowledge?: Record<string, PedroPageConfig>;
  customRobotName?: string;
  defaultPitch?: number;
  defaultRate?: number;
}

export const PedroAssistant: React.FC<PedroAssistantProps> = ({
  isOpen,
  onClose,
  activeTab = 'HOME',
  currentPageContext,
  onNavigateTab,
  onTriggerAction,
  customKnowledge,
  customRobotName = 'Pedro',
  defaultPitch = 1.48,
  defaultRate = 1.05
}) => {
  // Merge static knowledge with Admin customized knowledge
  const activeKnowledge = useMemo(() => {
    if (!customKnowledge) return PEDRO_PAGE_KNOWLEDGE;
    const merged: Record<string, PedroPageConfig> = { ...PEDRO_PAGE_KNOWLEDGE };
    Object.keys(customKnowledge).forEach(k => {
      const custom = customKnowledge[k];
      if (custom) {
        merged[k] = {
          ...PEDRO_PAGE_KNOWLEDGE[k],
          ...custom,
          categories: custom.categories && custom.categories.length > 0
            ? custom.categories
            : (PEDRO_PAGE_KNOWLEDGE[k]?.categories || [])
        };
      }
    });
    return merged;
  }, [customKnowledge]);

  // Determine current page key
  const pageKey = useMemo(() => {
    if (currentPageContext && activeKnowledge[currentPageContext]) {
      return currentPageContext;
    }
    const tabUpper = (activeTab || 'HOME').toUpperCase();
    if (tabUpper.includes('PRO') || tabUpper.includes('UPDATE')) return 'PRO';
    if (tabUpper.includes('MCQ')) return 'MCQ';
    if (tabUpper.includes('COMMUNITY') || tabUpper.includes('CHAT')) return 'COMMUNITY';
    if (tabUpper.includes('ROUTINE')) return 'ROUTINE';
    if (tabUpper.includes('LUCENT') || tabUpper.includes('REVISION')) return 'REVISION_HUB';
    if (tabUpper.includes('STUDY') || tabUpper.includes('LESSON')) return 'STUDY_MODE';
    if (tabUpper.includes('STORE')) return 'STORE';
    if (tabUpper.includes('PROFILE')) return 'PROFILE';
    return 'HOME';
  }, [currentPageContext, activeTab, activeKnowledge]);

  const pageConfig = activeKnowledge[pageKey] || activeKnowledge.HOME;

  // Selected Category / Sub-items state
  const [selectedCategory, setSelectedCategory] = useState<PedroCategory | null>(null);
  const [activeItemTitle, setActiveItemTitle] = useState<string | null>(null);
  const [showAskMoreChip, setShowAskMoreChip] = useState<boolean>(false);

  // Audio / Speech State
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Spotlight & Pointer Hand State
  const [spotlightRect, setSpotlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [pointerHandPos, setPointerHandPos] = useState<{ x: number; y: number; isTapping: boolean } | null>(null);

  // Simulation Countdown Toast
  const [simToast, setSimToast] = useState<{ message: string; countdown: number; onCancel: () => void } | null>(null);
  const simTimerRef = useRef<any>(null);

  // Pedro's physical floating coordinate (for opposite-side placement)
  const [pedroX, setPedroX] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nst_pedro_position');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.x) return parsed.x;
        }
      } catch {}
      return window.innerWidth - 75;
    }
    return 300;
  });

  // Listen to Pedro position changes if user drags the floating logo
  useEffect(() => {
    const handlePosChange = () => {
      try {
        const saved = localStorage.getItem('nst_pedro_position');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.x) setPedroX(parsed.x);
        }
      } catch {}
    };
    window.addEventListener('nst-pedro-pos-change', handlePosChange);
    return () => window.removeEventListener('nst-pedro-pos-change', handlePosChange);
  }, []);

  // Popup is placed on OPPOSITE side of Pedro
  const isPedroOnRight = pedroX > (typeof window !== 'undefined' ? window.innerWidth / 2 : 200);

  // Voice speech synthesis
  const speakText = (text: string, onFinish?: () => void) => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onFinish) setTimeout(onFinish, 2500);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      utterance.pitch = defaultPitch;
      utterance.rate = defaultRate;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        if (onFinish) onFinish();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        if (onFinish) onFinish();
      };

      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech error:', e);
      setIsSpeaking(false);
      if (onFinish) onFinish();
    }
  };

  const stopVoice = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // On open: smart time greeting & skip self-intro if already visited today
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(null);
      setActiveItemTitle(null);
      setShowAskMoreChip(false);
      setSpotlightRect(null);
      setPointerHandPos(null);

      // Smart time-of-day greeting
      const greetingInfo = getSmartGreeting(customRobotName, pageConfig?.pageTitle, pageConfig?.introSpeech);
      speakText(greetingInfo.speech);
    } else {
      stopVoice();
      setSpotlightRect(null);
      setPointerHandPos(null);
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      setSimToast(null);
    }
  }, [isOpen]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopVoice();
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  // Spotlight and pointer gesture helper
  const pointAndSpotlight = (selector: string | undefined, callback?: () => void) => {
    if (!selector) {
      if (callback) callback();
      return;
    }
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
      if (callback) callback();
      return;
    }

    // Smoothly center element into viewport
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setSpotlightRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });

      // Position pointer hand directly over target
      const handX = Math.max(20, Math.min(window.innerWidth - 60, rect.left + rect.width / 2 - 18));
      const handY = Math.max(70, rect.top + rect.height / 2 - 20);

      setPointerHandPos({ x: handX, y: handY, isTapping: false });

      // Tap animation after hand arrives
      setTimeout(() => {
        setPointerHandPos({ x: handX, y: handY, isTapping: true });
        setTimeout(() => {
          setPointerHandPos({ x: handX, y: handY, isTapping: false });
          if (callback) callback();
        }, 400);
      }, 500);
    }, 350);
  };

  // Interactive Demonstration Handler
  const executeSimulation = (item: PedroItemDetail) => {
    const action = item.actionKey;

    if (action === 'SIMULATE_APP_LOGO') {
      pointAndSpotlight('#nsta-header-brand-btn', () => {
        onTriggerAction?.('DEMO_APP_LOGO');
        speakText(item.speechText, () => {
          speakText('Aur kuch jaanna hai aapko?');
          setShowAskMoreChip(true);
        });
      });
    } else if (action === 'SIMULATE_3DOTS') {
      // 1. Point at 3-dots button
      pointAndSpotlight('#topbar-3dots-btn', () => {
        // 2. Open drawer live
        onTriggerAction?.('OPEN_3DOTS');
        // 3. Speak explanation
        speakText(item.speechText, () => {
          // 4. Countdown to close
          startCountdown('Auto-closing 3-dot menu...', 4, () => {
            onTriggerAction?.('CLOSE_3DOTS');
            setSpotlightRect(null);
            setPointerHandPos(null);
            speakText('3-dot menu band ho gaya! Aur kuch jaanna hai aapko?');
            setShowAskMoreChip(true);
          });
        });
      });
    } else if (action === 'SIMULATE_APP_GUIDE') {
      pointAndSpotlight('#topbar-app-guide-btn', () => {
        onTriggerAction?.('OPEN_GUIDE');
        speakText(item.speechText, () => {
          startCountdown('Auto-closing App Guide...', 4, () => {
            onTriggerAction?.('CLOSE_GUIDE');
            setSpotlightRect(null);
            setPointerHandPos(null);
            speakText('Aur kuch jaanna hai aapko?');
            setShowAskMoreChip(true);
          });
        });
      });
    } else if (action === 'SIMULATE_MAILBOX') {
      pointAndSpotlight('#topbar-mail-btn', () => {
        onTriggerAction?.('OPEN_INBOX');
        speakText(item.speechText, () => {
          startCountdown('Auto-closing Mailbox...', 4, () => {
            onTriggerAction?.('CLOSE_INBOX');
            setSpotlightRect(null);
            setPointerHandPos(null);
            speakText('Aur kuch jaanna hai aapko?');
            setShowAskMoreChip(true);
          });
        });
      });
    } else if (action === 'SIMULATE_WHEEL') {
      pointAndSpotlight('#nsta-quick-fab', () => {
        onTriggerAction?.('OPEN_WHEEL');
        speakText(item.speechText, () => {
          startCountdown('Auto-closing Feature Wheel...', 4, () => {
            onTriggerAction?.('CLOSE_WHEEL');
            setSpotlightRect(null);
            setPointerHandPos(null);
            speakText('Wheel band ho gaya! Aur kuch jaanna hai aapko?');
            setShowAskMoreChip(true);
          });
        });
      });
    } else if (action === 'SIMULATE_ROUTINE') {
      pointAndSpotlight('#home-routine-card', () => {
        onTriggerAction?.('DEMO_ROUTINE');
        speakText(item.speechText, () => {
          startCountdown('Home screen wapas ja rahe hain...', 4, () => {
            onTriggerAction?.('GO_HOME');
            setSpotlightRect(null);
            setPointerHandPos(null);
            speakText('Home par wapas aa gaye! Aur kuch jaanna hai aapko?');
            setShowAskMoreChip(true);
          });
        });
      });
    } else if (action === 'SIMULATE_REVISION') {
      pointAndSpotlight('#home-revision-card', () => {
        onTriggerAction?.('DEMO_REVISION');
        speakText(item.speechText, () => {
          startCountdown('Home screen wapas ja rahe hain...', 4, () => {
            onTriggerAction?.('GO_HOME');
            setSpotlightRect(null);
            setPointerHandPos(null);
            speakText('Home par wapas aa gaye! Aur kuch jaanna hai aapko?');
            setShowAskMoreChip(true);
          });
        });
      });
    } else if (action === 'SIMULATE_COMPETITION') {
      pointAndSpotlight('#home-competition-card', () => {
        onTriggerAction?.('DEMO_COMPETITION');
        speakText(item.speechText, () => {
          startCountdown('Home screen wapas ja rahe hain...', 4, () => {
            onTriggerAction?.('GO_HOME');
            setSpotlightRect(null);
            setPointerHandPos(null);
            speakText('Home par wapas aa gaye! Aur kuch jaanna hai aapko?');
            setShowAskMoreChip(true);
          });
        });
      });
    } else {
      // General item spotlight & speech
      pointAndSpotlight(item.targetSelector, () => {
        speakText(item.speechText, () => {
          speakText('Aur kuch jaanna hai aapko?');
          setShowAskMoreChip(true);
        });
      });
    }
  };

  // Countdown Helper for auto-returning
  const startCountdown = (message: string, durationSec: number, onComplete: () => void) => {
    if (simTimerRef.current) clearInterval(simTimerRef.current);
    let remaining = durationSec;

    setSimToast({
      message,
      countdown: remaining,
      onCancel: () => {
        if (simTimerRef.current) clearInterval(simTimerRef.current);
        setSimToast(null);
      }
    });

    simTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(simTimerRef.current);
        setSimToast(null);
        onComplete();
      } else {
        setSimToast(prev => prev ? { ...prev, countdown: remaining } : null);
      }
    }, 1000);
  };

  // Category Selection
  const handleSelectCategory = (cat: PedroCategory) => {
    setShowAskMoreChip(false);

    // Rule: "aur jab ek hi option higa tab bas wahi bata ke bolega aur kuvhh janna hai"
    if (cat.items.length === 1) {
      const singleItem = cat.items[0];
      setSelectedCategory(null);
      setActiveItemTitle(cat.title);
      executeSimulation(singleItem);
      return;
    }

    // Multiple sub-items (e.g. Top Bar)
    setSelectedCategory(cat);
    setActiveItemTitle(cat.title);

    // Spotlight the top-level element (e.g. #top-banner-container) and speak intro
    pointAndSpotlight(cat.targetSelector, () => {
      speakText(cat.speechText || `${cat.title}! Isme yeh options hain, kaunsa dekhna hai?`);
    });
  };

  // Sub-item Selection
  const handleSelectItem = (item: PedroItemDetail) => {
    setShowAskMoreChip(false);
    setActiveItemTitle(item.title);
    executeSimulation(item);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ── 1. SPOTLIGHT RING OVER TARGET ELEMENT ── */}
      {spotlightRect && (
        <div
          className="fixed pointer-events-none z-[99990] transition-all duration-500 rounded-2xl"
          style={{
            top: `${Math.max(4, spotlightRect.top - 4)}px`,
            left: `${Math.max(4, spotlightRect.left - 4)}px`,
            width: `${spotlightRect.width + 8}px`,
            height: `${spotlightRect.height + 8}px`,
            boxShadow: '0 0 0 3px #f59e0b, 0 0 32px rgba(245, 158, 11, 0.85)',
            border: '2px solid #fbbf24',
            animation: 'pulse 1.8s infinite'
          }}
        >
          <div className="absolute -top-3.5 left-2 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 animate-bounce">
            <span>🎯</span>
            <span>Pedro Live Focus</span>
          </div>
        </div>
      )}

      {/* ── 2. ANIMATED FLYING ROBOT POINTER HAND (👆) ── */}
      {pointerHandPos && (
        <div
          className="fixed pointer-events-none z-[99995] transition-all duration-500 ease-out"
          style={{
            left: `${pointerHandPos.x}px`,
            top: `${pointerHandPos.y}px`,
            transform: pointerHandPos.isTapping ? 'scale(0.82) translateY(8px)' : 'scale(1.05) translateY(0)',
            transformOrigin: 'bottom center'
          }}
        >
          <div className="relative flex flex-col items-center">
            {/* Robot Pointer Emoji Hand with Glowing Aura */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-300 text-white shadow-[0_4px_25px_rgba(245,158,11,0.9)] flex items-center justify-center border-2 border-white text-2xl animate-bounce">
              👆
            </div>

            {/* Ripple Wave on Tap */}
            {pointerHandPos.isTapping && (
              <span className="w-14 h-14 rounded-full border-2 border-amber-400 animate-ping absolute -top-1 pointer-events-none" />
            )}
          </div>
        </div>
      )}

      {/* ── 3. SIMULATION COUNTDOWN TOAST (AUTO-RETURN) ── */}
      {simToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[99998] pointer-events-auto animate-in slide-in-from-top-4 duration-200">
          <div className="bg-slate-900/95 text-white border-2 border-amber-400 shadow-2xl rounded-2xl px-4 py-2.5 flex items-center gap-3 backdrop-blur-md">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
            <div className="text-xs">
              <p className="font-black text-amber-300">{simToast.message}</p>
              <p className="text-[10px] text-slate-300">Wapas aane me: <span className="font-bold text-white text-xs">{simToast.countdown}s</span></p>
            </div>
            <button
              onClick={simToast.onCancel}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black tracking-wide uppercase active:scale-95 transition-transform"
            >
              Yahin Rahein
            </button>
          </div>
        </div>
      )}

      {/* ── 4. POPUP MENU ON OPPOSITE SIDE OF PEDRO ── */}
      {/* If Pedro is on the right, popup is fixed on the left. If Pedro is on the left, popup is fixed on the right. */}
      <div
        style={{
          position: 'fixed',
          [isPedroOnRight ? 'left' : 'right']: '14px',
          bottom: '84px',
          width: 'calc(100vw - 28px)',
          maxWidth: '310px',
          zIndex: 99980
        }}
        className="animate-in slide-in-from-bottom-3 fade-in duration-200 pointer-events-auto select-none"
      >
        <div className="bg-slate-950/92 dark:bg-slate-950/95 text-white rounded-2xl border border-purple-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(168,85,247,0.25)] backdrop-blur-xl overflow-hidden flex flex-col max-h-[70vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-700 via-purple-700 to-pink-600 px-3.5 py-2.5 flex items-center justify-between border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center text-sm border border-white/30 shadow-xs">
                🤖
              </div>
              <div>
                <h3 className="text-xs font-black tracking-tight flex items-center gap-1.5 leading-tight">
                  {customRobotName || 'Pedro'} Guide
                  {isSpeaking && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </h3>
                <p className="text-[10px] text-purple-200 font-medium leading-none">
                  {selectedCategory ? selectedCategory.title : pageConfig.pageTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (isMuted) {
                    setIsMuted(false);
                    speakText('Voice chalu ho gaya!');
                  } else {
                    stopVoice();
                    setIsMuted(true);
                  }
                }}
                className={`p-1.5 rounded-lg transition-colors ${isMuted ? 'text-red-300 bg-red-500/20' : 'text-purple-200 hover:bg-white/10'}`}
                title={isMuted ? "Unmute Voice" : "Mute Voice"}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Close Pedro"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Active Speaking Status Bar */}
          {isSpeaking && (
            <div className="px-3 py-1.5 bg-purple-950/60 border-b border-purple-800/40 flex items-center gap-2 text-[10px] text-purple-200 font-semibold animate-pulse">
              <span className="text-xs">🗣️</span>
              <span className="truncate">Pedro live bol kar samjha raha hai...</span>
            </div>
          )}

          {/* Body: Options List */}
          <div className="p-2.5 space-y-1.5 overflow-y-auto max-h-[50vh] nst-scrollbar-none">
            {/* SUB-OPTIONS VIEW (e.g. Inside Top Bar) */}
            {selectedCategory ? (
              <>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setActiveItemTitle(null);
                    setSpotlightRect(null);
                    setPointerHandPos(null);
                    speakText('Home screen ke doosre options chuniye!');
                  }}
                  className="w-full mb-1 flex items-center gap-1.5 px-3 py-2 rounded-xl text-left bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-purple-200 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Wapas Main Options Pe</span>
                </button>

                {selectedCategory.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all border ${
                      activeItemTitle === item.title
                        ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-400 text-amber-200 shadow-md'
                        : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0">{item.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate leading-snug">{item.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{item.summary}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 shrink-0 ml-1" />
                  </button>
                ))}
              </>
            ) : (
              /* TOP-LEVEL 6 CARDS FOR HOME (OR CURRENT PAGE CATEGORIES) */
              <>
                {pageConfig.categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all border ${
                      activeItemTitle === cat.title
                        ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-purple-400 text-purple-200 shadow-md scale-[1.01]'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-100 active:scale-[0.98]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0">{cat.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate leading-snug">{cat.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{cat.description}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-white/10 text-purple-300 border border-white/10 shrink-0">
                      Dekhein →
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* "Aur kuch jaanna hai" Interactive Prompt Chip */}
            {showAskMoreChip && (
              <div className="pt-2 pb-1 text-center animate-in fade-in zoom-in-95 duration-200">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black">
                  <span>✨</span>
                  <span>Aur kuch jaanna hai? Upar se chuniye!</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ══════════════════ DRAGGABLE FLOATING PEDRO WIDGET ══════════════════
interface FloatingPedroWidgetProps {
  onOpen: () => void;
  currentPageTitle?: string;
  currentPageIcon?: string;
  customRobotName?: string;
  hidden?: boolean;
  isActive?: boolean;
}

export const FloatingPedroWidget: React.FC<FloatingPedroWidgetProps> = ({
  onOpen,
  currentPageTitle = 'Home',
  currentPageIcon = '🏠',
  customRobotName = 'Pedro',
  hidden = false,
  isActive = false
}) => {
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nst_pedro_position');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return parsed;
          }
        }
      } catch {}
      return {
        x: Math.max(10, window.innerWidth - 75),
        y: Math.max(80, window.innerHeight - 150)
      };
    }
    return { x: 280, y: 550 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [isHidden, setIsHidden] = useState(hidden);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0
  });

  useEffect(() => {
    setIsHidden(hidden);
  }, [hidden]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y
    };
    setIsDragging(true);
    setHasMoved(false);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      setHasMoved(true);
    }

    const newX = Math.min(Math.max(10, dragStartRef.current.initX + deltaX), window.innerWidth - 65);
    const newY = Math.min(Math.max(65, dragStartRef.current.initY + deltaY), window.innerHeight - 90);

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}

    // Persist position and notify
    if (typeof window !== 'undefined') {
      localStorage.setItem('nst_pedro_position', JSON.stringify(position));
      window.dispatchEvent(new Event('nst-pedro-pos-change'));
    }

    // Tap detected
    if (!hasMoved) {
      onOpen();
    }
  };

  // Double tap to hide Pedro
  const lastTapRef = useRef<number>(0);
  const handleDoubleTapCheck = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      setIsHidden(true);
    }
    lastTapRef.current = now;
  };

  if (isHidden) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 99998,
        touchAction: 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleDoubleTapCheck}
      className={`group cursor-grab active:cursor-grabbing select-none transition-transform duration-75 ${
        isDragging ? 'scale-110 shadow-2xl opacity-90' : 'hover:scale-105 active:scale-95'
      }`}
      title="Pedro Robot Guide — Tap karke koi bhi feature samjhein (Double tap to hide)"
    >
      {/* Floating Robot Avatar */}
      <div className="relative flex items-center justify-center">
        {/* Outer Glow Halo */}
        <div className={`absolute -inset-1.5 rounded-2xl transition-all duration-300 pointer-events-none ${
          isActive
            ? 'bg-gradient-to-r from-amber-400 via-pink-500 to-violet-500 opacity-100 blur-[8px] animate-pulse'
            : 'bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 opacity-70 blur-[5px] group-hover:opacity-100'
        }`} />

        {/* Robot Body */}
        <div className={`relative w-13 h-13 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 border-2 shadow-2xl flex flex-col items-center justify-center p-1 overflow-visible ${
          isActive ? 'border-amber-400 ring-2 ring-amber-300/60 scale-105' : 'border-pink-400/80'
        }`}>
          {/* Glowing Antenna */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <span className={`w-2.5 h-2.5 rounded-full border border-white ${
              isActive ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-ping' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
            }`} />
            <span className="w-0.5 h-1.5 bg-white/70" />
          </div>

          {/* Robot Screen Face */}
          <div className="w-9 h-7 bg-slate-950 rounded-lg flex flex-col items-center justify-center px-1 border border-cyan-400/60 shadow-inner">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full bg-cyan-300 ${isActive ? 'animate-bounce' : 'animate-pulse'}`} />
              <span className={`w-1.5 h-1.5 rounded-full bg-cyan-300 ${isActive ? 'animate-bounce' : 'animate-pulse'}`} />
            </div>
            <div className={`mt-0.5 bg-cyan-400/80 rounded-full transition-all ${
              isActive ? 'w-3.5 h-1 bg-amber-300' : 'w-3 h-0.5'
            }`} />
          </div>

          {/* Robot Name Label */}
          <span className="text-[9px] font-black text-pink-200 tracking-tighter leading-none mt-0.5 max-w-[48px] truncate">
            {customRobotName || 'Pedro'}
          </span>

          {/* Context Badge */}
          <div className="absolute -bottom-2 px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-purple-400/60 text-[9px] font-extrabold text-purple-700 dark:text-purple-300 shadow-xs flex items-center gap-0.5 whitespace-nowrap">
            <span>{currentPageIcon}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

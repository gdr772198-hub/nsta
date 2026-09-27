// Configuration, Schema, and Data for NSTA Custom Feature Unlock Roadmap Plan

export interface FeatureCustomContent {
  images?: string[];         // Unlimited pictures/screenshots/banners
  videos?: string[];         // Unlimited teaser videos (Cloudinary, mp4, etc.)
  customText?: string;       // Custom descriptive text / Hindi explanation
  customHtml?: string;       // Custom HTML code for advanced layout/banners
  customCss?: string;        // Custom CSS styling scoped to this feature
  badgeText?: string;
  // Admin custom Level & Sub-Level unlock overrides
  customLevel?: number;
  customStageId?: string;
  customStageLabel?: string;
  customMinXpNeeded?: number;
  customStageOrder?: number;
  customTitle?: string;
  customHindiTitle?: string;
  updatedAt?: string;
}

export interface RoadmapStageOption {
  stageId: string;
  stageLabel: string;
  level: number;
  subStage: string;
  minXpNeeded: number;
  stageOrder: number;
  description: string;
}

export const ROADMAP_STAGE_OPTIONS: RoadmapStageOption[] = [
  // Level 1
  { stageId: '1', stageLabel: 'Level 1 (Shuru se Available)', level: 1, subStage: 'Entry (Shuru se)', minXpNeeded: 0, stageOrder: 1.0, description: 'Bina kisi rukawat ke shuru se hi open aur active.' },
  { stageId: '1(i)', stageLabel: 'Level 1 (i)', level: 1, subStage: '(i)', minXpNeeded: 150, stageOrder: 1.1, description: 'Level 1 ka pehla sub-stage milestone.' },
  { stageId: '1(ii)', stageLabel: 'Level 1 (ii)', level: 1, subStage: '(ii)', minXpNeeded: 300, stageOrder: 1.2, description: 'Thoda padhne aur score banane par unlock hota hai.' },
  { stageId: '1(iii)', stageLabel: 'Level 1 (iii)', level: 1, subStage: '(iii)', minXpNeeded: 600, stageOrder: 1.3, description: 'Level 1 ke teesre milestone par unlock hota hai.' },
  { stageId: '1(iv)', stageLabel: 'Level 1 (iv)', level: 1, subStage: '(iv)', minXpNeeded: 750, stageOrder: 1.4, description: 'Level 1 ka chautha sub-stage milestone.' },
  { stageId: '1(v)', stageLabel: 'Level 1 (v)', level: 1, subStage: '(v)', minXpNeeded: 900, stageOrder: 1.5, description: 'Level 1 ka aakhiri sub-stage milestone.' },

  // Level 2
  { stageId: '2(Entry)', stageLabel: 'Level 2 (Entry)', level: 2, subStage: 'Entry', minXpNeeded: 1000, stageOrder: 2.0, description: 'Level 2 me ghuste hi unlock ho jata hai.' },
  { stageId: '2(i)', stageLabel: 'Level 2 (i)', level: 2, subStage: '(i)', minXpNeeded: 1200, stageOrder: 2.1, description: 'Level 2 ka pehla sub-stage milestone.' },
  { stageId: '2(ii)', stageLabel: 'Level 2 (ii)', level: 2, subStage: '(ii)', minXpNeeded: 1350, stageOrder: 2.2, description: 'Level 2 ka dusra sub-stage milestone.' },
  { stageId: '2(iii)', stageLabel: 'Level 2 (iii)', level: 2, subStage: '(iii)', minXpNeeded: 1500, stageOrder: 2.3, description: 'Subject-wise specific schedule aur chapter planning unlock.' },
  { stageId: '2(iv)', stageLabel: 'Level 2 (iv)', level: 2, subStage: '(iv)', minXpNeeded: 1750, stageOrder: 2.4, description: 'Level 2 ka chautha sub-stage milestone.' },
  { stageId: '2(v)', stageLabel: 'Level 2 (v)', level: 2, subStage: '(v)', minXpNeeded: 2000, stageOrder: 2.5, description: 'Level 2 ke aakhiri charan me unlock hoga.' },

  // Level 3
  { stageId: '3(Entry)', stageLabel: 'Level 3 (Entry)', level: 3, subStage: 'Entry', minXpNeeded: 2500, stageOrder: 3.0, description: 'Level 3 me entry par unlock hota hai.' },
  { stageId: '3(i)', stageLabel: 'Level 3 (i)', level: 3, subStage: '(i)', minXpNeeded: 2750, stageOrder: 3.1, description: 'Level 3 ka pehla sub-stage milestone.' },
  { stageId: '3(ii)', stageLabel: 'Level 3 (ii)', level: 3, subStage: '(ii)', minXpNeeded: 3000, stageOrder: 3.2, description: 'Level 3 (ii) milestone unlock.' },
  { stageId: '3(iii)', stageLabel: 'Level 3 (iii)', level: 3, subStage: '(iii)', minXpNeeded: 3500, stageOrder: 3.3, description: 'Level 3 (iii) milestone unlock.' },
  { stageId: '3(iv)', stageLabel: 'Level 3 (iv)', level: 3, subStage: '(iv)', minXpNeeded: 4000, stageOrder: 3.4, description: 'Level 3 (iv) milestone unlock.' },
  { stageId: '3(v)', stageLabel: 'Level 3 (v)', level: 3, subStage: '(v)', minXpNeeded: 4500, stageOrder: 3.5, description: 'Level 3 (v) grand unlock.' },

  // Level 4
  { stageId: '4(Entry)', stageLabel: 'Level 4 (Entry)', level: 4, subStage: 'Entry', minXpNeeded: 5000, stageOrder: 4.0, description: 'Level 4 par entry ke sath unlock hota hai.' },
  { stageId: '4(i)', stageLabel: 'Level 4 (i)', level: 4, subStage: '(i)', minXpNeeded: 6000, stageOrder: 4.1, description: 'Level 4 (i) milestone unlock.' },
  { stageId: '4(ii)', stageLabel: 'Level 4 (ii)', level: 4, subStage: '(ii)', minXpNeeded: 7000, stageOrder: 4.2, description: 'Level 4 (ii) milestone unlock.' },
  { stageId: '4(iii)', stageLabel: 'Level 4 (iii)', level: 4, subStage: '(iii)', minXpNeeded: 8000, stageOrder: 4.3, description: 'Level 4 (iii) milestone unlock.' },
  { stageId: '4(iv)', stageLabel: 'Level 4 (iv)', level: 4, subStage: '(iv)', minXpNeeded: 8500, stageOrder: 4.4, description: 'Level 4 (iv) milestone unlock.' },
  { stageId: '4(v)', stageLabel: 'Level 4 (v)', level: 4, subStage: '(v)', minXpNeeded: 9000, stageOrder: 4.5, description: 'Level 4 (v) milestone unlock.' },

  // Level 5
  { stageId: '5(Entry)', stageLabel: 'Level 5 (Entry)', level: 5, subStage: 'Entry', minXpNeeded: 10000, stageOrder: 5.0, description: 'Level 5 par entry ke sath unlock.' },
  { stageId: '5(i)', stageLabel: 'Level 5 (i)', level: 5, subStage: '(i)', minXpNeeded: 12000, stageOrder: 5.1, description: 'Level 5 (i) milestone unlock.' },
  { stageId: '5(ii)', stageLabel: 'Level 5 (ii)', level: 5, subStage: '(ii)', minXpNeeded: 15000, stageOrder: 5.2, description: 'Level 5 (ii) milestone unlock.' },
  { stageId: '5(iii)', stageLabel: 'Level 5 (iii)', level: 5, subStage: '(iii)', minXpNeeded: 18000, stageOrder: 5.3, description: 'Level 5 (iii) milestone unlock.' },
  { stageId: '5(iv)', stageLabel: 'Level 5 (iv)', level: 5, subStage: '(iv)', minXpNeeded: 20000, stageOrder: 5.4, description: 'Level 5 (iv) milestone unlock.' },
  { stageId: '5(v)', stageLabel: 'Level 5 (v)', level: 5, subStage: '(v)', minXpNeeded: 25000, stageOrder: 5.5, description: 'Level 5 (v) supreme milestone unlock.' },
];

export interface FeatureUnlockItem {
  id: string;
  stageId: string;           // '1', '1(ii)', '1(iii)', '2(Entry)', '2(iii)', '2(v)', '3(Entry)', '3(ii)', '3(iii)', '3(iv)', '3(v)', '4(Entry)', '5(Entry)', '5(i)', '5(ii)', '5(iii)'
  stageLabel: string;        // Display label like 'Level 1 (Shuru se Available)', 'Level 1 (ii)', etc.
  title: string;
  hindiTitle: string;
  description: string;
  iconName: string;
  category: 'primary' | 'secondary' | 'advanced' | 'pro' | 'mastery';
  requiredLevel: number;
  stageOrder: number;        // e.g. 1.0, 1.2, 1.3, 2.0, 2.3, 2.5, 3.0, 3.2, 3.3, 3.4, 3.5, 4.0, 5.0, 5.1, 5.2, 5.3
  minXpNeeded: number;
  images: string[];          // Default/bundled images
  videos: string[];          // Default/bundled videos
  customText?: string;
  customHtml?: string;
  customCss?: string;
  badgeText?: string;
  colorScheme: {
    primary: string;
    border: string;
    bg: string;
    text: string;
  };
}

export interface LevelMilestone {
  level: number;
  title: string;
  hindiTitle: string;
  badge: string;
  emoji: string;
  xpNeeded: number;
  summary: string;
  stages: {
    stageId: string;
    stageLabel: string;
    minXp: number;
    description: string;
    features: FeatureUnlockItem[];
  }[];
  features: FeatureUnlockItem[];
}

export const LEVEL_MILESTONES: LevelMilestone[] = [
  // 🟢 Level 1 (Shuruat se / Beginner)
  {
    level: 1,
    title: 'Beginner Scholar',
    hindiTitle: 'आरंभिक साधक',
    badge: 'LEVEL 1 NOVICE',
    emoji: '🌱',
    xpNeeded: 0,
    summary: 'Shuruat ke jaruri tools: 3-Dot Menu, Redeem Code, Notes Fix, Level Status Bar aur Quick Feature Wheel.',
    stages: [
      {
        stageId: '1',
        stageLabel: 'Level 1 (Shuru se Available)',
        minXp: 0,
        description: 'Bina kisi rukawat ke shuru se hi open aur active.',
        features: [
          {
            id: 'DOT_MENU_3',
            stageId: '1',
            stageLabel: 'Level 1 (Shuru se Available)',
            title: '3-Dot Header Menu',
            hindiTitle: '3-डॉट मुख्य मेनू',
            description: 'Shuru se hi open & visible rahega. Yahan se saari quick settings, download links aur options bina kisi rukawat ke access karein.',
            iconName: 'MoreVertical',
            category: 'primary',
            requiredLevel: 1,
            stageOrder: 1.0,
            minXpNeeded: 0,
            images: [
              'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'ALWAYS OPEN',
            colorScheme: {
              primary: '#10b981',
              border: 'border-emerald-500/30',
              bg: 'bg-emerald-950/20',
              text: 'text-emerald-400',
            },
          },
          {
            id: 'REDEEM_CODE',
            stageId: '1',
            stageLabel: 'Level 1 (Shuru se Available)',
            title: 'Redeem Code Section',
            hindiTitle: 'रिडीम कोड एवं वाउचर',
            description: 'Shuru se hi visible rahega. User Level 1 se hi coupon, gift codes aur promo vouchers redeem karke coins/rewards pa sakta hai.',
            iconName: 'Gift',
            category: 'primary',
            requiredLevel: 1,
            stageOrder: 1.0,
            minXpNeeded: 0,
            images: [
              'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'REDEEM FREE',
            colorScheme: {
              primary: '#f59e0b',
              border: 'border-amber-500/30',
              bg: 'bg-amber-950/20',
              text: 'text-amber-400',
            },
          },
          {
            id: 'NOTES_FIX_BUTTON',
            stageId: '1',
            stageLabel: 'Level 1 (Shuru se Available)',
            title: 'Notes Fix & Errata Report',
            hindiTitle: 'नोट्स सुधार रिपोर्ट बटन',
            description: 'Shuru se kaam karega. Kisi bhi chapter notes me typo, formula ya clarification ki zarurat ho to turant report submit karein.',
            iconName: 'Wrench',
            category: 'primary',
            requiredLevel: 1,
            stageOrder: 1.0,
            minXpNeeded: 0,
            images: [
              'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'ACTIVE NOW',
            colorScheme: {
              primary: '#38bdf8',
              border: 'border-sky-500/30',
              bg: 'bg-sky-950/20',
              text: 'text-sky-400',
            },
          },
        ],
      },
      {
        stageId: '1(ii)',
        stageLabel: 'Level 1 (ii)',
        minXp: 300,
        description: 'Thoda padhne aur score banane par top bar me XP aur Level Status Bar unlock hota hai.',
        features: [
          {
            id: 'LEVEL_STATUS_BAR',
            stageId: '1(ii)',
            stageLabel: 'Level 1 (ii)',
            title: 'Level Status Bar',
            hindiTitle: 'लेवल स्टेटस एवं प्रोग्रेस बार',
            description: 'Top bar me Level Status Bar unlock hoga aur live progress, glowing bindu, current level, aur XP bar dikhne lagega.',
            iconName: 'Zap',
            category: 'primary',
            requiredLevel: 1,
            stageOrder: 1.2,
            minXpNeeded: 300,
            images: [
              'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'STAGE 1(ii)',
            colorScheme: {
              primary: '#818cf8',
              border: 'border-indigo-500/30',
              bg: 'bg-indigo-950/20',
              text: 'text-indigo-400',
            },
          },
        ],
      },
      {
        stageId: '1(iii)',
        stageLabel: 'Level 1 (iii)',
        minXp: 600,
        description: 'Level 1 ke aakhiri milestone par Feature Wheel poori tarah open ho jata hai.',
        features: [
          {
            id: 'FEATURE_WHEEL',
            stageId: '1(iii)',
            stageLabel: 'Level 1 (iii)',
            title: 'NSTA Quick Feature Wheel',
            hindiTitle: 'त्वरित फीचर व्हील',
            description: 'Feature Wheel unlock ho jayega aur iske lagbhag saare features ek circular wheel se turant access ho jayenge.',
            iconName: 'Disc',
            category: 'primary',
            requiredLevel: 1,
            stageOrder: 1.3,
            minXpNeeded: 600,
            images: [
              'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'STAGE 1(iii)',
            colorScheme: {
              primary: '#ec4899',
              border: 'border-pink-500/30',
              bg: 'bg-pink-950/20',
              text: 'text-pink-400',
            },
          },
        ],
      },
    ],
    features: [], // populated below
  },

  // Level 2 (Routine & Progress)
  {
    level: 2,
    title: 'Routine & Progress',
    hindiTitle: 'रूटीन एवं प्रगति साधक',
    badge: 'LEVEL 2 UNLOCK',
    emoji: '🌿',
    xpNeeded: 1000,
    summary: 'My Routine Tab, Student Mailbox, Subject-wise study schedule aur My Syllabus Page ka unlock.',
    stages: [
      {
        stageId: '2(Entry)',
        stageLabel: 'Level 2 (Entry)',
        minXp: 1000,
        description: 'Level 2 me ghuste hi My Routine Tab aur Inbox unlock ho jate hain.',
        features: [
          {
            id: 'MY_ROUTINE_TAB',
            stageId: '2(Entry)',
            stageLabel: 'Level 2 (Entry)',
            title: 'My Routine Tab (Daily Hub)',
            hindiTitle: 'माई रूटीन हब (दैनिक लक्ष्य)',
            description: 'Lock se unlock hoga. Shuru me isme sirf Daily Hub dikhega, baki sab step-by-step unlock hoga.',
            iconName: 'Calendar',
            category: 'secondary',
            requiredLevel: 2,
            stageOrder: 2.0,
            minXpNeeded: 1000,
            images: [
              'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'DAILY HUB',
            colorScheme: {
              primary: '#06b6d4',
              border: 'border-cyan-500/30',
              bg: 'bg-cyan-950/20',
              text: 'text-cyan-400',
            },
          },
          {
            id: 'MAILBOX_INBOX',
            stageId: '2(Entry)',
            stageLabel: 'Level 2 (Entry)',
            title: 'Student Mailbox & Inbox',
            hindiTitle: 'विद्यार्थी मेलबॉक्स / इनबॉक्स',
            description: 'Level 2 par aayega aur unlock hoga. Admin se milne wale direct alerts, bonus coins aur messages yahan read karein.',
            iconName: 'Mail',
            category: 'secondary',
            requiredLevel: 2,
            stageOrder: 2.0,
            minXpNeeded: 1000,
            images: [
              'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'INBOX OPEN',
            colorScheme: {
              primary: '#3b82f6',
              border: 'border-blue-500/30',
              bg: 'bg-blue-950/20',
              text: 'text-blue-400',
            },
          },
        ],
      },
      {
        stageId: '2(iii)',
        stageLabel: 'Level 2 (iii)',
        minXp: 1500,
        description: 'Subject-wise specific schedule aur chapter planning unlock.',
        features: [
          {
            id: 'ROUTINE_SUBJECT_PAGE',
            stageId: '2(iii)',
            stageLabel: 'Level 2 (iii)',
            title: 'Routine Subject-wise Page',
            hindiTitle: 'रूटीन विषय-वार योजना',
            description: 'My Routine ke andar subject wala section unlock hoga jahan har subject ka revision balance set kiya ja sakta hai.',
            iconName: 'BookOpen',
            category: 'secondary',
            requiredLevel: 2,
            stageOrder: 2.3,
            minXpNeeded: 1500,
            images: [
              'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'STAGE 2(iii)',
            colorScheme: {
              primary: '#10b981',
              border: 'border-emerald-500/30',
              bg: 'bg-emerald-950/20',
              text: 'text-emerald-400',
            },
          },
        ],
      },
      {
        stageId: '2(v)',
        stageLabel: 'Level 2 (v)',
        minXp: 2000,
        description: 'Level 2 ke aakhiri charan me My Syllabus Page unlock hoga aur My Routine poori tarah open ho jayega.',
        features: [
          {
            id: 'MY_SYLLABUS_PAGE',
            stageId: '2(v)',
            stageLabel: 'Level 2 (v)',
            title: 'My Syllabus Page',
            hindiTitle: 'माई सिलेबस संपूर्ण रोडमैप',
            description: 'My Syllabus Page unlock hoga. Yani Level 2 ke last tak My Routine poori tarah se open ho jayega.',
            iconName: 'Compass',
            category: 'secondary',
            requiredLevel: 2,
            stageOrder: 2.5,
            minXpNeeded: 2000,
            images: [
              'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'FULL ROUTINE',
            colorScheme: {
              primary: '#f97316',
              border: 'border-orange-500/30',
              bg: 'bg-orange-950/20',
              text: 'text-orange-400',
            },
          },
        ],
      },
    ],
    features: [],
  },

  // Level 3 (Community, PRO+ & Pedro)
  {
    level: 3,
    title: 'Community, PRO+ & Pedro',
    hindiTitle: 'कम्युनिटी, प्रो+ एवं पेड्रो AI',
    badge: 'LEVEL 3 UNLOCK',
    emoji: '⚡',
    xpNeeded: 2500,
    summary: 'Revision Hub, Official Community, Bug Report, PRO+ Daily Challenge, Doubts, Messenger, Study Room, Notes Tracker aur Pedro AI Assistant.',
    stages: [
      {
        stageId: '3(Entry)',
        stageLabel: 'Level 3 (Entry)',
        minXp: 2500,
        description: 'Level 3 me entry par Revision Hub aur Community ka Official Page unlock hota hai.',
        features: [
          {
            id: 'REVISION_HUB',
            stageId: '3(Entry)',
            stageLabel: 'Level 3 (Entry)',
            title: 'Smart Revision Hub',
            hindiTitle: 'स्मार्ट पुनरावृत्ति हब',
            description: 'Revision Hub unlock ho jayega. Spaced repetition engine aapke weak points ko time par surface karega.',
            iconName: 'BrainCircuit',
            category: 'advanced',
            requiredLevel: 3,
            stageOrder: 3.0,
            minXpNeeded: 2500,
            images: [
              'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'REVISION OPEN',
            colorScheme: {
              primary: '#8b5cf6',
              border: 'border-purple-500/30',
              bg: 'bg-purple-950/20',
              text: 'text-purple-400',
            },
          },
          {
            id: 'COMMUNITY_OFFICIAL',
            stageId: '3(Entry)',
            stageLabel: 'Level 3 (Entry)',
            title: 'Community (Official Page)',
            hindiTitle: 'कम्युनिटी ऑफिशियल पेज',
            description: 'Community unlock hoga (Lekin isme shuru me sirf Official Page hi dikhega, jisme official announcements hongi).',
            iconName: 'Globe',
            category: 'advanced',
            requiredLevel: 3,
            stageOrder: 3.0,
            minXpNeeded: 2500,
            images: [
              'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'OFFICIAL FEED',
            colorScheme: {
              primary: '#0ea5e9',
              border: 'border-sky-500/30',
              bg: 'bg-sky-950/20',
              text: 'text-sky-400',
            },
          },
        ],
      },
      {
        stageId: '3(ii)',
        stageLabel: 'Level 3 (ii)',
        minXp: 3000,
        description: 'Community Bug Report section unlock.',
        features: [
          {
            id: 'COMMUNITY_BUG_REPORT',
            stageId: '3(ii)',
            stageLabel: 'Level 3 (ii)',
            title: 'Community Bug Report',
            hindiTitle: 'कम्युनिटी बग रिपोर्ट',
            description: 'Bug report section unlock hoga. Kisi bhi technical problem ya feedback ko direct team ke paas raise karein.',
            iconName: 'ShieldAlert',
            category: 'advanced',
            requiredLevel: 3,
            stageOrder: 3.2,
            minXpNeeded: 3000,
            images: [
              'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'STAGE 3(ii)',
            colorScheme: {
              primary: '#ef4444',
              border: 'border-rose-500/30',
              bg: 'bg-rose-950/20',
              text: 'text-rose-400',
            },
          },
        ],
      },
      {
        stageId: '3(iii)',
        stageLabel: 'Level 3 (iii)',
        minXp: 3500,
        description: 'PRO+ Page (Daily Challenge) aur Community Doubt Page unlock.',
        features: [
          {
            id: 'PRO_PLUS_PAGE',
            stageId: '3(iii)',
            stageLabel: 'Level 3 (iii)',
            title: 'PRO+ Page (Daily Challenge)',
            hindiTitle: 'प्रो+ पेज (दैनिक मुकाबला)',
            description: 'PRO+ Page unlock hoga (Isme abhi sirf Daily Challenge dikhega jahan har din naye tests aayenge).',
            iconName: 'Flame',
            category: 'pro',
            requiredLevel: 3,
            stageOrder: 3.3,
            minXpNeeded: 3500,
            images: [
              'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'PRO+ CHALLENGE',
            colorScheme: {
              primary: '#f59e0b',
              border: 'border-amber-500/30',
              bg: 'bg-amber-950/20',
              text: 'text-amber-400',
            },
          },
          {
            id: 'COMMUNITY_DOUBT_PAGE',
            stageId: '3(iii)',
            stageLabel: 'Level 3 (iii)',
            title: 'Community Doubt Page',
            hindiTitle: 'कम्युनिटी शंका समाधान',
            description: 'Students ke doubt puchne ka page unlock hoga. Sawal daaliye aur saathi chhatron aur teachers se solutions paayein.',
            iconName: 'HelpCircle',
            category: 'advanced',
            requiredLevel: 3,
            stageOrder: 3.3,
            minXpNeeded: 3500,
            images: [
              'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'DOUBTS OPEN',
            colorScheme: {
              primary: '#14b8a6',
              border: 'border-teal-500/30',
              bg: 'bg-teal-950/20',
              text: 'text-teal-400',
            },
          },
        ],
      },
      {
        stageId: '3(iv)',
        stageLabel: 'Level 3 (iv)',
        minXp: 4000,
        description: 'Community Post, My Posts page aur NSTA Messenger chat unlock.',
        features: [
          {
            id: 'COMMUNITY_POSTS',
            stageId: '3(iv)',
            stageLabel: 'Level 3 (iv)',
            title: 'Community Post & My Posts',
            hindiTitle: 'कम्युनिटी पोस्ट एवं प्रोफाइल पोस्ट',
            description: 'Community me naya post karne ka option aur "My Posts" page unlock hoga.',
            iconName: 'Newspaper',
            category: 'advanced',
            requiredLevel: 3,
            stageOrder: 3.4,
            minXpNeeded: 4000,
            images: [
              'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'POST CREATION',
            colorScheme: {
              primary: '#6366f1',
              border: 'border-indigo-500/30',
              bg: 'bg-indigo-950/20',
              text: 'text-indigo-400',
            },
          },
          {
            id: 'NSTA_MESSENGER',
            stageId: '3(iv)',
            stageLabel: 'Level 3 (iv)',
            title: 'NSTA Messenger',
            hindiTitle: 'एनएसटीए मैसेंजर चैट',
            description: 'Messenger chat feature unlock hoga. Dusre students ke sath study discussions aur updates share karein.',
            iconName: 'MessageSquare',
            category: 'advanced',
            requiredLevel: 3,
            stageOrder: 3.4,
            minXpNeeded: 4000,
            images: [
              'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'MESSENGER',
            colorScheme: {
              primary: '#10b981',
              border: 'border-emerald-500/30',
              bg: 'bg-emerald-950/20',
              text: 'text-emerald-400',
            },
          },
        ],
      },
      {
        stageId: '3(v)',
        stageLabel: 'Level 3 (v)',
        minXp: 4500,
        description: 'Study Room, Notes Fix Tracker aur Pedro AI Assistant ka grand unlock.',
        features: [
          {
            id: 'STUDY_ROOM',
            stageId: '3(v)',
            stageLabel: 'Level 3 (v)',
            title: 'Virtual Study Room (PRO+)',
            hindiTitle: 'वर्चुअल स्टडी रूम',
            description: 'PRO+ ke andar Study Room unlock hoga jahan focused ambience me padhai ki ja sakegi.',
            iconName: 'Users2',
            category: 'pro',
            requiredLevel: 3,
            stageOrder: 3.5,
            minXpNeeded: 4500,
            images: [
              'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'STUDY ROOM',
            colorScheme: {
              primary: '#38bdf8',
              border: 'border-sky-500/30',
              bg: 'bg-sky-950/20',
              text: 'text-sky-400',
            },
          },
          {
            id: 'NOTES_FIX_TRACKER',
            stageId: '3(v)',
            stageLabel: 'Level 3 (v)',
            title: 'Notes Fix Status Tracker',
            hindiTitle: 'नोट्स सुधार स्टेटस ट्रैकर',
            description: 'Ab student dekh sakega ki uska note fix hua ya nahi, kitni reports aayi hain, status kya hai.',
            iconName: 'CheckCircle2',
            category: 'advanced',
            requiredLevel: 3,
            stageOrder: 3.5,
            minXpNeeded: 4500,
            images: [
              'https://images.unsplash.com/photo-1508962914676-134849a727f0?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'TRACKER',
            colorScheme: {
              primary: '#06b6d4',
              border: 'border-cyan-500/30',
              bg: 'bg-cyan-950/20',
              text: 'text-cyan-400',
            },
          },
          {
            id: 'PEDRO_AI_ASSISTANT',
            stageId: '3(v)',
            stageLabel: 'Level 3 (v)',
            title: 'Pedro AI Assistant & 3D Companion',
            hindiTitle: 'पेड्रो AI सहायक एवं 3D रोबोट',
            description: 'Pedro AI Assistant unlock hoga! Voice assistance, motivation, doubts resolution aur daily guidance.',
            iconName: 'Bot',
            category: 'pro',
            requiredLevel: 3,
            stageOrder: 3.5,
            minXpNeeded: 4500,
            images: [
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'PEDRO AI',
            colorScheme: {
              primary: '#a855f7',
              border: 'border-purple-500/30',
              bg: 'bg-purple-950/20',
              text: 'text-purple-400',
            },
          },
        ],
      },
    ],
    features: [],
  },

  // Level 4 (Demand & Advanced Access)
  {
    level: 4,
    title: 'Demand & Advanced Access',
    hindiTitle: 'डिमांड एवं विशेष अधिकार',
    badge: 'LEVEL 4 UNLOCK',
    emoji: '🔥',
    xpNeeded: 5000,
    summary: 'Content Demand Feature: Direct syllabus aur study material request bhej sakein.',
    stages: [
      {
        stageId: '4(Entry)',
        stageLabel: 'Level 4 (Entry)',
        minXp: 5000,
        description: 'Level 4 par Content Demand feature unlock hota hai.',
        features: [
          {
            id: 'CONTENT_DEMAND',
            stageId: '4(Entry)',
            stageLabel: 'Level 4 (Entry)',
            title: 'Content Demand Feature',
            hindiTitle: 'कंटेंट डिमांड रिक्वेस्ट',
            description: 'User content demand request bhej sakega. Naye notes, important MCQs ya kisi vishisht topic ki request daalein.',
            iconName: 'Send',
            category: 'pro',
            requiredLevel: 4,
            stageOrder: 4.0,
            minXpNeeded: 5000,
            images: [
              'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'DEMAND OPEN',
            colorScheme: {
              primary: '#f97316',
              border: 'border-orange-500/30',
              bg: 'bg-orange-950/20',
              text: 'text-orange-400',
            },
          },
        ],
      },
    ],
    features: [],
  },

  // 🟣 Level 5 (Mastery, Battles & Events)
  {
    level: 5,
    title: 'Mastery, Battles & Events',
    hindiTitle: 'महारथी, बैटल्स एवं इवेंट्स',
    badge: 'LEVEL 5 SUPREME',
    emoji: '👑',
    xpNeeded: 10000,
    summary: 'MCQ Official Hub, Live MCQ Battles, PRO+ Events Page (Level-wise preview) aur Detailed Score History.',
    stages: [
      {
        stageId: '5(Entry)',
        stageLabel: 'Level 5 (Entry)',
        minXp: 10000,
        description: 'Level 5 par Official MCQs ka poora hub unlock.',
        features: [
          {
            id: 'MCQ_OFFICIAL_HUB',
            stageId: '5(Entry)',
            stageLabel: 'Level 5 (Entry)',
            title: 'MCQ Official Hub',
            hindiTitle: 'ऑफिशियल एमसीक्यू हब',
            description: 'Official MCQs unlock honge. High standard board aur competition questions ka verified pool.',
            iconName: 'CheckCircle2',
            category: 'mastery',
            requiredLevel: 5,
            stageOrder: 5.0,
            minXpNeeded: 10000,
            images: [
              'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'OFFICIAL MCQs',
            colorScheme: {
              primary: '#10b981',
              border: 'border-emerald-500/30',
              bg: 'bg-emerald-950/20',
              text: 'text-emerald-400',
            },
          },
        ],
      },
      {
        stageId: '5(i)',
        stageLabel: 'Level 5 (i)',
        minXp: 12000,
        description: 'Live 1v1 aur multiplayer MCQ battles unlock.',
        features: [
          {
            id: 'MCQ_BATTLE',
            stageId: '5(i)',
            stageLabel: 'Level 5 (i)',
            title: 'MCQ Battle Simulator',
            hindiTitle: 'लाइव एमसीक्यू मुकाबला',
            description: 'Students ke live MCQ battles unlock honge. Real-time quiz speed test me ek dusre ko challenge karein.',
            iconName: 'Swords',
            category: 'mastery',
            requiredLevel: 5,
            stageOrder: 5.1,
            minXpNeeded: 12000,
            images: [
              'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'LIVE BATTLES',
            colorScheme: {
              primary: '#e11d48',
              border: 'border-rose-500/30',
              bg: 'bg-rose-950/20',
              text: 'text-rose-400',
            },
          },
        ],
      },
      {
        stageId: '5(ii)',
        stageLabel: 'Level 5 (ii)',
        minXp: 15000,
        description: 'Events Page (PRO+ ke andar) par saare events dikhenge, par jo event jis level par set hai tabhi chalega.',
        features: [
          {
            id: 'EVENTS_PAGE_PRO',
            stageId: '5(ii)',
            stageLabel: 'Level 5 (ii)',
            title: 'Events Page (PRO+ Showcase)',
            hindiTitle: 'इवेंट्स पेज (लेवल आधारित)',
            description: 'Events Page (PRO+ ke andar): Events page par saare events dikhenge, par jo event jis level par set hai wo tabhi chalega (Level-wise locked/unlocked preview ke sath).',
            iconName: 'Trophy',
            category: 'mastery',
            requiredLevel: 5,
            stageOrder: 5.2,
            minXpNeeded: 15000,
            images: [
              'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'PRO+ EVENTS',
            colorScheme: {
              primary: '#f59e0b',
              border: 'border-amber-500/30',
              bg: 'bg-amber-950/20',
              text: 'text-amber-400',
            },
          },
        ],
      },
      {
        stageId: '5(iii)',
        stageLabel: 'Level 5 (iii)',
        minXp: 18000,
        description: 'Detailed past score history aur analytics unlock.',
        features: [
          {
            id: 'SCORE_HISTORY',
            stageId: '5(iii)',
            stageLabel: 'Level 5 (iii)',
            title: 'Detailed Score History',
            hindiTitle: 'विस्तृत स्कोर इतिहास',
            description: 'Student ka detailed past score history unlock ho jayega jahan har test, quiz aur chapter performance record dekh sakte hain.',
            iconName: 'BarChart3',
            category: 'mastery',
            requiredLevel: 5,
            stageOrder: 5.3,
            minXpNeeded: 18000,
            images: [
              'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
            ],
            videos: [],
            badgeText: 'SCORE HISTORY',
            colorScheme: {
              primary: '#8b5cf6',
              border: 'border-purple-500/30',
              bg: 'bg-purple-950/20',
              text: 'text-purple-400',
            },
          },
        ],
      },
    ],
    features: [],
  },
];

// Populate flat `features` array inside each milestone for backwards compatibility
LEVEL_MILESTONES.forEach(milestone => {
  milestone.features = milestone.stages.flatMap(s => s.features);
});

// All features flattened
export const ALL_ROADMAP_FEATURES: FeatureUnlockItem[] = LEVEL_MILESTONES.flatMap(m => m.features);

// LocalStorage key for admin-managed feature customization
export const ROADMAP_CUSTOM_STORAGE_KEY = 'nsta_roadmap_custom_content';

/**
 * Reads custom media/content for all features
 */
export const getAllRoadmapCustomContent = (): Record<string, FeatureCustomContent> => {
  try {
    const raw = localStorage.getItem(ROADMAP_CUSTOM_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};

    // Backward compatibility with legacy video storage
    const legacyVideosRaw = localStorage.getItem('nsta_feature_video_urls');
    if (legacyVideosRaw) {
      try {
        const legacyVideos = JSON.parse(legacyVideosRaw);
        Object.keys(legacyVideos).forEach(fId => {
          if (!parsed[fId]) parsed[fId] = {};
          if (!parsed[fId].videos || parsed[fId].videos.length === 0) {
            parsed[fId].videos = [legacyVideos[fId]];
          }
        });
      } catch {}
    }

    return parsed;
  } catch {
    return {};
  }
};

/**
 * Returns merged feature data with admin-customized level, sub-level/stage, XP, images, videos, text, HTML, and CSS
 */
export const getEffectiveFeatureItem = (base: FeatureUnlockItem): FeatureUnlockItem => {
  const allCustom = getAllRoadmapCustomContent();
  const custom = allCustom[base.id];
  if (!custom) return base;

  const matchedStage = custom.customStageId
    ? ROADMAP_STAGE_OPTIONS.find(s => s.stageId === custom.customStageId)
    : undefined;

  const effectiveLevel = custom.customLevel !== undefined
    ? Number(custom.customLevel)
    : (matchedStage ? matchedStage.level : base.requiredLevel);

  const effectiveStageId = custom.customStageId || base.stageId;
  const effectiveStageLabel = custom.customStageLabel || (matchedStage ? matchedStage.stageLabel : base.stageLabel);
  const effectiveMinXp = custom.customMinXpNeeded !== undefined
    ? Number(custom.customMinXpNeeded)
    : (matchedStage ? matchedStage.minXpNeeded : base.minXpNeeded);
  const effectiveStageOrder = custom.customStageOrder !== undefined
    ? Number(custom.customStageOrder)
    : (matchedStage ? matchedStage.stageOrder : base.stageOrder);

  return {
    ...base,
    title: custom.customTitle || base.title,
    hindiTitle: custom.customHindiTitle || base.hindiTitle,
    requiredLevel: effectiveLevel,
    stageId: effectiveStageId,
    stageLabel: effectiveStageLabel,
    minXpNeeded: effectiveMinXp,
    stageOrder: effectiveStageOrder,
    images: (custom.images && custom.images.length > 0) ? custom.images : base.images,
    videos: (custom.videos && custom.videos.length > 0) ? custom.videos : base.videos,
    customText: custom.customText !== undefined ? custom.customText : base.customText,
    customHtml: custom.customHtml !== undefined ? custom.customHtml : base.customHtml,
    customCss: custom.customCss !== undefined ? custom.customCss : base.customCss,
    badgeText: custom.badgeText || base.badgeText,
  };
};

/**
 * Look up a feature by ID with all Admin overrides applied
 */
export const getEffectiveFeatureById = (featureId: string): FeatureUnlockItem | undefined => {
  const base = ALL_ROADMAP_FEATURES.find(f => f.id === featureId);
  if (!base) return undefined;
  return getEffectiveFeatureItem(base);
};

/**
 * Dynamically builds Level Milestones with all Admin Level & Sub-Level overrides applied
 */
export const getEffectiveLevelMilestones = (): LevelMilestone[] => {
  const effectiveFeatures = ALL_ROADMAP_FEATURES.map(f => getEffectiveFeatureItem(f));

  // Collect all levels present in base milestones + any custom levels set by admin
  const baseLevels = LEVEL_MILESTONES.map(m => m.level);
  const customLevels = effectiveFeatures.map(f => f.requiredLevel);
  const allLevels = Array.from(new Set([...baseLevels, ...customLevels])).sort((a, b) => a - b);

  return allLevels.map(levelNum => {
    const baseMilestone = LEVEL_MILESTONES.find(m => m.level === levelNum);
    const levelFeatures = effectiveFeatures
      .filter(f => f.requiredLevel === levelNum)
      .sort((a, b) => (a.stageOrder - b.stageOrder) || (a.minXpNeeded - b.minXpNeeded));

    // Group features by stageId
    const stageMap = new Map<string, {
      stageId: string;
      stageLabel: string;
      minXp: number;
      stageOrder: number;
      description: string;
      features: FeatureUnlockItem[];
    }>();

    // Pre-seed base stages so order & descriptions are preserved if they have features
    if (baseMilestone) {
      baseMilestone.stages.forEach(bs => {
        const opt = ROADMAP_STAGE_OPTIONS.find(o => o.stageId === bs.stageId);
        stageMap.set(bs.stageId, {
          stageId: bs.stageId,
          stageLabel: bs.stageLabel,
          minXp: bs.minXp,
          stageOrder: opt ? opt.stageOrder : levelNum,
          description: bs.description,
          features: [],
        });
      });
    }

    levelFeatures.forEach(feat => {
      const existing = stageMap.get(feat.stageId);
      if (existing) {
        existing.features.push(feat);
        if (feat.stageLabel) existing.stageLabel = feat.stageLabel;
        existing.minXp = feat.minXpNeeded;
      } else {
        const opt = ROADMAP_STAGE_OPTIONS.find(o => o.stageId === feat.stageId);
        stageMap.set(feat.stageId, {
          stageId: feat.stageId,
          stageLabel: feat.stageLabel || opt?.stageLabel || `Level ${levelNum} (${feat.stageId})`,
          minXp: feat.minXpNeeded,
          stageOrder: feat.stageOrder || opt?.stageOrder || levelNum,
          description: opt?.description || `Level ${levelNum} custom unlock stage.`,
          features: [feat],
        });
      }
    });

    const stages = Array.from(stageMap.values())
      .filter(s => s.features.length > 0)
      .sort((a, b) => (a.stageOrder - b.stageOrder) || (a.minXp - b.minXp))
      .map(({ stageOrder, ...rest }) => rest);

    if (baseMilestone) {
      return {
        ...baseMilestone,
        stages,
        features: levelFeatures,
      };
    }

    // Fallback metadata if admin assigned a feature to a level > 5
    return {
      level: levelNum,
      title: `Level ${levelNum} Milestone`,
      hindiTitle: `लेवल ${levelNum} विशेष फीचर्स`,
      badge: `LEVEL ${levelNum} UNLOCK`,
      emoji: '🌟',
      xpNeeded: levelFeatures[0]?.minXpNeeded || levelNum * 2500,
      summary: `Admin dwara Level ${levelNum} par set kiye gaye features.`,
      stages,
      features: levelFeatures,
    };
  });
};

/**
 * Checks if a specific feature is unlocked for a user based on level, XP, and role
 * Respects Admin custom Level & Sub-Level overrides!
 */
export const isFeatureUnlockedForUser = (
  featureId: string,
  userLevel: number,
  userXp: number = 0,
  userRole?: string
): boolean => {
  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
    return true;
  }

  const rawFeature = ALL_ROADMAP_FEATURES.find(f => f.id === featureId);
  if (!rawFeature) {
    // If not in roadmap, default to unlocked
    return true;
  }

  const feature = getEffectiveFeatureItem(rawFeature);

  // 1. If user level is strictly higher than required level, unlocked!
  if (userLevel > feature.requiredLevel) {
    return true;
  }

  // 2. If user level is strictly lower, locked!
  if (userLevel < feature.requiredLevel) {
    return false;
  }

  // 3. User is at the required level: check stage requirements
  // Entry stages (e.g. 1, 2(Entry), 3(Entry), 4(Entry), 5(Entry)) or 0 minXpNeeded are unlocked immediately upon entering level
  if (feature.stageId === '1' || feature.stageId.includes('Entry') || feature.minXpNeeded <= 0) {
    return true;
  }

  // Sub-stages check minXpNeeded
  if (userXp >= feature.minXpNeeded) {
    return true;
  }

  return false;
};

/**
 * Simple level-only unlock check (backwards compatibility)
 */
export const isFeatureUnlockedForLevel = (featureId: string, currentLevel: number): boolean => {
  const rawFeature = ALL_ROADMAP_FEATURES.find(f => f.id === featureId);
  if (!rawFeature) return true;
  const feature = getEffectiveFeatureItem(rawFeature);
  return currentLevel >= feature.requiredLevel;
};

/**
 * Get features unlocked specifically at a given level (respecting Admin overrides)
 */
export const getFeaturesUnlockedAtLevel = (level: number): FeatureUnlockItem[] => {
  const milestones = getEffectiveLevelMilestones();
  const milestone = milestones.find(m => m.level === level);
  return milestone ? milestone.features : [];
};

import type { InterstitialConfig } from "./onboarding";

const VIDEO_URL =
  "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Assets/DNA%20HD.mp4";

const CAQ_TOTAL_DOTS = 16;

export const CAQ_INTERSTITIALS: InterstitialConfig[] = [

  // ═══ C1: Before Phase 1 — Demographics ═══
  {
    id: "caq-intro",
    quote: "The more we know, the smarter your protocol gets.",
    subtext: "Phase 1 of 7 \u2014 Demographics & Biodata",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #1A2744 0%, #2DA5A0 100%)", overlayOpacity: 0.40 },
    dotPosition: 1,
    totalDots: CAQ_TOTAL_DOTS,
  },

  // ═══ C2: Before Phase 2 — Health Concerns & Family History ═══
  {
    id: "caq-concerns",
    quote: "Now let\u2019s talk about what brought you here \u2014 your health, your family, your goals.",
    subtext: "Phase 2 of 7 \u2014 Health Concerns & Family History",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #1A2744 0%, #2C3E5A 50%, #2DA5A0 100%)", overlayOpacity: 0.38 },
    featureCard: { category: "WHY THIS MATTERS", title: "Family History \u00d7 Genomics", description: "Your family\u2019s health patterns are early signals of genetic risk. Combined with GENEX360, they help us prioritize what to screen and what to protect." },
    dotPosition: 3,
    totalDots: CAQ_TOTAL_DOTS,
  },

  // ═══ C3: Before Phase 3 — Physical & Energy Symptoms ═══
  {
    id: "caq-physical-symptoms",
    quote: "Your body keeps a running score. Let\u2019s read it together.",
    subtext: "Phase 3 of 7 \u2014 Physical & Energy Symptoms",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #1A2744 0%, #2DA5A0 100%)", overlayOpacity: 0.38 },
    dotPosition: 5,
    totalDots: CAQ_TOTAL_DOTS,
  },

  // ═══ C4: Before Phase 4 — Neurological & Cognitive Symptoms ═══
  {
    id: "caq-neuro-symptoms",
    quote: "Your brain is the command center. Understanding how it\u2019s performing changes everything.",
    subtext: "Phase 4 of 7 \u2014 Neurological & Cognitive Symptoms",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #1A2744 0%, #2C3E5A 100%)", overlayOpacity: 0.42 },
    featureCard: { category: "COGNITIVE MAPPING", title: "Brain-Body Connection", description: "Brain fog, poor sleep, and memory issues often share root causes with nutrient deficiencies. We trace those connections." },
    dotPosition: 7,
    totalDots: CAQ_TOTAL_DOTS,
  },

  // ═══ C5: Before Phase 5 — Emotional & Systemic Symptoms ═══
  {
    id: "caq-emotional-symptoms",
    quote: "Mood, immunity, and hormones are more connected than you think. Let\u2019s map the full picture.",
    subtext: "Phase 5 of 7 \u2014 Emotional & Systemic Symptoms",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #2DA5A0 0%, #1A2744 100%)", overlayOpacity: 0.36 },
    dotPosition: 9,
    totalDots: CAQ_TOTAL_DOTS,
  },

  // ═══ C6: Before Phase 6 — Medications, Supplements & Allergies ═══
  {
    id: "caq-medications",
    quote: "What you take matters. What you take it with matters more.",
    subtext: "Phase 6 of 7 \u2014 Medications, Supplements & Allergies",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #1A2744 0%, #0F1B2E 100%)", overlayOpacity: 0.40 },
    featureCard: { category: "SAFETY ENGINE", title: "Real-Time Interaction Checking", description: "Every medication and supplement you add is checked against 14,000+ known interactions in real-time. Your safety is never an afterthought." },
    dotPosition: 11,
    totalDots: CAQ_TOTAL_DOTS,
  },

  // ═══ C7: Before Phase 7 — Lifestyle & Functional Assessment ═══
  {
    id: "caq-lifestyle",
    quote: "Sleep, stress, movement, mood \u2014 these shape your biology more than most realize.",
    subtext: "Phase 7 of 7 \u2014 Lifestyle & Functional Assessment",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #1A2744 0%, #3D2B1F 100%)", overlayOpacity: 0.30 },
    featureCard: { category: "LIFESTYLE \u00d7 GENOMICS", title: "Your Life Meets Your DNA", description: "Your lifestyle patterns interact with your genetic variants. We map both to build protocols that fit your actual life." },
    dotPosition: 13,
    totalDots: CAQ_TOTAL_DOTS,
  },

  // ═══ P1: Assessment Complete 🎉 ═══
  {
    id: "caq-complete",
    quote: "You\u2019ve just given us everything we need. Let\u2019s build something incredible.",
    subtext: "Assessment Complete \u2014 Analyzing your responses...",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #B8860B 0%, #2DA5A0 100%)", overlayOpacity: 0.25 },
    dotPosition: 15,
    totalDots: CAQ_TOTAL_DOTS,
  },

  // ═══ P2: Before Packages Page ═══
  {
    id: "packages-intro",
    quote: "Every journey needs the right foundation. Choose the plan that matches your ambition.",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #1A2744 0%, #0F1B2E 100%)", overlayOpacity: 0.40 },
    featureCard: { category: "UNLOCK MORE", title: "Gold & Platinum Benefits", description: "Deeper AI analysis, priority practitioner access, and Helix Rewards\u2122 at up to 5x earn rate. Your protocol. Your pace. Your plan." },
    dotPosition: 0,
    totalDots: 0,
  },

  // ═══ P3: Welcome to Dashboard ═══
  {
    id: "welcome-dashboard",
    quote: "DYNAMIC",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #2DA5A0 0%, #1A2744 100%)", overlayOpacity: 0.35 },
    dotPosition: 0,
    totalDots: 0,
  },
];

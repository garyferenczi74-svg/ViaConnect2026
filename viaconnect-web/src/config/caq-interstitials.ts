import type { InterstitialConfig } from "./onboarding";

// Prompt 173 + 173b reorder (2026-06-03): CAQ interstitials are now bound to
// their semantic phase id, not to a numeric position (173b §1). The render
// order below mirrors the new canonical phase order in caq-phase-order.ts:
//   1 Demographics, 2 Lifestyle & Goals, 3 Health Concerns & Family History,
//   4 Physical Symptoms, 5 Neuro Symptoms, 6 Emotional Symptoms,
//   7 Medications, Supplements & Allergies.
//
// The C6 medications quote stays attached to phase_meds_supps and the C7
// lifestyle quote stays attached to phase_lifestyle wherever those phases
// sit; the array order is the only thing that changes when phases reorder.
// 173b §0 item 1 ratified: "Lifestyle & Functional Assessment" retired in
// favor of "Lifestyle & Goals". 173b §0 item 2 ratified: teaser lines render
// on the interstitial card (the `quote` field, above the kicker featureCard).

const VIDEO_URL =
  "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Assets/DNA%20HD.mp4";

const CAQ_TOTAL_DOTS = 16;

export const CAQ_INTERSTITIALS: InterstitialConfig[] = [

  // C1: Before Phase 1, Demographics & Biodata
  {
    id: "caq-intro",
    phaseId: "phase_demographics",
    quote: "The more we know, the smarter your protocol gets.",
    subtext: "Phase 1 of 7 | Demographics & Biodata",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #1A2744 0%, #2DA5A0 100%)", overlayOpacity: 0.40 },
    dotPosition: 1,
    totalDots: CAQ_TOTAL_DOTS,
  },

  // C7 (relocated): Before Phase 2, Lifestyle & Goals. 173b §3.1 locked.
  // Teaser quote + LIFESTYLE x GENOMICS kicker carry the phase; the multiplication
  // sign in the kicker is intentional and preserved per the 173b §0 note.
  {
    id: "caq-lifestyle",
    phaseId: "phase_lifestyle",
    quote: "Sleep, stress, movement, mood. These shape your biology more than most realize.",
    subtext: "Phase 2 of 7 | Lifestyle & Goals",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #1A2744 0%, #3D2B1F 100%)", overlayOpacity: 0.30 },
    featureCard: { category: "LIFESTYLE × GENOMICS", title: "Your Life Meets Your DNA", description: "Your lifestyle patterns interact with your genetic variants. We map both to build protocols that fit your actual life." },
    dotPosition: 3,
    totalDots: CAQ_TOTAL_DOTS,
  },

  // C2 (relocated): Before Phase 3, Health Concerns & Family History. 173b §3.2 locked.
  {
    id: "caq-concerns",
    phaseId: "phase_family_history",
    quote: "Now let’s talk about what brought you here. Your health, your family, your goals.",
    subtext: "Phase 3 of 7 | Health Concerns & Family History",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #1A2744 0%, #2C3E5A 50%, #2DA5A0 100%)", overlayOpacity: 0.38 },
    featureCard: { category: "WHY THIS MATTERS", title: "Family History × Genomics", description: "Your family’s health patterns are early signals of genetic risk. Combined with GENEX360, they help us prioritize what to screen and what to protect." },
    dotPosition: 5,
    totalDots: CAQ_TOTAL_DOTS,
  },

  // C3 (relocated): Before Phase 4, Physical & Energy Symptoms.
  {
    id: "caq-physical-symptoms",
    phaseId: "phase_physical_symptoms",
    quote: "Your body keeps a running score. Let’s read it together.",
    subtext: "Phase 4 of 7 | Physical & Energy Symptoms",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #1A2744 0%, #2DA5A0 100%)", overlayOpacity: 0.38 },
    dotPosition: 7,
    totalDots: CAQ_TOTAL_DOTS,
  },

  // C4 (relocated): Before Phase 5, Neurological & Cognitive Symptoms.
  {
    id: "caq-neuro-symptoms",
    phaseId: "phase_neuro_symptoms",
    quote: "Your brain is the command center. Understanding how it’s performing changes everything.",
    subtext: "Phase 5 of 7 | Neurological & Cognitive Symptoms",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #1A2744 0%, #2C3E5A 100%)", overlayOpacity: 0.42 },
    featureCard: { category: "COGNITIVE MAPPING", title: "Brain-Body Connection", description: "Brain fog, poor sleep, and memory issues often share root causes with nutrient deficiencies. We trace those connections." },
    dotPosition: 9,
    totalDots: CAQ_TOTAL_DOTS,
  },

  // C5 (relocated): Before Phase 6, Emotional & Systemic Symptoms.
  {
    id: "caq-emotional-symptoms",
    phaseId: "phase_emotional_symptoms",
    quote: "Mood, immunity, and hormones are more connected than you think. Let’s map the full picture.",
    subtext: "Phase 6 of 7 | Emotional & Systemic Symptoms",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #2DA5A0 0%, #1A2744 100%)", overlayOpacity: 0.36 },
    dotPosition: 11,
    totalDots: CAQ_TOTAL_DOTS,
  },

  // C6 (relocated): Before Phase 7, Medications, Supplements & Allergies.
  // 173b §3.3: quote unchanged, only the position label updates.
  {
    id: "caq-medications",
    phaseId: "phase_meds_supps",
    quote: "What you take matters. What you take it with matters more.",
    subtext: "Phase 7 of 7 | Medications, Supplements & Allergies",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #1A2744 0%, #0F1B2E 100%)", overlayOpacity: 0.40 },
    featureCard: { category: "SAFETY ENGINE", title: "Real-Time Interaction Checking", description: "Every medication and supplement you add is checked against 14,000+ known interactions in real-time. Your safety is never an afterthought." },
    dotPosition: 13,
    totalDots: CAQ_TOTAL_DOTS,
  },

  // P1: Assessment Complete (post-CAQ, no phase binding).
  {
    id: "caq-complete",
    quote: "You’ve just given us everything we need. Let’s build something incredible.",
    subtext: "Assessment Complete | Analyzing your responses...",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #B8860B 0%, #2DA5A0 100%)", overlayOpacity: 0.25 },
    dotPosition: 15,
    totalDots: CAQ_TOTAL_DOTS,
  },

  // P2: Before Packages Page (post-CAQ).
  {
    id: "packages-intro",
    quote: "Every journey needs the right foundation. Choose the plan that matches your ambition.",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #1A2744 0%, #0F1B2E 100%)", overlayOpacity: 0.40 },
    featureCard: { category: "UNLOCK MORE", title: "Gold & Platinum Benefits", description: "Deeper AI analysis, priority practitioner access, and Helix Rewards™ at up to 5x earn rate. Your protocol. Your pace. Your plan." },
    dotPosition: 0,
    totalDots: 0,
  },

  // P3: Welcome to Dashboard (post-CAQ).
  {
    id: "welcome-dashboard",
    quote: "DYNAMIC",
    background: { type: "video", src: VIDEO_URL, fallbackGradient: "linear-gradient(135deg, #2DA5A0 0%, #1A2744 100%)", overlayOpacity: 0.35 },
    dotPosition: 0,
    totalDots: 0,
  },
];

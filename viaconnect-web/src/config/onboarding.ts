// ─── Interstitial Configuration ─────────────────────────────────────────────

const INTERSTITIAL_VIDEO_URL =
  "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Assets/DNA%20HD.mp4";

export interface InterstitialConfig {
  id: string;
  quote: string;
  subtext?: string;
  background: {
    type: "video" | "gradient";
    src?: string;
    fallbackGradient: string;
    overlayOpacity: number;
  };
  featureCard?: {
    category: string;
    title: string;
    description: string;
  };
  floatingPills?: boolean;
  dotPosition: number;
  totalDots: number;
}

export const INTERSTITIALS: InterstitialConfig[] = [
  {
    id: "welcome",
    quote: "Your wellness journey is unique. We\u2019re here to decode it.",
    background: {
      type: "video",
      src: INTERSTITIAL_VIDEO_URL,
      fallbackGradient: "linear-gradient(135deg, #1A2744 0%, #2DA5A0 50%, #1A2744 100%)",
      overlayOpacity: 0.4,
    },
    dotPosition: 1,
    totalDots: 20,
  },
  {
    id: "science",
    quote: "Built on genomics. Guided by science. Personalized for you.",
    background: {
      type: "video",
      src: INTERSTITIAL_VIDEO_URL,
      fallbackGradient: "linear-gradient(180deg, #0F1B2E 0%, #2DA5A0 100%)",
      overlayOpacity: 0.35,
    },
    featureCard: {
      category: "PRECISION WELLNESS",
      title: "Genomic-Powered Protocols",
      description:
        "ViaConnect analyzes 360+ genetic markers to build supplement protocols that work with your unique biology, not against it.",
    },
    floatingPills: true,
    dotPosition: 4,
    totalDots: 20,
  },
  {
    id: "privacy",
    quote: "Your data stays yours. Always encrypted. Never sold.",
    subtext: "HIPAA compliant \u00b7 SOC2 certified \u00b7 End-to-end encryption",
    background: {
      type: "video",
      src: INTERSTITIAL_VIDEO_URL,
      fallbackGradient: "linear-gradient(135deg, #1A2744 0%, #0F1B2E 100%)",
      overlayOpacity: 0.5,
    },
    dotPosition: 7,
    totalDots: 20,
  },
  {
    id: "blueprint",
    quote: "In the next few minutes, we\u2019ll build your personal wellness blueprint.",
    background: {
      type: "video",
      src: INTERSTITIAL_VIDEO_URL,
      fallbackGradient: "linear-gradient(135deg, #2DA5A0 0%, #1A2744 100%)",
      overlayOpacity: 0.45,
    },
    featureCard: {
      category: "YOUR VITALITY SCORE",
      title: "Real-Time Health Snapshot",
      description:
        "A dynamic score across 5 dimensions: Energy, Cognitive, Sleep, Metabolic, and Stress, that evolves as you do.",
    },
    dotPosition: 10,
    totalDots: 20,
  },
  {
    id: "encouragement",
    quote: "Every answer helps us get closer to what your body actually needs.",
    background: {
      type: "video",
      src: INTERSTITIAL_VIDEO_URL,
      fallbackGradient: "linear-gradient(180deg, #B75E18 0%, #D4741F 40%, #E88A3A 100%)",
      overlayOpacity: 0.25,
    },
    dotPosition: 14,
    totalDots: 20,
  },
  {
    id: "reveal",
    quote: "Your personalized results are ready. Let\u2019s see what we found.",
    background: {
      type: "video",
      src: INTERSTITIAL_VIDEO_URL,
      fallbackGradient: "linear-gradient(135deg, #B8860B 0%, #2DA5A0 100%)",
      overlayOpacity: 0.4,
    },
    dotPosition: 18,
    totalDots: 20,
  },
];

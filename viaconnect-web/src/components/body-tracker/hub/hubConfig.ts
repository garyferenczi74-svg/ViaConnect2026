// Prompt 180 (2026-06-08): My Biology Hub configuration.
//
// One typed config drives the six surface cards, the Connections strip,
// and the Getting Started guidance strip. Each card carries a media
// descriptor (gradient, image, or video) so Gary can swap a placeholder
// for a real asset per card with a one line change here.
//
// How to swap media per card after the build:
//   1. Drop the asset under public/body-tracker/, e.g.
//      public/body-tracker/weight.mp4 and public/body-tracker/weight.jpg.
//   2. In SURFACES, set that card's media to:
//      { kind: "video", src: "/body-tracker/weight.mp4",
//        poster: "/body-tracker/weight.jpg",
//        gradientClass: "..." }
//      or, for a still image:
//      { kind: "image", src: "/body-tracker/weight.jpg",
//        gradientClass: "..." }
//   3. Leaving a card as { kind: "gradient", gradientClass: "..." }
//      keeps the placeholder.
//
// Hard rules honored (Section 3): tokens only, Lucide strokeWidth 1.5,
// Instrument Sans, no emojis, no em or en dashes anywhere.

import {
  Gauge,
  Ruler,
  TrendingUp,
  Scale,
  Target,
  Activity,
  Plug,
  PlayCircle,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";

export type Accent = "teal" | "orange";
export type MediaKind = "gradient" | "image" | "video";

export interface SurfaceMedia {
  kind: MediaKind;
  // For image or video, a path under /public, e.g. "/body-tracker/dashboard.mp4".
  // Leave src empty to keep the gradient placeholder.
  src?: string;
  // Poster shown before a video loads, on reduced motion, or if the
  // video fails.
  poster?: string;
  // CSS object-position for the cover crop of an image or video, e.g.
  // "center" or "top". CardMedia defaults to "top" when unset, which
  // preserves the Dashboard hero framing; set "center" to crop centered.
  objectPosition?: string;
  // Prompt 219c: object-fit for image/video fill. Default "cover" keeps
  // full-bleed framing for videos and existing Biology cards. Use
  // "contain" when the full subject must stay in frame (no crop).
  objectFit?: 'cover' | 'contain';
  // Tailwind classes for the gradient placeholder used when kind is
  // "gradient" or when an image or video fails to load.
  gradientClass: string;
}

export interface SurfaceCard {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: Accent;
  // Key the metric hook resolves; see useHubMetrics.
  metricKey: string;
  metricLabel: string;
  // Grid placement classes applied to the card wrapper.
  gridClass: string;
  media: SurfaceMedia;
}

// Source order is preserved in the DOM so grid auto placement produces
// the desktop layout without explicit row / column lines: Dashboard,
// FormaVision Body Composition, Progress, then Weight, Milestones,
// Metabolic, Hormones as an equal four-card row (Prompt 221C; lg 12-col).
// Prompt 210j: no standalone FormaVision hub card; tabs inside composition
// reach the 3D surface.
export const SURFACES: SurfaceCard[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Today's snapshot and your current Bio Optimization signal.",
    href: "/body-tracker/dashboard",
    icon: Gauge,
    accent: "teal",
    metricKey: "bio_optimization_score",
    metricLabel: "trending this week",
    // Desktop (12-col): col span 8, row span 2 (top left, featured).
    // Tablet: col span 2, single row.
    // Mobile: full width, slightly taller via min-h on the card.
    gridClass: "md:col-span-2 md:row-span-1 lg:col-span-8 lg:row-span-2",
    media: {
      kind: "video",
      src: "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Burn_belly_fat_lose_weight_m.mp4",
      poster: "",
      gradientClass:
        "bg-[radial-gradient(120%_120%_at_0%_0%,rgba(45,165,160,0.35)_0%,rgba(30,48,84,0.85)_55%,rgba(26,39,68,1)_100%)]",
    },
  },
  {
    // Prompt 210j: single hub entry for composition + FormaVision tabs (no separate card).
    id: "composition",
    title: "FormaVision Body Composition",
    description: "Segmental body fat, muscle, and the 13 point measurements.",
    href: "/body-tracker/composition",
    icon: Ruler,
    accent: "teal",
    metricKey: "body_fat_pct",
    metricLabel: "body fat",
    // Desktop (12-col): right column top (col span 4).
    gridClass: "md:col-span-1 lg:col-span-4 lg:row-span-1",
    media: {
      kind: "video",
      src: "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/body%20comp%202.mp4",
      poster: "",
      objectPosition: "center",
      gradientClass:
        "bg-[radial-gradient(110%_110%_at_100%_0%,rgba(45,165,160,0.28)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]",
    },
  },
  {
    id: "progress",
    title: "Goals and Progress",
    description: "Your whole journey: CAQ targets, nutrition, supplements, training, AI body composition.",
    href: "/body-tracker/progress",
    icon: TrendingUp,
    accent: "teal",
    metricKey: "pct_to_goal",
    metricLabel: "to your goal",
    // Desktop (12-col): right column under Body Composition (col span 4).
    gridClass: "md:col-span-1 lg:col-span-4 lg:row-span-1",
    media: {
      kind: "video",
      src: "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/an_atractive_fit_woman_in_the.mp4",
      poster: "",
      objectPosition: "center",
      gradientClass:
        "bg-[radial-gradient(110%_110%_at_100%_100%,rgba(45,165,160,0.30)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]",
    },
  },
  {
    id: "weight",
    title: "Weight",
    description: "Daily log and the dual journey: weight loss or muscle building.",
    href: "/body-tracker/weight",
    icon: Scale,
    accent: "orange",
    metricKey: "latest_weight_lbs",
    metricLabel: "change this week",
    // Desktop (12-col): four-card row, equal col span 3 (Prompt 221C).
    gridClass: "md:col-span-1 lg:col-span-3 lg:row-span-1",
    media: {
      kind: "video",
      src: "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Body_Weight_scale_Senior_woma.mp4",
      poster: "",
      objectPosition: "center",
      gradientClass:
        "bg-[radial-gradient(110%_110%_at_0%_100%,rgba(183,94,24,0.30)_0%,rgba(30,48,84,0.85)_55%,rgba(26,39,68,1)_100%)]",
    },
  },
  {
    id: "milestones",
    title: "Milestones",
    description: "Weekly goals you set for yourself, tracked and rewarded through Helix.",
    href: "/body-tracker/milestones",
    icon: Target,
    accent: "orange",
    metricKey: "milestones_done_this_week",
    metricLabel: "done this week",
    // Desktop (12-col): four-card row, equal col span 3 (Prompt 221C).
    gridClass: "md:col-span-1 lg:col-span-3 lg:row-span-1",
    media: {
      kind: "video",
      src: "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Mountain%20top.mp4",
      poster: "",
      objectPosition: "center",
      gradientClass:
        "bg-[radial-gradient(110%_110%_at_50%_100%,rgba(183,94,24,0.30)_0%,rgba(30,48,84,0.85)_55%,rgba(26,39,68,1)_100%)]",
    },
  },
  {
    id: "metabolic",
    title: "Metabolic",
    description: "Metabolic and cardiovascular markers, resting heart rate, and recovery.",
    href: "/body-tracker/metabolic",
    icon: Activity,
    accent: "teal",
    metricKey: "resting_hr_bpm",
    metricLabel: "resting heart rate",
    // Desktop (12-col): four-card row, equal col span 3 (Prompt 221C).
    // Tablet: one column of the 2x2 (was full-width span; that orphaned Hormones).
    gridClass: "md:col-span-1 lg:col-span-3 lg:row-span-1",
    media: {
      kind: "video",
      src: "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Metobolic.mp4",
      poster: "",
      objectPosition: "center",
      gradientClass:
        "bg-[radial-gradient(110%_110%_at_100%_50%,rgba(45,165,160,0.30)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]",
    },
  },
  {
    // Prompt 221B/221C: Hormone Education; sibling anatomy in the four-card row.
    id: "hormones",
    title: "Hormones",
    description: "Educational Male or Female Hormone Report mapped to your labs.",
    href: "/body-tracker/hormones",
    icon: FlaskConical,
    accent: "teal",
    metricKey: "hormones_report",
    metricLabel: "report status",
    // Desktop (12-col): four-card row, equal col span 3. Stat chip absent until real data.
    gridClass: "md:col-span-1 lg:col-span-3 lg:row-span-1",
    media: {
      // PLACEHOLDER FOR GARY: reuses Metabolic vitality video from Hero Videos
      // bucket until a preferred endocrine/hormones asset is supplied.
      kind: "video",
      src: "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Metobolic.mp4",
      poster: "",
      objectPosition: "center",
      gradientClass:
        "bg-[radial-gradient(110%_110%_at_0%_50%,rgba(45,165,160,0.32)_0%,rgba(30,48,84,0.85)_55%,rgba(26,39,68,1)_100%)]",
    },
  },
];

export interface ConnectionSource {
  id: string;
  label: string;
  // Always false in this prompt; the ingestion series wires real status
  // in a later release.
  connected: boolean;
}

export const CONNECTIONS = {
  href: "/body-tracker/connections",
  icon: Plug,
  title: "Connections",
  description: "Sync the apps and wearables that feed every surface above.",
  sources: [
    { id: "apple-health", label: "Apple Health", connected: false },
    { id: "oura", label: "Oura", connected: false },
    { id: "garmin", label: "Garmin", connected: false },
    { id: "whoop", label: "Whoop", connected: false },
    { id: "dexcom", label: "Dexcom", connected: false },
  ] as ConnectionSource[],
};

export const GUIDE = {
  icon: PlayCircle,
  firstRunLabel: "Getting Started",
  returningLabel: "Refresh",
  description: "Arnold walks you through My Biology. Guide coming soon.",
  comingSoonText: "My Biology Guide coming soon",
  // Reserved Arnold avatar slot. Leave empty to render the avatar
  // placeholder. Set to a /public path when the real avatar lands.
  avatarSrc: "",
  // Flips to true when the real walkthrough lands in a later series.
  // While false the strip does not navigate and the action is
  // presentational.
  ready: false,
};

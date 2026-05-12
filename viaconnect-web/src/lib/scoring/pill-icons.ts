// Pill icon registry for the Bio Optimization Score card.
//
// Maps the accuracy pill key (caq, labs, genetics) and engagement
// pill key (nutrition, supplements, body_tracker, wearable, plug_ins,
// helix_challenges) to a Lucide React icon component. The pill
// primitive renders the icon at 16x16 with strokeWidth 1.5 per the
// project's Lucide convention.
//
// Pure module: no JSX, no client hooks. The components import the
// icon component reference and render it themselves.

import {
  ClipboardCheck,
  FlaskConical,
  Dna,
  Utensils,
  Pill,
  Ruler,
  Watch,
  Plug,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

export type AccuracyPillKey = 'caq' | 'labs' | 'genetics';

export type EngagementPillKey =
  | 'nutrition'
  | 'supplements'
  | 'body_tracker'
  | 'wearable'
  | 'plug_ins'
  | 'helix_challenges';

export const ACCURACY_PILL_ICONS: Record<AccuracyPillKey, LucideIcon> = {
  caq: ClipboardCheck,
  labs: FlaskConical,
  genetics: Dna,
};

export const ENGAGEMENT_PILL_ICONS: Record<EngagementPillKey, LucideIcon> = {
  nutrition: Utensils,
  supplements: Pill,
  body_tracker: Ruler,
  wearable: Watch,
  plug_ins: Plug,
  helix_challenges: Trophy,
};

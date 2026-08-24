/**
 * Prompt 226e: Peptide Education index tile config.
 * My Protocols title is allowlisted under G28 (prescriber/self-entered regimens).
 */

import type { LucideIcon } from 'lucide-react';
import {
  Sparkles,
  ClipboardList,
  Calculator,
  GraduationCap,
  Search,
  Stethoscope,
  Leaf,
  Dna,
} from 'lucide-react';

export type PeptideBentoTileId =
  | 'hannah'
  | 'my-protocols'
  | 'calculator'
  | 'literacy'
  | 'search'
  | 'practitioner'
  | 'naturopath'
  | 'peptideiq';

export type PeptideBentoTile = {
  id: PeptideBentoTileId;
  title: string;
  /** Static subtext; search tile subtext is computed live. */
  subtext: string;
  href: string | null;
  pending: boolean;
  pendingLabel?: string;
  Icon: LucideIcon;
  /** Tailwind grid span classes for xl (≥1200) layout */
  gridClass: string;
};

export const STATEMENT_B_HEADING = 'Discuss with your practitioner';

export const STATEMENT_B_BODY =
  'Educational peptide material only. Clinical context, monitoring considerations, and contraindication classes are available to authenticated practitioners. Ask your qualified practitioner to review frameworks with you. No dosing, reconstitution, or sourcing guidance is provided on ViaConnect.';

/** G36 approved replacement (no protocol summary / recommended stack / cycling schedule). */
export const STATEMENT_A_G36 =
  'Your Hannah peptide summary, including detected CAQ patterns, your evidence-matched education results, and your logged history, is automatically pre-filled when you connect with a provider through ViaConnect™';

export const PEPTIDE_EDUCATION_BENTO_TILES: PeptideBentoTile[] = [
  {
    id: 'hannah',
    title: 'Hannah AI',
    subtext: 'AI-powered personalized peptide suggestion by Hannah AI',
    href: '/peptide-protocol/suggestions',
    pending: false,
    Icon: Sparkles,
    gridClass:
      'min-h-[160px] col-span-1 row-span-1 md:col-span-2 xl:col-span-2 xl:row-span-2 xl:min-h-[340px]',
  },
  {
    id: 'search',
    title: 'Search Peptides',
    subtext: 'educational reference',
    href: '/peptide-protocol/browse',
    pending: false,
    Icon: Search,
    gridClass: 'min-h-[160px] col-span-1 md:col-span-2 xl:col-span-2',
  },
  {
    id: 'my-protocols',
    title: 'My Protocols',
    subtext: 'Prescriber-issued and self-entered regimens',
    href: '/peptide-protocol/my-protocols',
    pending: false,
    Icon: ClipboardList,
    gridClass: 'min-h-[160px] col-span-1',
  },
  {
    id: 'calculator',
    title: 'Calculator',
    subtext: 'Converts values you enter into syringe units.',
    href: '/peptide-protocol/converter',
    pending: false,
    Icon: Calculator,
    gridClass: 'min-h-[160px] col-span-1',
  },
  {
    id: 'literacy',
    title: 'Protocol Literacy',
    subtext: 'Reconstitution, concentration, syringe standards, timing principles.',
    href: '/peptide-protocol/literacy',
    pending: false,
    Icon: GraduationCap,
    gridClass: 'min-h-[160px] col-span-1',
  },
  {
    id: 'peptideiq',
    // G33: no PeptideIQ-specific parser yet. Links to generic genetics upload
    // without claiming PeptideIQ integration (226e §3.7).
    title: 'PeptideIQ',
    subtext: 'Upload Your Genetic Peptide Results',
    href: '/genetics/upload',
    pending: false,
    Icon: Dna,
    gridClass: 'min-h-[160px] col-span-1',
  },
  {
    id: 'practitioner',
    title: 'Find a Practitioner',
    subtext: 'MD / DO / NP / PA. Prescribing authority',
    href: null,
    pending: true,
    pendingLabel: 'Coming soon',
    Icon: Stethoscope,
    gridClass: 'min-h-[160px] col-span-1',
  },
  {
    id: 'naturopath',
    title: 'Find a Naturopath',
    subtext: 'ND. Holistic + functional medicine',
    href: null,
    pending: true,
    pendingLabel: 'Coming soon',
    Icon: Leaf,
    gridClass: 'min-h-[160px] col-span-1',
  },
];

/** Mobile single-column order per 226e §4.3 */
export const PEPTIDE_BENTO_MOBILE_ORDER: PeptideBentoTileId[] = [
  'hannah',
  'search',
  'my-protocols',
  'calculator',
  'literacy',
  'peptideiq',
  'practitioner',
  'naturopath',
];

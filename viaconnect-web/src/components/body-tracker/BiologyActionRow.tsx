'use client';

/**
 * Prompt 217: My Biology action button row.
 * Uniform 48px buttons: Log Data, Doctor's Report.
 * FormaVision scan lives only on the orange CompositionSectionToggle tab
 * (/body-tracker/formavision). This row must not label a second FormaVision CTA.
 * Mobile: single-line horizontal snap scroll (no label wrap). Desktop: same
 * variant, no scroll when space allows.
 */

import { Plus } from 'lucide-react';
import { DownloadReportButton } from '@/components/formavision/DownloadReportButton';

const CARD = '#1E3054';

/** Shared surface for legibility over hero video / navy backdrop. */
export const BIOLOGY_ACTION_BTN_BASE =
  'inline-flex h-12 shrink-0 snap-start items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 text-xs font-medium backdrop-blur-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/45 disabled:cursor-not-allowed disabled:opacity-50';

export const BIOLOGY_ACTION_BTN_NEUTRAL = `${BIOLOGY_ACTION_BTN_BASE} border-white/15 bg-[rgba(30,48,84,0.92)] text-white hover:bg-[rgba(30,48,84,0.98)]`;

export const BIOLOGY_ACTION_BTN_PRIMARY = `${BIOLOGY_ACTION_BTN_BASE} border-[rgba(45,165,160,0.65)] bg-[rgba(30,48,84,0.95)] text-white shadow-[inset_0_0_0_1px_rgba(45,165,160,0.25)] hover:border-[rgba(45,165,160,0.85)]`;

export const BIOLOGY_ACTION_BTN_PRIMARY_ACTIVE = `${BIOLOGY_ACTION_BTN_BASE} border-[rgba(45,165,160,0.8)] bg-[rgba(45,165,160,0.18)] text-white`;

export const BIOLOGY_ACTION_BTN_NEUTRAL_ACTIVE = `${BIOLOGY_ACTION_BTN_BASE} border-white/25 bg-[rgba(42,76,158,0.35)] text-white`;

export interface BiologyActionRowProps {
  userId: string | null;
  logOpen: boolean;
  onToggleLog: () => void;
}

export function BiologyActionRow({
  userId,
  logOpen,
  onToggleLog,
}: BiologyActionRowProps) {
  return (
    <div
      data-testid="biology-action-row"
      className="flex w-full max-w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:w-auto md:overflow-visible md:snap-none"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <button
        type="button"
        data-testid="biology-action-log-data"
        aria-pressed={logOpen}
        onClick={onToggleLog}
        className={logOpen ? BIOLOGY_ACTION_BTN_NEUTRAL_ACTIVE : BIOLOGY_ACTION_BTN_NEUTRAL}
      >
        <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
        <span>Log Data</span>
      </button>

      <DownloadReportButton
        userId={userId}
        surface="/body-tracker/composition"
        variant="biology"
      />

      {/* Spacer so last pill can snap with edge affordance on narrow viewports */}
      <span className="w-1 shrink-0 snap-end md:hidden" aria-hidden style={{ background: CARD, opacity: 0 }} />
    </div>
  );
}

export default BiologyActionRow;

'use client';

// CyclePhaseTrendNote.tsx  (Prompt #169b, spec section 11.2.3)
//
// Presentational: renders the CONSUMER-ONLY, OPT-IN cycle-phase annotation note
// for a single scan on the body-scan longitudinal trend. The note STRING is
// computed by the parent (PhotoSessionHistory), which resolves the opt-in + the
// per-scan phase ONCE for the whole list (see useCyclePhaseSource); this keeps a
// single source-read instead of one per row. When `note` is null this renders
// nothing (not opted in, or no phase could be computed).
//
// PRIVACY (important): this note is for the CONSUMER's own surface only. It is
// never placed on a practitioner / naturopath payload (the practitioner Body Scan
// payload in src/lib/body-tracker/practitioner-scan.ts is an explicit allow-list
// that omits cycle_phase_at_scan; time-of-day-trend.ts adds a belt-and-braces
// cycle-exposure guard). The opt-in defaults OFF, so a user who never opts in is
// never assigned a phase and never sees this note.
//
// The phase MATH + annotation copy live in the pure, unit-tested module
// src/lib/body-tracker/time-of-day-trend.ts.

import { Moon } from 'lucide-react';

interface CyclePhaseTrendNoteProps {
  // The precomputed annotation string, or null to render nothing.
  note: string | null;
}

export function CyclePhaseTrendNote({ note }: CyclePhaseTrendNoteProps) {
  if (!note) return null;
  return (
    <span
      data-testid="cycle-phase-trend-note"
      className="mt-1 flex items-start gap-1.5 text-[10px] leading-snug text-[#C4B5FD]"
    >
      <Moon className="h-3 w-3 flex-none mt-px" strokeWidth={1.5} />
      <span>{note}</span>
    </span>
  );
}

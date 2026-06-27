'use client';

/**
 * src/components/formavision/AgentNarration.tsx
 *
 * Prompt 210b P6-T2: AgentNarration
 *
 * Renders 1 to 3 short body-positive lines from Arnold (body tracker) and
 * Hannah (tone) describing what changed, what is notable, and one gentle
 * non-prescriptive suggestion. Lines are TEMPLATED and DETERMINISTIC: no LLM
 * call, no network call at runtime. Pure function maps composition deltas to
 * pre-written, compliance-clearable lines.
 *
 * Input: the CompositionDeltasResult already computed on the page (vrDeltas).
 * Read-only, fail-open: null deltas -> honest first-scan welcome.
 *
 * Attribution: display names via getDisplayName (Arnold / Hannah). Raw slugs
 * never appear in the UI.
 *
 * Honesty contract:
 *   - Lines derived ONLY from real deltas. No fabricated progress.
 *   - No prior scan / empty deltas -> calm first-scan welcome.
 *   - No medical/dosage/dietary language.
 *   - Bio Optimization Score is the only score name (not referenced here).
 *
 * Standing rules: Lucide strokeWidth 1.5, no emojis, no em/en dashes,
 * design tokens (Teal #2DA5A0 / Navy #1E3054 / Orange #B75E18),
 * Instrument Sans, desktop + mobile responsive, no horizontal overflow.
 *
 * 2026-06-27. No em/en-dashes.
 */

import { MessageCircle } from 'lucide-react';
import { buildNarrationLines } from '@/lib/formavision/narration/agentNarration';
import type { CompositionDeltasResult } from '@/lib/formavision/deltas/compositionDeltas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentNarrationProps {
  /** Pre-computed composition deltas from computeCompositionDeltas. */
  deltas: CompositionDeltasResult | null;
  /** Disable any CSS animations when the user prefers reduced motion. */
  reducedMotion?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders 1-3 body-positive agent narration lines from Arnold + Hannah.
 * Read-only, fail-open, no network calls, fully deterministic.
 */
export function AgentNarration({ deltas, reducedMotion: _reducedMotion }: AgentNarrationProps) {
  const lines = buildNarrationLines(deltas);

  return (
    <div
      data-testid="agent-narration"
      className="rounded-2xl border border-[#2DA5A0]/20 bg-[#1E3054]/40 p-4 sm:p-5 backdrop-blur-sm"
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle
          size={16}
          strokeWidth={1.5}
          className="flex-none text-[#2DA5A0]"
          aria-hidden="true"
        />
        <h3 className="text-sm font-semibold text-white">Arnold and Hannah Notice</h3>
      </div>

      {/* Narration lines */}
      <ul
        className="flex flex-col gap-3"
        aria-label="Agent narration"
        data-testid="agent-narration-lines"
      >
        {lines.map((line, i) => (
          <li
            key={i}
            data-testid="narration-line"
            className="flex flex-col gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-wider text-[#2DA5A0]"
              aria-hidden="true"
            >
              {line.speaker}
            </span>
            <p className="text-xs leading-relaxed text-white/75">{line.text}</p>
          </li>
        ))}
      </ul>

      {/* Disclosure: templated lines, not live AI */}
      <p className="mt-3 text-[10px] leading-relaxed text-white/35">
        Arnold and Hannah use your scan history to share context. Lines are pre-written
        and informational only. Not a clinical finding.
      </p>
    </div>
  );
}

"use client";

/**
 * src/components/protocol/SupplementFlagsPanel.tsx
 *
 * Renders the Supplement Flags panel from user_protocol_synthesis.
 * Shows each flagged supplement with its reason, the suggested alternative
 * (e.g. MTHFR folic acid -> methylfolate), and the evidence tier badge.
 *
 * Empty state renders a calm message when no flags exist (expected until
 * the recompute trigger is wired and rules are clinically published).
 *
 * Lucide strokeWidth 1.5. No emojis. No em/en-dashes.
 * Prompt 208, Phase 8, Task 22 (2026-06-21).
 */

import { ShieldCheck, ArrowRight, Info } from 'lucide-react';
import { EvidenceTierBadge } from '@/components/protocol/EvidenceTierBadge';
import type { EvidenceTier } from '@/components/protocol/EvidenceTierBadge';
import type { SupplementFlag } from '@/lib/protocol/readSynthesis';

// ---------------------------------------------------------------------------
// SupplementFlagsPanel
// ---------------------------------------------------------------------------

export interface SupplementFlagsPanelProps {
  flags: SupplementFlag[];
}

export function SupplementFlagsPanel({ flags }: SupplementFlagsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Panel header */}
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div
            className="absolute blur-xl -inset-1 rounded-xl opacity-50 pointer-events-none"
            style={{ backgroundColor: '#60A5FA33' }}
          />
          <div
            className="relative w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #60A5FA33, #60A5FA1A, transparent)',
              border: '1px solid #60A5FA26',
            }}
          >
            <ShieldCheck className="w-5 h-5" style={{ color: '#60A5FA' }} strokeWidth={1.5} />
          </div>
        </div>
        <div>
          <h2 className="text-base md:text-lg font-bold text-white">Supplement Flags</h2>
          <p className="text-xs text-white/40 mt-0.5">
            Supplements flagged by your genetic variants
          </p>
        </div>
      </div>

      {/* Content */}
      {flags.length === 0 ? (
        /* Empty state */
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 md:p-6">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-white/25 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-sm text-white/50 leading-relaxed">
              No supplements have been flagged at this time. Flags appear when your current
              supplements are reviewed against clinically-published genetic guidance.
            </p>
          </div>
        </div>
      ) : (
        /* Flag list */
        <ul className="space-y-3" role="list">
          {flags.map((flag, idx) => (
            <li
              key={`${flag.ruleRsid}-${idx}`}
              className="rounded-xl bg-white/[0.02] border border-blue-400/[0.12] p-4 md:p-5 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white">{flag.current}</span>
                <EvidenceTierBadge tier={flag.evidenceTier as EvidenceTier} />
              </div>

              {flag.reason && (
                <p className="text-xs text-white/50 leading-relaxed">{flag.reason}</p>
              )}

              {flag.alternativeForm && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-white/30">Consider instead:</span>
                  <div className="flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3 text-teal-400/60" strokeWidth={1.5} />
                    <span className="text-xs font-medium text-teal-400">
                      {flag.alternativeForm}
                    </span>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

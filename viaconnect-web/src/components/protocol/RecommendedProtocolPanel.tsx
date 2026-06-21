"use client";

/**
 * src/components/protocol/RecommendedProtocolPanel.tsx
 *
 * Renders the Recommended Protocol panel from user_protocol_synthesis.
 * Shows each recommended form with its rationale and evidence tier badge.
 * Header carries the SNP sub-line exactly: "Your Genetics | Your Protocol".
 *
 * Empty state renders a calm message when no synthesis items exist (expected
 * until the recompute trigger is wired and the human clinical gate publishes
 * rules -- both separate tasks). A user with no genetic upload still receives
 * the CAQ AI protocol; this panel surfaces the genetics-specific layer.
 *
 * Lucide strokeWidth 1.5. No emojis. No em/en-dashes.
 * Prompt 208, Phase 8, Task 22 (2026-06-21).
 */

import { useState } from 'react';
import { Dna, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { EvidenceTierBadge } from '@/components/protocol/EvidenceTierBadge';
import type { EvidenceTier } from '@/components/protocol/EvidenceTierBadge';
import type { RecommendedItem } from '@/lib/protocol/readSynthesis';

// ---------------------------------------------------------------------------
// ViewSources disclosure
// ---------------------------------------------------------------------------

function ViewSources({ ruleRsid }: { ruleRsid: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-teal-400/70 hover:text-teal-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-400/50 rounded"
        aria-expanded={open}
        aria-controls={`sources-${ruleRsid}`}
      >
        {open ? (
          <ChevronUp className="w-3 h-3" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
        )}
        View sources
      </button>
      {open && (
        <div
          id={`sources-${ruleRsid}`}
          className="mt-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-xs text-white/40 leading-relaxed"
        >
          <p>
            Rule derived from variant: <span className="font-mono text-white/60">{ruleRsid}</span>
          </p>
          <p className="mt-1 text-white/25">
            Full source citations will appear here once the clinical reference layer is published.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecommendedProtocolPanel
// ---------------------------------------------------------------------------

export interface RecommendedProtocolPanelProps {
  items: RecommendedItem[];
}

export function RecommendedProtocolPanel({ items }: RecommendedProtocolPanelProps) {
  return (
    <div className="space-y-4">
      {/* Panel header with SNP sub-line -- EXACT text required */}
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div
            className="absolute blur-xl -inset-1 rounded-xl opacity-50 pointer-events-none"
            style={{ backgroundColor: '#2DA5A033' }}
          />
          <div
            className="relative w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #2DA5A033, #2DA5A01A, transparent)',
              border: '1px solid #2DA5A026',
            }}
          >
            <Dna className="w-5 h-5" style={{ color: '#2DA5A0' }} strokeWidth={1.5} />
          </div>
        </div>
        <div>
          <h2 className="text-base md:text-lg font-bold text-white">Recommended Protocol</h2>
          {/* SNP sub-line EXACT */}
          <p className="text-xs text-white/40 mt-0.5">Your Genetics | Your Protocol</p>
        </div>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        /* Empty state */
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 md:p-6">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-white/25 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="space-y-1.5">
              <p className="text-sm text-white/50 leading-relaxed">
                Your personalized genetics-based protocol will appear here once genetic or lab data
                is uploaded and clinically-published guidance is available for your variants.
              </p>
              <p className="text-xs text-white/30 leading-relaxed">
                Your CAQ AI protocol is already active and applies in the meantime. This panel adds
                the genetics-specific layer on top.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Item list */
        <ul className="space-y-3" role="list">
          {items.map((item, idx) => (
            <li
              key={`${item.ruleRsid}-${idx}`}
              className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 md:p-5 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white">{item.form}</span>
                <EvidenceTierBadge tier={item.evidenceTier as EvidenceTier} />
              </div>
              {item.rationale && (
                <p className="text-xs text-white/50 leading-relaxed">{item.rationale}</p>
              )}
              <ViewSources ruleRsid={item.ruleRsid} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

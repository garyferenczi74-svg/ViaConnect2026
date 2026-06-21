"use client";

/**
 * src/components/protocol/NutritionByGeneticsPanel.tsx
 *
 * Renders the Nutrition by Genetics panel from user_protocol_synthesis.
 * Fetches GET /api/protocol/synthesis on mount, reads
 * synthesis.nutrition_guidance.prefer and .avoid, then renders two labeled
 * lists (Prefer / Avoid) keyed to the member's genetic variants.
 *
 * Gordon is the nutrition source-of-truth; this panel surfaces his output.
 *
 * States:
 *   loading  -- skeleton placeholder shown while the fetch is in flight
 *   error    -- calm inline message if the fetch fails; no crash
 *   empty    -- both lists empty; calm message that guidance appears once
 *               genetic data and clinically-published rules are available
 *   data     -- prefer list + avoid list rendered
 *
 * Lucide strokeWidth 1.5. No emojis. No em/en-dashes.
 * Responsive (mobile + desktop).
 * Prompt 208, Phase 8, Task 23 (2026-06-21).
 */

import { useEffect, useState } from 'react';
import { Dna, CircleCheck, CircleMinus, Info, AlertCircle, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NutritionGuidance {
  prefer: string[];
  avoid: string[];
}

interface SynthesisResponse {
  synthesis: {
    nutrition_guidance?: NutritionGuidance;
  } | null;
}

type FetchState = 'idle' | 'loading' | 'error' | 'done';

// ---------------------------------------------------------------------------
// NutritionByGeneticsPanel
// ---------------------------------------------------------------------------

export function NutritionByGeneticsPanel() {
  const [state, setState] = useState<FetchState>('idle');
  const [prefer, setPrefer] = useState<string[]>([]);
  const [avoid, setAvoid] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    fetch('/api/protocol/synthesis')
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setState('error');
          return;
        }
        const json = (await res.json()) as SynthesisResponse;
        if (cancelled) return;
        const guidance = json.synthesis?.nutrition_guidance;
        setPrefer(guidance?.prefer ?? []);
        setAvoid(guidance?.avoid ?? []);
        setState('done');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isEmpty = state === 'done' && prefer.length === 0 && avoid.length === 0;

  return (
    <div className="space-y-4">
      {/* Panel header */}
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div
            className="absolute -inset-1 rounded-xl opacity-50 blur-xl pointer-events-none"
            style={{ backgroundColor: '#2DA5A033' }}
          />
          <div
            className="relative flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #2DA5A033, #2DA5A01A, transparent)',
              border: '1px solid #2DA5A026',
            }}
          >
            <Dna className="h-5 w-5" style={{ color: '#2DA5A0' }} strokeWidth={1.5} />
          </div>
        </div>
        <div>
          <h2 className="text-base font-bold text-white md:text-lg">Nutrition by Genetics</h2>
          <p className="mt-0.5 text-xs text-white/40">
            Dietary guidance keyed to your genetic variants
          </p>
        </div>
      </div>

      {/* Content */}
      {state === 'loading' || state === 'idle' ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 md:p-6">
          <div className="flex items-center gap-2 text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            <span className="text-sm">Loading your genetic nutrition guidance...</span>
          </div>
        </div>
      ) : state === 'error' ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 md:p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/25" strokeWidth={1.5} />
            <p className="text-sm leading-relaxed text-white/50">
              Genetic nutrition guidance is temporarily unavailable. Please try again later.
            </p>
          </div>
        </div>
      ) : isEmpty ? (
        /* Empty state */
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 md:p-6">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/25" strokeWidth={1.5} />
            <p className="text-sm leading-relaxed text-white/50">
              Personalized nutrition-by-genetics guidance appears once your genetic data is
              on file and clinically-published guidance has been applied to your variants.
            </p>
          </div>
        </div>
      ) : (
        /* Data state: prefer + avoid lists */
        <div className="grid gap-4 md:grid-cols-2">
          {/* Prefer list */}
          {prefer.length > 0 && (
            <div className="rounded-xl border border-teal-400/[0.12] bg-white/[0.02] p-4 md:p-5">
              <div className="mb-3 flex items-center gap-2">
                <CircleCheck
                  className="h-4 w-4 flex-shrink-0 text-teal-400"
                  strokeWidth={1.5}
                />
                <span className="text-xs font-semibold uppercase tracking-wide text-teal-400">
                  Prefer
                </span>
              </div>
              <ul className="space-y-2" role="list">
                {prefer.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm leading-relaxed text-white/75"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-teal-400/60"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Avoid list */}
          {avoid.length > 0 && (
            <div className="rounded-xl border border-red-400/[0.12] bg-white/[0.02] p-4 md:p-5">
              <div className="mb-3 flex items-center gap-2">
                <CircleMinus
                  className="h-4 w-4 flex-shrink-0 text-red-400/70"
                  strokeWidth={1.5}
                />
                <span className="text-xs font-semibold uppercase tracking-wide text-red-400/70">
                  Limit
                </span>
              </div>
              <ul className="space-y-2" role="list">
                {avoid.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm leading-relaxed text-white/75"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-red-400/40"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

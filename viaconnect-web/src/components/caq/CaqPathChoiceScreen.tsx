'use client';

// =============================================================================
// Prompt 173c Phase C (2026-06-04): Quick vs Complete CAQ path choice screen.
//
// Presented at the start of Phase 1 (Demographics & Biodata), before the
// user invests in the full flow. Both options are presented evenly. Quick
// is NOT pre-selected. Lead with the value of Complete (recommended). The
// Phase 1 interstitial line "The more we know, the smarter your protocol
// gets." is reused here as the honest framing for the choice.
//
// Tone: no manipulative urgency, no countdown pressure, no dark patterns
// (173c 2.1). Kelsey reviews the copy; the strings ship verbatim from the
// memo until the human review pass updates them.
// =============================================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import type { CaqPath } from '@/config/caq-phase-order';
import { CAQ_FORM_PHASE_IDS, CAQ_QUICK_FORM_PHASE_IDS } from '@/config/caq-phase-order';

export interface CaqPathChoiceScreenProps {
  // Called when the user confirms a selection. The page persists the
  // choice (caq_paths upsert + localStorage mirror) and routes the user
  // to the first form phase.
  readonly onPick: (path: CaqPath) => void;
}

interface ChoiceCardProps {
  readonly path: CaqPath;
  readonly title: string;
  readonly badge?: string;
  readonly headline: string;
  readonly bullets: ReadonlyArray<string>;
  readonly cta: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

function ChoiceCard({ path, title, badge, headline, bullets, cta, selected, onSelect }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-path={path}
      className={`flex w-full flex-col gap-3 rounded-2xl border p-5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-copper/60 ${
        selected
          ? 'border-copper/70 bg-copper/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <h3 className={`text-base font-semibold ${selected ? 'text-copper' : 'text-white'}`}>
          {title}
        </h3>
        {badge ? (
          <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.10em] text-teal-light">
            {badge}
          </span>
        ) : null}
      </header>
      <p className="text-sm leading-relaxed text-white/80">{headline}</p>
      <ul className="space-y-1.5">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-[12px] text-white/65">
            <CheckCircle2
              className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${selected ? 'text-copper' : 'text-white/40'}`}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <span
        className={`mt-auto inline-flex items-center justify-center rounded-full px-4 py-2 text-[12px] font-semibold transition-colors ${
          selected ? 'bg-copper text-white' : 'bg-white/10 text-white/80'
        }`}
      >
        {cta}
      </span>
    </button>
  );
}

export function CaqPathChoiceScreen({ onPick }: CaqPathChoiceScreenProps) {
  // No pre-selection (173c 0.4). The continue affordance stays disabled
  // until the user makes a choice.
  const [pick, setPick] = useState<CaqPath | null>(null);
  const completePhaseCount = CAQ_FORM_PHASE_IDS.length;
  const quickPhaseCount = CAQ_QUICK_FORM_PHASE_IDS.length;

  return (
    <div className="min-h-screen w-full bg-[#1A2744] text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-8 text-center"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white/60">
            <Sparkles className="h-3.5 w-3.5 text-teal-light" strokeWidth={1.5} aria-hidden="true" />
            Choose your path
          </div>
          <h1 className="text-2xl font-light leading-snug text-white sm:text-3xl">
            The more we know, the smarter your protocol gets.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/65">
            Two ways to get started. Both keep your data private and let you change paths anytime. Pick the depth that feels right for now.
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <ChoiceCard
            path="complete"
            title="Complete Assessment"
            badge="Recommended"
            headline="The most precise protocol and Bio Optimization Score, built on the full picture of how your body and your life shape your health."
            bullets={[
              `All ${completePhaseCount} phases, including symptoms and family history.`,
              'Tightest macros, richest supplement personalization.',
              'Highest confidence on every recommendation.',
            ]}
            cta="Choose Complete"
            selected={pick === 'complete'}
            onSelect={() => setPick('complete')}
          />
          <ChoiceCard
            path="quick"
            title="Quick Start"
            headline="A safe, goal-based starting protocol in a fraction of the time. Includes the steps that drive your macros and the safety screen."
            bullets={[
              `Just ${quickPhaseCount} phases: Demographics, Lifestyle & Goals, Medications and Supplements.`,
              'You can add the remaining phases anytime to deepen the result.',
              'Same safety screen as Complete; nothing important is skipped.',
            ]}
            cta="Choose Quick Start"
            selected={pick === 'quick'}
            onSelect={() => setPick('quick')}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-8 flex flex-col items-center gap-3"
        >
          <button
            type="button"
            disabled={pick === null}
            onClick={() => { if (pick !== null) onPick(pick); }}
            className={`inline-flex min-w-[220px] items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-all ${
              pick === null
                ? 'cursor-not-allowed bg-white/10 text-white/40'
                : 'bg-white text-black shadow-lg shadow-black/20 hover:shadow-xl active:scale-[0.98]'
            }`}
          >
            {pick === null ? 'Pick a path to continue' : 'Continue'}
          </button>
          <p className="max-w-md text-center text-[11px] leading-relaxed text-white/45">
            Your path is private. You can switch later, and the platform does not gate any phase by membership tier.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default CaqPathChoiceScreen;

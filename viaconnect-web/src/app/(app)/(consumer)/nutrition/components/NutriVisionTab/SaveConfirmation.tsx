'use client';

// Prompt #170 Phase 1l: post-save confirmation screen.
//
// Shows: a check pulse, the Bio Optimization delta, four small SVG-arc rings
// for Cal / Protein / Carbs / Fat targets (target placeholders for Phase 1),
// the Helix awards summary, and a Done CTA that returns to /nutrition.
//
// The phrase Bio Optimization is rendered verbatim per the standing copy rule.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import type { MealTotals, SaveResponse } from './types';

interface SaveConfirmationProps {
  totals: MealTotals;
  response: SaveResponse;
  onLogAnother: () => void;
  // Prompt 171a: signed thumbnail URL from analyze response, propagated
  // through MealDraft.thumbnail_url. Undefined for barcode meals (no photo).
  thumbnailUrl?: string | null;
}

// Placeholder daily targets for Phase 1. Real targets are sourced from the
// user's profile in Phase 1m. Kept locally so the rings render meaningfully.
const TARGETS = {
  calories_kcal: 2000,
  protein_g: 120,
  carbs_g: 220,
  fat_g: 70,
};

interface RingProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}

function Ring({ label, value, target, unit, color }: RingProps) {
  const pct = Math.max(0, Math.min(1, target > 0 ? value / target : 0));
  const radius = 26;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const dash = pct * circumference;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={64}
        height={64}
        viewBox="0 0 64 64"
        role="img"
        aria-label={`${label}: ${Math.round(value)} of ${target} ${unit}`}
      >
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 32 32)"
        />
        <text
          x="32"
          y="36"
          textAnchor="middle"
          fontSize="11"
          fontFamily="monospace"
          fill="#FFFFFF"
        >
          {Math.round(value)}
        </text>
      </svg>
      <div className="text-center text-[10px]">
        <div className="text-white/55">{label}</div>
        <div className="font-mono text-white/70">
          {Math.round(value)} / {target} {unit}
        </div>
      </div>
    </div>
  );
}

export function SaveConfirmation({ totals, response, onLogAnother, thumbnailUrl }: SaveConfirmationProps) {
  const delta = response.gordon.bio_optimization_delta;
  const helixCount = response.helix_events_emitted.length;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#2DA5A0]/30 bg-[#1E3054]/55 p-5 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2DA5A0]/20 text-[#2DA5A0]">
          <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Meal saved</h2>
          <p className="text-[11px] text-white/55">
            Bio Optimization{' '}
            {typeof delta === 'number' && delta !== 0 ? (
              <span className={delta > 0 ? 'text-[#2DA5A0]' : 'text-[#B75E18]'}>
                {delta > 0 ? '+' : ''}{delta.toFixed(1)} pts
              </span>
            ) : (
              <span className="text-white/55">delta computing in background</span>
            )}
          </p>
        </div>
      </div>

      {/* Prompt 171a: small thumbnail above the rings for the celebratory beat. */}
      {typeof thumbnailUrl === 'string' && thumbnailUrl.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-white/[0.08]" style={{ aspectRatio: '16 / 9' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt="Saved meal"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-2">
        <Ring label="Calories" value={totals.calories_kcal} target={TARGETS.calories_kcal} unit="kcal" color="#2DA5A0" />
        <Ring label="Protein"  value={totals.protein_g}     target={TARGETS.protein_g}     unit="g"    color="#2DA5A0" />
        <Ring label="Carbs"    value={totals.carbs_g}       target={TARGETS.carbs_g}       unit="g"    color="#B75E18" />
        <Ring label="Fat"      value={totals.fat_g}         target={TARGETS.fat_g}         unit="g"    color="#B75E18" />
      </div>

      {response.gordon.copy && (
        <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-[12px] text-white/75">
          {response.gordon.copy}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/55">
        <span>
          Quality:{' '}
          <span className="font-mono text-white/80">
            {response.gordon.quality_tier.toUpperCase()} ({response.gordon.quality_score})
          </span>
        </span>
        {helixCount > 0 && (
          <span className="text-[#2DA5A0]">
            +{helixCount} Helix {helixCount === 1 ? 'reward' : 'rewards'}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onLogAnother}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90"
        >
          Log another meal
        </button>
        <Link
          href="/nutrition"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
        >
          Done
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}

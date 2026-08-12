'use client';

/**
 * Prompt 215: Hannah-presented genetic compatibility panel (Elysium scored).
 */

import { Dna, AlertCircle, CheckCircle2, MinusCircle } from 'lucide-react';
import { getDisplayName } from '@/lib/getDisplayName';
import type { CompatibilityResult } from '@/lib/shop/productTabs/types';
import { APPROVED_FRAMING } from '@/lib/shop/productTabs/types';
import Link from 'next/link';

const BAND_STYLES: Record<
  string,
  { bg: string; border: string; text: string; label: string; Icon: typeof CheckCircle2 }
> = {
  green: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/35',
    text: 'text-emerald-400',
    label: APPROVED_FRAMING.green,
    Icon: CheckCircle2,
  },
  yellow: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/35',
    text: 'text-amber-400',
    label: APPROVED_FRAMING.yellow,
    Icon: MinusCircle,
  },
  red: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/35',
    text: 'text-rose-400',
    label: APPROVED_FRAMING.red,
    Icon: AlertCircle,
  },
  pending: {
    bg: 'bg-white/5',
    border: 'border-white/15',
    text: 'text-white/60',
    label: 'Results processing',
    Icon: MinusCircle,
  },
  empty: {
    bg: 'bg-white/5',
    border: 'border-white/15',
    text: 'text-white/60',
    label: 'No genetics connected',
    Icon: Dna,
  },
  signed_out: {
    bg: 'bg-white/5',
    border: 'border-white/15',
    text: 'text-white/60',
    label: 'Sign in required',
    Icon: Dna,
  },
};

export function GeneticCompatibilityPanel({ result }: { result: CompatibilityResult }) {
  const hannah = getDisplayName('hannah');
  const style = BAND_STYLES[result.band] ?? BAND_STYLES.empty;
  const Icon = style.Icon;

  return (
    <div data-testid="genetic-compatibility-panel" data-band={result.band} className="space-y-4">
      <div className="flex items-center gap-2">
        <Dna className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
        <p className="text-xs text-white/45">
          Presented by {hannah} · Scored by {getDisplayName('elysium')}
        </p>
      </div>

      <div className={`rounded-xl border p-4 ${style.bg} ${style.border}`}>
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 shrink-0 ${style.text}`} strokeWidth={1.5} />
          <div>
            <p className={`text-sm font-semibold ${style.text}`}>{style.label}</p>
            <p className="mt-1 text-sm text-white/70 leading-relaxed">{result.framingLine}</p>
            {result.band !== 'signed_out' &&
              result.band !== 'empty' &&
              result.band !== 'pending' && (
                <p className="mt-2 text-[11px] text-white/40">
                  {APPROVED_FRAMING.subline}
                </p>
              )}
          </div>
        </div>
      </div>

      {result.reasons.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-white/35 font-semibold">
            Why this score
          </p>
          <ul className="space-y-2">
            {result.reasons.map((r, i) => (
              <li
                key={`${r.rsid}-${i}`}
                className="rounded-lg border border-white/[0.06] bg-[#1A2744]/50 px-3 py-2 text-xs text-white/65"
              >
                <span className="font-medium text-white/85">{r.ingredientLabel}</span>
                {' · '}
                {r.gene} {r.rsid} · {r.evidenceGrade} evidence
                <br />
                <span className="text-white/45">{r.framing}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.coverageCaveats.length > 0 && (
        <div className="space-y-1">
          {result.coverageCaveats.map((c, i) => (
            <p key={i} className="text-xs text-white/45 leading-relaxed">
              {c}
            </p>
          ))}
        </div>
      )}

      {(result.state === 'no_data' || result.state === 'signed_out') && (
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          {result.state === 'signed_out' ? (
            <Link
              href="/login"
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#2DA5A0]/40 px-4 text-sm text-[#2DA5A0]"
            >
              Sign in
            </Link>
          ) : (
            <>
              <Link
                href="/shop/genex360"
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#2DA5A0]/40 px-4 text-sm text-[#2DA5A0]"
              >
                Explore GENEX360
              </Link>
              <Link
                href="/genetics/upload"
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-white/15 px-4 text-sm text-white/70"
              >
                Upload existing test
              </Link>
            </>
          )}
        </div>
      )}

      <p className="text-[11px] text-white/35 leading-relaxed border-t border-white/[0.06] pt-3">
        {result.disclaimer}
      </p>
      {result.lastUpdated && (
        <p className="text-[10px] text-white/30">
          Score last updated: {new Date(result.lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  );
}

export default GeneticCompatibilityPanel;

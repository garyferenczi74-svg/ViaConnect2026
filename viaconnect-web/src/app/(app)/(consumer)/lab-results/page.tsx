'use client';

// Prompt 204c: My Lab Results overlay. A dedicated read-only page that lists the
// member's saved lab biomarkers (GET /api/labs/results) and overlays a
// genetically informed optimal range where the member's DNA applies. Mirrors the
// /plugins/labs glass-v2 style: VCButton, Lucide icons at strokeWidth 1.5, and
// inline styles driven by the page's CSS-var palette. Fail-open: any fetch error
// resolves to empty results, never an error panel. Re-fetches on window focus so
// returning after an upload shows fresh data.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FlaskConical, Dna, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { VCButton } from '@/components/ui/VCButton';
import { getDisplayName } from '@/lib/getDisplayName';

type LabResult = {
  name: string;
  value: number;
  unit: string;
  panelGroup: string;
  standard: { low: number; high: number } | null;
  geneticOptimal: { low: number; high: number } | null;
  gene: string | null;
  status: string;
  tier: string;
  direction: string;
};

const PANEL_ORDER = [
  'Complete blood count',
  'Metabolic',
  'Lipids',
  'Inflammatory',
  'Hormones',
  'Vitamins and minerals',
  'Other',
];

type ResultsResponse = {
  results: LabResult[];
  totalBiomarkers: number;
};

const DISCLAIMER =
  'Genetic optimal ranges are wellness targets, not diagnostic thresholds or medical advice. Talk to a qualified professional before acting on them.';

type ChipSpec = { label: string; style: React.CSSProperties };

const TEAL_CHIP: React.CSSProperties = {
  backgroundColor: 'rgba(45, 165, 160, 0.15)',
  border: '1px solid rgba(45, 165, 160, 0.45)',
  color: '#4DC9C4',
};
const AMBER_CHIP: React.CSSProperties = {
  backgroundColor: 'rgba(183, 94, 24, 0.15)',
  border: '1px solid rgba(183, 94, 24, 0.45)',
  color: '#D98A3D',
};
const ORANGE_CHIP: React.CSSProperties = {
  backgroundColor: 'rgba(183, 94, 24, 0.18)',
  border: '1px solid rgba(183, 94, 24, 0.5)',
  color: '#B75E18',
};
const GRAY_CHIP: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  color: 'rgba(255, 255, 255, 0.6)',
};

// Map the deterministic status tier to a human label plus a token-driven chip.
function tierChip(tier: string): ChipSpec | null {
  switch (tier) {
    case 'optimal':
      return { label: 'In range', style: TEAL_CHIP };
    case 'monitor':
      return { label: 'Monitor', style: AMBER_CHIP };
    case 'consult':
      return { label: 'Consult a professional', style: ORANGE_CHIP };
    case 'unknown':
      return { label: 'Needs review', style: GRAY_CHIP };
    default:
      return null;
  }
}

export default function LabResultsPage() {
  const [results, setResults] = useState<LabResult[]>([]);
  const [totalBiomarkers, setTotalBiomarkers] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  // Hannah decipherment (on demand).
  const [deciphering, setDeciphering] = useState(false);
  const [decipherText, setDecipherText] = useState<string | null>(null);
  const [decipherDone, setDecipherDone] = useState(false);
  const [decipherBlocked, setDecipherBlocked] = useState(false);
  const hannah = getDisplayName('hannah');

  // Fail-open fetch: any error resolves to empty results, never throws.
  const loadResults = useCallback(async () => {
    try {
      const res = await fetch('/api/labs/results');
      const data = (await res.json()) as ResultsResponse;
      setResults(Array.isArray(data.results) ? data.results : []);
      setTotalBiomarkers(typeof data.totalBiomarkers === 'number' ? data.totalBiomarkers : 0);
    } catch {
      setResults([]);
      setTotalBiomarkers(0);
    } finally {
      setHasLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    void loadResults();
    // Re-fetch on window focus so returning after an upload shows fresh data.
    const onFocus = () => {
      void loadResults();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadResults]);

  // Ask Hannah to interpret the confirmed results. Fail-open: any error leaves
  // the deterministic results visible and shows an unavailable message.
  const requestDecipher = useCallback(async () => {
    setDeciphering(true);
    setDecipherDone(false);
    setDecipherBlocked(false);
    setDecipherText(null);
    try {
      const res = await fetch('/api/labs/decipher', { method: 'POST' });
      const data = await res.json();
      setDecipherText(typeof data.text === 'string' ? data.text : null);
      setDecipherBlocked(data.blocked === true);
    } catch {
      setDecipherText(null);
      setDecipherBlocked(false);
    } finally {
      setDeciphering(false);
      setDecipherDone(true);
    }
  }, []);

  return (
    <div className="flex flex-col gap-4 md:gap-6 px-4 md:px-0">
      {/* Back link */}
      <Link
        href="/plugins/labs"
        className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-white"
        style={{ color: 'var(--teal-500)' }}
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        Connect Lab Results
      </Link>

      {/* Title */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl flex-none"
          style={{ backgroundColor: 'rgba(45, 165, 160, 0.15)' }}
        >
          <FlaskConical size={22} strokeWidth={1.5} style={{ color: '#2DA5A0' }} />
        </div>
        <h1 className="text-heading-2" style={{ color: 'var(--text-heading-orange)' }}>
          My Lab Results
        </h1>
      </div>

      {/* Subtitle */}
      <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
        Your biomarkers, with a genetically informed optimal range where your DNA applies.
      </p>

      {/* Static seek-care banner, driven by the deterministic tiers, not by any AI
          text, so a Consult value is always surfaced even if Hannah's text is dropped. */}
      {hasLoadedOnce && results.some((r) => r.tier === 'consult') ? (
        <div
          className="flex items-start gap-2 rounded-xl p-4 text-sm leading-relaxed"
          style={{
            backgroundColor: 'rgba(183, 94, 24, 0.1)',
            border: '1px solid rgba(183, 94, 24, 0.4)',
            color: '#D98A3D',
          }}
        >
          <AlertTriangle size={18} strokeWidth={1.5} className="mt-0.5 flex-none" />
          <span>
            One or more results are flagged Consult a professional. Please contact a qualified
            professional promptly to review them. This page is not a diagnosis.
          </span>
        </div>
      ) : null}

      {/* Loading state (first load only) */}
      {!hasLoadedOnce ? (
        <div className="glass-v2 p-4 md:p-6 rounded-2xl">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Loading your results...
          </p>
        </div>
      ) : totalBiomarkers === 0 ? (
        // Empty state
        <div className="glass-v2 p-4 md:p-6 rounded-2xl flex flex-col gap-4">
          <h2 className="text-heading-3 text-white">No lab results yet.</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            Once you upload a lab report and save your biomarkers, they will appear here with your
            genetic optimal ranges.
          </p>
          <div>
            <Link href="/plugins/labs">
              <VCButton variant="primary" size="sm">
                Upload a lab report
              </VCButton>
            </Link>
          </div>
        </div>
      ) : (
        // Results grouped by panel
        <div className="flex flex-col gap-6 md:gap-8">
          {PANEL_ORDER.map((group) => {
            const groupResults = results.filter((r) => r.panelGroup === group);
            if (groupResults.length === 0) return null;
            return (
              <div key={group} className="flex flex-col gap-3">
                <h2 className="text-heading-3 text-white">{group}</h2>
                {groupResults.map((r, i) => {
                  const chip = tierChip(r.tier);
                  return (
              <div
                key={`${group}-${r.name}-${i}`}
                className="glass-v2 p-4 md:p-6 rounded-2xl flex flex-col gap-3"
                style={{ borderLeft: '4px solid #2DA5A0' }}
              >
                {/* Name + value + status chip */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="text-base font-semibold text-white">{r.name}</span>
                  <span
                    className="text-lg font-semibold"
                    style={{ color: 'var(--teal-400, #4DC9C4)' }}
                  >
                    {r.value} {r.unit}
                  </span>
                  {chip ? (
                    <span
                      className="ml-auto inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
                      style={chip.style}
                    >
                      {chip.label}
                    </span>
                  ) : null}
                </div>

                {/* Standard range */}
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {r.standard
                    ? `Standard range: ${r.standard.low} to ${r.standard.high} ${r.unit}`
                    : 'Standard range: not provided'}
                </p>

                {/* Genetic optimal overlay (teal-tinted) */}
                {r.geneticOptimal ? (
                  <div
                    className="rounded-xl px-4 py-3 flex flex-col gap-1"
                    style={{
                      backgroundColor: 'rgba(45, 165, 160, 0.08)',
                      border: '1px solid rgba(45, 165, 160, 0.3)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Dna size={16} strokeWidth={1.5} style={{ color: 'var(--teal-500)' }} />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: 'var(--teal-400, #4DC9C4)' }}
                      >
                        Your genetic optimal: {r.geneticOptimal.low} to {r.geneticOptimal.high}{' '}
                        {r.unit}
                      </span>
                    </div>
                    {r.gene ? (
                      <p className="text-xs text-white/45">Informed by your {r.gene} variant</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Hannah decipherment (on demand) */}
      {hasLoadedOnce && totalBiomarkers > 0 ? (
        <div
          className="glass-v2 p-4 md:p-6 rounded-2xl flex flex-col gap-3"
          style={{ borderLeft: '4px solid #B75E18' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={20} strokeWidth={1.5} style={{ color: '#B75E18' }} />
            <h2 className="text-heading-3 text-white">{hannah}&apos;s interpretation</h2>
          </div>

          {!decipherDone && !deciphering ? (
            <>
              <p className="text-sm text-white/60 leading-relaxed">
                {hannah} can translate these results into plain language with educational
                suggestions. Not a diagnosis or medical advice.
              </p>
              <div>
                <VCButton variant="primary" size="sm" onClick={requestDecipher}>
                  Get {hannah}&apos;s interpretation
                </VCButton>
              </div>
            </>
          ) : null}

          {deciphering ? (
            <p className="inline-flex items-center gap-2 text-sm text-white/60">
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              {hannah} is reading your results...
            </p>
          ) : null}

          {decipherDone && decipherText ? (
            <>
              <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">{decipherText}</p>
              <p className="text-xs leading-relaxed text-white/40">
                {hannah} is an AI wellness guide. This is educational and not a diagnosis or a
                substitute for medical care.
              </p>
            </>
          ) : null}

          {decipherDone && !decipherText ? (
            <p className="inline-flex items-start gap-2 text-sm text-amber-200">
              <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 flex-none" />
              <span>
                {decipherBlocked
                  ? 'We could not show an interpretation for these results. Please review them with a qualified professional.'
                  : `${hannah}'s interpretation is unavailable right now. Please try again shortly.`}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Footer disclaimer */}
      {hasLoadedOnce ? (
        <p className="text-xs leading-relaxed text-white/40">{DISCLAIMER}</p>
      ) : null}
    </div>
  );
}

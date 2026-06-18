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
import { ArrowLeft, FlaskConical, Dna } from 'lucide-react';
import { VCButton } from '@/components/ui/VCButton';

type LabResult = {
  name: string;
  value: number;
  unit: string;
  standard: { low: number; high: number } | null;
  geneticOptimal: { low: number; high: number } | null;
  gene: string | null;
  status: string;
};

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
const BLUE_CHIP: React.CSSProperties = {
  backgroundColor: 'rgba(77, 142, 201, 0.15)',
  border: '1px solid rgba(77, 142, 201, 0.45)',
  color: '#7FB2E0',
};

// Map the server status to a human label plus a token-driven chip color.
function statusChip(status: string): ChipSpec | null {
  switch (status) {
    case 'within_genetic_optimal':
      return { label: 'In your genetic optimal', style: TEAL_CHIP };
    case 'below_genetic_optimal':
      return { label: 'Below your genetic optimal', style: AMBER_CHIP };
    case 'above_genetic_optimal':
      return { label: 'Above your genetic optimal', style: AMBER_CHIP };
    case 'within_standard':
      return { label: 'In standard range', style: TEAL_CHIP };
    case 'below_standard':
      return { label: 'Below standard', style: BLUE_CHIP };
    case 'above_standard':
      return { label: 'Above standard', style: AMBER_CHIP };
    default:
      return null;
  }
}

export default function LabResultsPage() {
  const [results, setResults] = useState<LabResult[]>([]);
  const [totalBiomarkers, setTotalBiomarkers] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

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
        // Result cards
        <div className="flex flex-col gap-3 md:gap-4">
          {results.map((r, i) => {
            const chip = statusChip(r.status);
            return (
              <div
                key={`${r.name}-${i}`}
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
      )}

      {/* Footer disclaimer */}
      {hasLoadedOnce ? (
        <p className="text-xs leading-relaxed text-white/40">{DISCLAIMER}</p>
      ) : null}
    </div>
  );
}

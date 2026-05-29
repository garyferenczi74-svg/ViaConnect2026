'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Loader2, Box, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCurrentUser } from '@/components/body-tracker/manual-input/useCurrentUser';
import { usePremiumEntitlement } from '@/hooks/body-tracker/usePremiumEntitlement';
import { selectScanResultsGate } from '@/lib/body-tracker/scan-gate';
import { BodyScanPremiumPaywall } from './BodyScanPremiumPaywall';
import { AvatarViewer } from './AvatarViewer';
import { CompositionBreakdownCard } from './CompositionBreakdownCard';
import { AsymmetryReportCard } from './AsymmetryReportCard';
import { MeasurementGrid } from './MeasurementGrid';
import { CalibrationDisclaimerBanner } from './CalibrationDisclaimerBanner';
import { CalibrationNudgeCard } from './CalibrationNudgeCard';
import { ScanQualityIndicator } from './ScanQualityIndicator';
import { TierBadge } from './TierBadge';
import { ScanInsightsTab } from './ScanInsightsTab';
import { ScanShareTab } from './ScanShareTab';
import { ScanPdfExportButton } from './ScanPdfExportButton';
import { ComparisonPanel } from '../photos/ComparisonPanel';
import { resolveScanTier } from '@/lib/body-tracker/scan-tier';
import type { BodyModelParameters, CompositionEstimate, ExtractedMeasurements, AsymmetryReport } from '@/lib/arnold/scanning/types';

// Exported so tab sub-components can share the type
export type PortalType = 'consumer' | 'practitioner' | 'naturopath';

type TabId = 'measurements' | 'composition' | 'compare' | 'insights' | 'share';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'measurements', label: 'Measurements' },
  { id: 'composition',  label: 'Composition' },
  { id: 'compare',      label: 'Compare' },
  { id: 'insights',     label: 'Insights' },
  { id: 'share',        label: 'Share' },
];

// Premium-only result tabs (Prompt #169a, spec section 3.1.c). For a non-premium
// consumer these render visibly locked and route to the paywall; premium
// consumers see them unlocked.
const PREMIUM_TAB_IDS: ReadonlySet<TabId> = new Set<TabId>(['compare', 'insights']);

interface ScanResultsPanelProps {
  sessionId: string;
  refreshKey?: number;
  portalType?: PortalType;
}

/** Shape of one row from the body_scan_composition T2 table. */
interface ScanCompositionRow {
  body_fat_pct: number | null;
  ci_low_body_fat_pct: number | null;
  ci_high_body_fat_pct: number | null;
  lean_mass_kg: number | null;
  fat_mass_kg: number | null;
  visceral_fat_index: number | null;
  ag_ratio: number | null;
  vs_ratio: number | null;
  fmi: number | null;
  ffmi: number | null;
  bmi: number | null;
  bmr_kcal: number | null;
}

interface LoadedScan {
  userId: string;
  measurements: ExtractedMeasurements;
  composition: CompositionEstimate;
  asymmetry: AsymmetryReport;
  avatarParameters: BodyModelParameters;
  qualityScore: number;
  qualityIssues: string[];
  calibratedWithManual: boolean;
  heightCm: number;
  weightKg: number;
  sex: 'male' | 'female';
}

export function ScanResultsPanel({ sessionId, refreshKey, portalType = 'consumer' }: ScanResultsPanelProps) {
  const { unitSystem } = useCurrentUser();
  // Results upgrade guard point (Prompt #169a, spec section 3.1.c). Practitioner
  // and naturopath portals view managed-patient scans (a practitioner-managed
  // context) and are never gated here; only the consumer self-view is gated by
  // the consumer's own premium entitlement.
  const { premium, freeTeaserUsed } = usePremiumEntitlement();
  const resultsGate = selectScanResultsGate({
    premium: premium || portalType !== 'consumer',
    freeTeaserUsed,
  });
  const premiumTabsUnlocked = resultsGate.premiumTabsUnlocked;
  const isTabLocked = (id: TabId): boolean => PREMIUM_TAB_IDS.has(id) && !premiumTabsUnlocked;
  const [loaded, setLoaded]       = useState<LoadedScan | null>(null);
  const [compRow, setCompRow]     = useState<ScanCompositionRow | null>(null);
  const [loading, setLoading]     = useState(true);
  const [missing, setMissing]     = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('measurements');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Keyboard nav skips locked premium tabs so a non-premium consumer cannot
  // arrow into the gated Compare / Insights panels.
  const handleTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const currentIdx = TABS.findIndex((t) => t.id === activeTab);
    const step = (start: number, dir: 1 | -1): number => {
      let idx = start;
      for (let i = 0; i < TABS.length; i += 1) {
        idx = (idx + dir + TABS.length) % TABS.length;
        if (!isTabLocked(TABS[idx].id)) return idx;
      }
      return start;
    };
    let nextIdx = currentIdx;
    if (e.key === 'ArrowRight')      nextIdx = step(currentIdx, 1);
    else if (e.key === 'ArrowLeft')  nextIdx = step(currentIdx, -1);
    else if (e.key === 'Home')       nextIdx = isTabLocked(TABS[0].id) ? step(0, 1) : 0;
    else if (e.key === 'End')        nextIdx = isTabLocked(TABS[TABS.length - 1].id) ? step(TABS.length - 1, -1) : TABS.length - 1;
    else return;
    e.preventDefault();
    setActiveTab(TABS[nextIdx].id);
    tabRefs.current[nextIdx]?.focus();
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setMissing(false);
      const supabase = createClient();
      const { data } = await supabase
        .from('body_photo_sessions')
        .select('user_id, extracted_measurements, composition_estimate, asymmetry_report, avatar_parameters, scan_quality_score, quality_issues, calibrated_with_manual, scan_status')
        .eq('id', sessionId)
        .maybeSingle();
      if (!mounted) return;
      const row = data as unknown as Record<string, unknown> | null;
      if (!row || !row.extracted_measurements || !row.avatar_parameters) {
        setMissing(true);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('sex, height_cm, weight_kg')
        .eq('id', row.user_id as string)
        .maybeSingle();
      const p = profile as unknown as { sex: string | null; height_cm: number | null; weight_kg: number | null } | null;

      // T2 table: body_scan_composition provides precision CI values when the
      // body-scan-analyze edge function has written them. Fall back to the JSONB
      // composition_estimate blob when this row is absent (Phase 1 fail-open path).
      type LooseComp = {
        from: (t: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: ScanCompositionRow | null; error: { message: string } | null }>;
            };
          };
        };
      };
      const sbComp = supabase as unknown as LooseComp;
      const { data: compData } = await sbComp
        .from('body_scan_composition')
        .select('body_fat_pct, ci_low_body_fat_pct, ci_high_body_fat_pct, lean_mass_kg, fat_mass_kg, visceral_fat_index, ag_ratio, vs_ratio, fmi, ffmi, bmi, bmr_kcal')
        .eq('session_id', sessionId)
        .maybeSingle();
      if (mounted) {
        setCompRow(compData ?? null);
      }

      setLoaded({
        userId:               row.user_id as string,
        measurements:         row.extracted_measurements as ExtractedMeasurements,
        composition:          row.composition_estimate as CompositionEstimate,
        asymmetry:            row.asymmetry_report as AsymmetryReport,
        avatarParameters:     row.avatar_parameters as BodyModelParameters,
        qualityScore:         (row.scan_quality_score as number | null) ?? 0,
        qualityIssues:        ((row.quality_issues as string[] | null) ?? []),
        calibratedWithManual: (row.calibrated_with_manual as boolean | null) ?? false,
        heightCm:             p?.height_cm ?? 170,
        weightKg:             p?.weight_kg ?? 70,
        sex:                  p?.sex === 'female' ? 'female' : 'male',
      });
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [sessionId, refreshKey]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-10 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-white/50" strokeWidth={1.5} />
      </div>
    );
  }
  if (missing || !loaded) return null;

  // Tier is always 1 in Phase 1 per scan-tier.ts
  const tier = resolveScanTier({
    hasLidar: false,
    hasArCoreDepth: false,
    hasTrueDepth: false,
    hasCompletedGenex360Panel: false,
  });

  return (
    <section className="space-y-4">
      {/* Panel header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2DA5A0]/20">
            <Box className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-bold text-white">AI body scan results</h3>
        </div>
        <TierBadge tier={tier} />
      </div>

      {/* Banners above tabs */}
      <CalibrationDisclaimerBanner />
      <ScanQualityIndicator score={loaded.qualityScore} issues={loaded.qualityIssues} />
      {!loaded.calibratedWithManual && <CalibrationNudgeCard trigger="first_scan_complete" />}

      {/* Tab nav */}
      <div
        role="tablist"
        aria-label="Scan result sections"
        className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none"
        onKeyDown={handleTabKeyDown}
      >
        {TABS.map((tab, i) => {
          const isActive = activeTab === tab.id;
          const locked = isTabLocked(tab.id);
          return (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[i] = el; }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              aria-disabled={locked || undefined}
              data-locked={locked || undefined}
              tabIndex={isActive ? 0 : -1}
              // Locked premium tabs are inert: a non-premium consumer cannot open
              // Compare / Insights; the paywall below the tabs is the upgrade path.
              onClick={() => { if (!locked) setActiveTab(tab.id); }}
              className={`flex-none inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors min-h-[36px] ${
                locked
                  ? 'bg-white/[0.02] text-white/35 border border-white/[0.05] cursor-not-allowed'
                  : isActive
                    ? 'bg-[#2DA5A0]/20 text-[#2DA5A0] border border-[#2DA5A0]/35'
                    : 'bg-white/[0.04] text-white/55 border border-white/[0.07] hover:bg-white/[0.07] hover:text-white/75'
              }`}
            >
              {tab.label}
              {locked && <Lock className="h-3 w-3" strokeWidth={1.5} />}
            </button>
          );
        })}
      </div>

      {/* Results upgrade card (Prompt #169a, spec section 3.1.c). After a
          free-teaser scan the non-premium consumer sees the paywall with the
          Compare + Insights tabs locked above as the evidence. */}
      {resultsGate.showPaywall && <BodyScanPremiumPaywall showLockedEvidence />}

      {/* PDF export: always visible across all tabs */}
      <div className="flex justify-end">
        <ScanPdfExportButton sessionId={sessionId} />
      </div>

      {/* Tab content */}
      <div>
        {/* Tab 1: Measurements */}
        {activeTab === 'measurements' && (
          <div role="tabpanel" id="tabpanel-measurements" aria-labelledby="tab-measurements" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-2">3D avatar</p>
                <AvatarViewer params={loaded.avatarParameters} initialView="free" initialVisualization="solid" />
              </div>
              <AsymmetryReportCard report={loaded.asymmetry} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-2">Extracted measurements</p>
              <MeasurementGrid
                measurements={loaded.measurements}
                unitSystem={unitSystem}
                heightCm={loaded.heightCm}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Composition */}
        {activeTab === 'composition' && (
          <div role="tabpanel" id="tabpanel-composition" aria-labelledby="tab-composition" className="space-y-3">
            <CompositionBreakdownCard
              composition={
                compRow?.ci_low_body_fat_pct != null && compRow?.ci_high_body_fat_pct != null
                  ? {
                      ...loaded.composition,
                      // Prefer T2 precision CI values over the JSONB blob's range when present.
                      bodyFatPct: {
                        low:  compRow.ci_low_body_fat_pct,
                        mid:  compRow.body_fat_pct ?? loaded.composition.bodyFatPct.mid,
                        high: compRow.ci_high_body_fat_pct,
                      },
                    }
                  : loaded.composition
              }
              sex={loaded.sex}
            />
          </div>
        )}

        {/* Tab 3: Compare (premium-gated). The locked tab is inert, so this only
            renders for premium / practitioner-managed views; the guard is kept
            as defense in depth. */}
        {activeTab === 'compare' && premiumTabsUnlocked && (
          <div role="tabpanel" id="tabpanel-compare" aria-labelledby="tab-compare">
            <ComparisonPanel defaultAfterSessionId={sessionId} />
          </div>
        )}

        {/* Tab 4: Insights (premium-gated, defense in depth as above). */}
        {activeTab === 'insights' && premiumTabsUnlocked && (
          <div role="tabpanel" id="tabpanel-insights" aria-labelledby="tab-insights">
            <ScanInsightsTab
              sessionId={sessionId}
              userId={loaded.userId}
              portalType={portalType}
            />
          </div>
        )}

        {/* Tab 5: Share */}
        {activeTab === 'share' && (
          <div role="tabpanel" id="tabpanel-share" aria-labelledby="tab-share">
            <ScanShareTab
              sessionId={sessionId}
              userId={loaded.userId}
              portalType={portalType}
            />
          </div>
        )}
      </div>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Loader2, Box } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCurrentUser } from '@/components/body-tracker/manual-input/useCurrentUser';
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
  const [loaded, setLoaded]       = useState<LoadedScan | null>(null);
  const [compRow, setCompRow]     = useState<ScanCompositionRow | null>(null);
  const [loading, setLoading]     = useState(true);
  const [missing, setMissing]     = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('measurements');

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
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors min-h-[36px] ${
                isActive
                  ? 'bg-[#2DA5A0]/20 text-[#2DA5A0] border border-[#2DA5A0]/35'
                  : 'bg-white/[0.04] text-white/55 border border-white/[0.07] hover:bg-white/[0.07] hover:text-white/75'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* PDF export: always visible across all tabs */}
      <div className="flex justify-end">
        <ScanPdfExportButton sessionId={sessionId} />
      </div>

      {/* Tab content */}
      <div role="tabpanel">
        {/* Tab 1: Measurements */}
        {activeTab === 'measurements' && (
          <div className="space-y-4">
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
          <div className="space-y-3">
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

        {/* Tab 3: Compare */}
        {activeTab === 'compare' && (
          <ComparisonPanel defaultAfterSessionId={sessionId} />
        )}

        {/* Tab 4: Insights */}
        {activeTab === 'insights' && (
          <ScanInsightsTab
            sessionId={sessionId}
            userId={loaded.userId}
            portalType={portalType}
          />
        )}

        {/* Tab 5: Share */}
        {activeTab === 'share' && (
          <ScanShareTab
            sessionId={sessionId}
            userId={loaded.userId}
            portalType={portalType}
          />
        )}
      </div>
    </section>
  );
}

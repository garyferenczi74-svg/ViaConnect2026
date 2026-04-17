'use client';

import { useEffect, useState } from 'react';
import { Loader2, Box, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCurrentUser } from '@/components/body-tracker/manual-input/useCurrentUser';
import { AvatarViewer } from './AvatarViewer';
import { CompositionBreakdownCard } from './CompositionBreakdownCard';
import { AsymmetryReportCard } from './AsymmetryReportCard';
import { MeasurementGrid } from './MeasurementGrid';
import { CalibrationDisclaimerBanner } from './CalibrationDisclaimerBanner';
import { BestPracticesCard } from './BestPracticesCard';
import { CalibrationNudgeCard } from './CalibrationNudgeCard';
import { ScanQualityIndicator } from './ScanQualityIndicator';
import { FutureMeGenerator } from './FutureMeGenerator';
import type { BodyModelParameters, CompositionEstimate, ExtractedMeasurements, AsymmetryReport } from '@/lib/arnold/scanning/types';

interface ScanResultsPanelProps {
  sessionId: string;
  refreshKey?: number;
}

interface LoadedScan {
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

export function ScanResultsPanel({ sessionId, refreshKey }: ScanResultsPanelProps) {
  const { unitSystem } = useCurrentUser();
  const [loaded, setLoaded] = useState<LoadedScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

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

      setLoaded({
        measurements: row.extracted_measurements as ExtractedMeasurements,
        composition: row.composition_estimate as CompositionEstimate,
        asymmetry: row.asymmetry_report as AsymmetryReport,
        avatarParameters: row.avatar_parameters as BodyModelParameters,
        qualityScore: (row.scan_quality_score as number | null) ?? 0,
        qualityIssues: ((row.quality_issues as string[] | null) ?? []),
        calibratedWithManual: (row.calibrated_with_manual as boolean | null) ?? false,
        heightCm: p?.height_cm ?? 170,
        weightKg: p?.weight_kg ?? 70,
        sex: p?.sex === 'female' ? 'female' : 'male',
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

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2DA5A0]/20">
          <Box className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
        </div>
        <h3 className="text-sm font-bold text-white">AI body scan results</h3>
      </div>

      <CalibrationDisclaimerBanner />
      <ScanQualityIndicator score={loaded.qualityScore} issues={loaded.qualityIssues} />

      {!loaded.calibratedWithManual && <CalibrationNudgeCard trigger="first_scan_complete" />}

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-2">3D avatar</p>
          <AvatarViewer params={loaded.avatarParameters} initialView="free" initialVisualization="solid" />
        </div>
        <div className="space-y-4">
          <CompositionBreakdownCard composition={loaded.composition} sex={loaded.sex} />
          <AsymmetryReportCard report={loaded.asymmetry} />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-2">Extracted measurements</p>
        <MeasurementGrid measurements={loaded.measurements} unitSystem={unitSystem} heightCm={loaded.heightCm} />
      </div>

      <details className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/50 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#E8803A]" strokeWidth={1.5} />
          FutureMe, project your goal avatar
        </summary>
        <div className="mt-4">
          <FutureMeGenerator currentParams={loaded.avatarParameters} currentWeightKg={loaded.weightKg} />
        </div>
      </details>

      <BestPracticesCard />
    </section>
  );
}

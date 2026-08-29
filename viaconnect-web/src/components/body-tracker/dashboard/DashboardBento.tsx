'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Scale,
  Ruler,
  Activity,
  FlaskConical,
  Target,
  TrendingUp,
  FileText,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SnapshotTile } from './SnapshotTile';
import { BiologicalAgeHeroTile } from './BiologicalAgeHeroTile';
import { ConnectionsStrip } from './ConnectionsStrip';
import { QuickLogCompactTile } from './QuickLogCompactTile';
import { BentoTile } from '@/components/ui/BentoTile';
import { useUserCrossReferenceData } from '@/hooks/body-tracker/useUserCrossReferenceData';
import { useArnoldRecommendation } from '@/hooks/body-tracker/useArnoldRecommendation';
import { useUserJourney } from '@/hooks/body-tracker/useUserJourney';
import { resolveHormonesReportChip } from '@/lib/kb/hormones/hormonesHubChip';
// Prompt 231: the FormaVision tile now opens the new 4-pose capture route
// directly (G79) instead of the composition surface. Wiring only, per the
// condition 26 scope guard (this tile is not being redesigned).
import { SCAN_CAPTURE_PATH } from '@/lib/scan/routes';
// Prompt 231 Task 14 (condition 17): the tile reads the latest 4-pose scan
// date + status through scanReadsShared.getLatestScan only, via
// GET /api/scan/latest. Type-only import - no server-only code enters this
// client bundle.
import type { ScanSummary } from '@/lib/scan/scanReadsShared';
import type { BiologicalAgeResult } from '@/lib/body-tracker/biological-age';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  ANALYTICS_PROVENANCE_EMPTY,
  bodyFatDisplay,
  entryToSourceName,
  unwrapRelatedEntry,
  vitalValueDisplay,
  weightBoundDisplay,
} from '@/lib/analytics/provenance';
import { resolveLatestBodyFat } from '@/lib/body-tracker/composition/resolveLatestBodyFat';

interface DashboardBentoProps {
  userId: string | null;
}

interface Snapshots {
  weightLbs: number | null;
  weightDelta: string | null;
  weightSourceName: string | null;
  bodyFatPct: number | null;
  bodyFatSourceName: string | null;
  leanMassLbs: number | null;
  scanDate: string | null;
  restingHr: number | null;
  restingHrSourceName: string | null;
  metabolicAge: number | null;
  metabolicAgeSourceName: string | null;
  hormonesChip: string | null;
  milestonesDone: number | null;
  milestonesTotal: number | null;
  labsCount: number | null;
  labsLatest: string | null;
  pctToGoal: number | null;
}

// Prompt 231 Task 14: display-only helpers for the additive scan chip. No
// status/count logic here - captureStatus comes straight from
// scanReadsShared and is only relabeled for display.
function formatScanChipDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function scanStatusLabel(status: ScanSummary['captureStatus']): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'partial':
      return 'Partial';
    case 'uploading':
      return 'Uploading';
    default:
      return 'Saved';
  }
}

const EMPTY: Snapshots = {
  weightLbs: null,
  weightDelta: null,
  weightSourceName: null,
  bodyFatPct: null,
  bodyFatSourceName: null,
  leanMassLbs: null,
  scanDate: null,
  restingHr: null,
  restingHrSourceName: null,
  metabolicAge: null,
  metabolicAgeSourceName: null,
  hormonesChip: null,
  milestonesDone: null,
  milestonesTotal: null,
  labsCount: null,
  labsLatest: null,
  pctToGoal: null,
};

export function DashboardBento({ userId }: DashboardBentoProps) {
  const reduced = useReducedMotion();
  const [refreshKey, setRefreshKey] = useState(0);
  const [bio, setBio] = useState<BiologicalAgeResult | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);
  const [bioLoading, setBioLoading] = useState(true);
  const [snap, setSnap] = useState<Snapshots>(EMPTY);
  const [snapError, setSnapError] = useState<string | null>(null);
  // Prompt 231 Task 14: latest 4-pose scan (condition 26 read-only wiring,
  // this tile is not being redesigned). null = not loaded yet or none.
  const [latestScan, setLatestScan] = useState<ScanSummary | null>(null);

  const { snapshot: crossRef, tier, loading: crossLoading } = useUserCrossReferenceData(userId);
  const {
    recommendation: arnoldRec,
    loading: recLoading,
    generating: recGenerating,
    error: recError,
    generate: recGenerate,
  } = useArnoldRecommendation(userId);
  const { activeJourney, startingSnapshot } = useUserJourney(userId);

  const loadBio = useCallback(async () => {
    setBioLoading(true);
    setBioError(null);
    try {
      const res = await fetch('/api/body-tracker/biological-age', { cache: 'no-store' });
      if (!res.ok) throw new Error('Could not load biological age');
      const json = (await res.json()) as BiologicalAgeResult;
      setBio(json);
    } catch (err) {
      setBioError(err instanceof Error ? err.message : 'Biological age failed');
    } finally {
      setBioLoading(false);
    }
  }, []);

  const loadSnaps = useCallback(async () => {
    if (!userId) return;
    setSnapError(null);
    try {
      const supabase = createClient();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekIso = weekAgo.toISOString();

      const [
        weightLatest,
        weightWeek,
        muscle,
        metab,
        labs,
        milestones,
        hormoneLabs,
        fatLatest,
      ] = await Promise.all([
        (supabase as any)
          .from('body_tracker_weight')
          .select('weight_lbs, body_fat_pct, goal_weight_lbs, created_at, body_tracker_entries(source, device_name, manual_source_id)')
          .eq('user_id', userId)
          .not('weight_lbs', 'is', null)
          .order('created_at', { ascending: false })
          .limit(2),
        (supabase as any)
          .from('body_tracker_weight')
          .select('weight_lbs, created_at')
          .eq('user_id', userId)
          .gte('created_at', weekIso)
          .order('created_at', { ascending: true })
          .limit(8),
        (supabase as any)
          .from('body_tracker_segmental_muscle')
          .select('total_muscle_mass_lbs, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        (supabase as any)
          .from('body_tracker_metabolic')
          .select('metabolic_age, resting_hr_bpm, body_tracker_entries(source, device_name, manual_source_id)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        (supabase as any)
          .from('lab_biomarkers')
          .select('name, collection_date, created_at')
          .eq('user_id', userId)
          .order('collection_date', { ascending: false })
          .limit(50),
        (supabase as any)
          .from('body_tracker_milestones')
          .select('id, completed, completed_at')
          .eq('user_id', userId)
          .gte('completed_at', weekIso)
          .limit(40),
        (supabase as any)
          .from('lab_biomarkers')
          .select('name, collection_date, measured_at, created_at')
          .eq('user_id', userId)
          .order('collection_date', { ascending: false })
          .limit(30),
        (supabase as any)
          .from('body_tracker_segmental_fat')
          .select('total_body_fat_pct, created_at, body_tracker_entries(source, device_name, manual_source_id)')
          .eq('user_id', userId)
          .not('total_body_fat_pct', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const wRows = weightLatest?.data ?? [];
      const currentW = wRows[0]?.weight_lbs != null ? Number(wRows[0].weight_lbs) : null;
      const prevW = wRows[1]?.weight_lbs != null ? Number(wRows[1].weight_lbs) : null;
      let weightDelta: string | null = null;
      if (currentW != null && prevW != null) {
        const d = currentW - prevW;
        weightDelta = `${d > 0 ? '+' : ''}${d.toFixed(1)} lbs`;
      }

      const labRows = labs?.data ?? [];
      const hormoneChip = resolveHormonesReportChip(
        (hormoneLabs?.data ?? []).map((r: any) => ({
          biomarker: String(r.name ?? ''),
          measured_at: r.measured_at ?? r.collection_date ?? null,
        })),
      );

      const ms = milestones?.data ?? [];
      const done = ms.filter((m: any) => m.completed === true || m.completed_at).length;

      let pctToGoal: number | null = null;
      const goal =
        wRows[0]?.goal_weight_lbs != null
          ? Number(wRows[0].goal_weight_lbs)
          : null;
      const start =
        activeJourney === 'muscle_building'
          ? startingSnapshot.muscle_mass_lbs
          : startingSnapshot.weight_lbs;
      if (
        typeof start === 'number' &&
        currentW != null &&
        goal != null &&
        Math.abs(start - goal) > 0.01
      ) {
        pctToGoal = Math.round(
          (Math.abs(start - currentW) / Math.abs(start - goal)) * 100,
        );
        pctToGoal = Math.max(0, Math.min(100, pctToGoal));
      }

      void weightWeek;

      const weightSourceName = entryToSourceName(unwrapRelatedEntry(wRows[0]?.body_tracker_entries));
      const metabSourceName = entryToSourceName(unwrapRelatedEntry(metab?.data?.body_tracker_entries));
      const fatRow = fatLatest?.data ?? null;
      const resolvedFat = resolveLatestBodyFat([
        {
          pct: fatRow?.total_body_fat_pct != null ? Number(fatRow.total_body_fat_pct) : null,
          createdAt: fatRow?.created_at != null ? String(fatRow.created_at) : null,
          sourceName: entryToSourceName(unwrapRelatedEntry(fatRow?.body_tracker_entries)),
        },
        {
          pct: wRows[0]?.body_fat_pct != null ? Number(wRows[0].body_fat_pct) : null,
          createdAt: wRows[0]?.created_at != null ? String(wRows[0].created_at) : null,
          sourceName: weightSourceName,
        },
      ]);

      setSnap({
        weightLbs: currentW,
        weightDelta,
        weightSourceName,
        bodyFatPct: resolvedFat.pct,
        bodyFatSourceName: resolvedFat.sourceName,
        leanMassLbs:
          muscle?.data?.total_muscle_mass_lbs != null
            ? Number(muscle.data.total_muscle_mass_lbs)
            : null,
        scanDate: muscle?.data?.created_at
          ? String(muscle.data.created_at).slice(0, 10)
          : null,
        restingHr:
          metab?.data?.resting_hr_bpm != null
            ? Number(metab.data.resting_hr_bpm)
            : null,
        restingHrSourceName: metabSourceName,
        metabolicAge:
          metab?.data?.metabolic_age != null
            ? Number(metab.data.metabolic_age)
            : null,
        metabolicAgeSourceName: metabSourceName,
        hormonesChip: hormoneChip ?? null,
        milestonesDone: ms.length ? done : null,
        milestonesTotal: ms.length || null,
        labsCount: labRows.length || null,
        labsLatest: labRows[0]?.collection_date
          ? String(labRows[0].collection_date).slice(0, 10)
          : null,
        pctToGoal,
      });
    } catch (err) {
      setSnapError(err instanceof Error ? err.message : 'Snapshot load failed');
    }
  }, [userId, activeJourney, startingSnapshot.muscle_mass_lbs, startingSnapshot.weight_lbs]);

  useEffect(() => {
    void loadBio();
  }, [loadBio, refreshKey]);

  useEffect(() => {
    void loadSnaps();
  }, [loadSnaps, refreshKey]);

  // Prompt 231 Task 14: single fetch to GET /api/scan/latest, which is a
  // thin auth boundary over scanReadsShared.getLatestScan (condition 17).
  // Fails open to null - never blocks or breaks the rest of the tile.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/scan/latest', { cache: 'no-store' });
        const body = (await res.json().catch(() => null)) as { ok?: boolean; scan?: ScanSummary | null } | null;
        if (!cancelled && res.ok && body?.ok) {
          setLatestScan(body.scan ?? null);
        }
      } catch {
        // Fail open: the tile still renders its other content.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  const fade = (i: number) =>
    reduced
      ? undefined
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: i * 0.04, duration: 0.2 },
        };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
      <motion.div className="md:col-span-2 lg:col-span-6 lg:row-span-2" {...fade(0)}>
        <BiologicalAgeHeroTile
          result={bio}
          loading={bioLoading}
          error={bioError}
          onRetry={loadBio}
          className="h-full"
        />
      </motion.div>

      <motion.div className="lg:col-span-6" {...fade(1)}>
        <SnapshotTile
          href="/body-tracker/progress"
          icon={TrendingUp}
          label="Goals and Progress"
          className="h-full"
          error={snapError}
          onRetry={loadSnaps}
        >
          {activeJourney ? (
            <>
              <p className="text-lg font-semibold text-white">
                {activeJourney === 'weight_loss' ? 'Weight Loss' : 'Muscle Building'}
              </p>
              <p className="text-sm text-white/60">
                {snap.pctToGoal != null
                  ? `${snap.pctToGoal}% to goal`
                  : 'Log weight to see percent to goal'}
              </p>
            </>
          ) : (
            <p className="text-sm text-white/60">Set your journey to track progress</p>
          )}
        </SnapshotTile>
      </motion.div>

      <motion.div className="lg:col-span-3" {...fade(2)}>
        <SnapshotTile href="/body-tracker/weight" icon={Scale} label="Weight">
          {(() => {
            const shown = weightBoundDisplay({
              kind: 'Now',
              pounds: snap.weightLbs,
              sourceName: snap.weightSourceName,
            });
            return shown.chip ? (
              <>
                <p className="text-2xl font-semibold tabular-nums text-white">
                  {shown.text}
                </p>
                <p className="text-xs text-white/55">{shown.chip}</p>
              </>
            ) : (
              <p className="text-sm text-white/60">{ANALYTICS_PROVENANCE_EMPTY}</p>
            );
          })()}
        </SnapshotTile>
      </motion.div>

      <motion.div className="lg:col-span-3" {...fade(3)}>
        <SnapshotTile href={SCAN_CAPTURE_PATH} icon={Ruler} label="Body Composition">
          {(() => {
            const fat = bodyFatDisplay({
              bodyFatPct: snap.bodyFatPct,
              sourceName: snap.bodyFatSourceName,
            });
            return fat.chip ? (
              <>
                <p className="text-lg font-semibold text-white">{fat.text}</p>
                <p className="text-xs text-white/55">{fat.chip}</p>
              </>
            ) : (
              <p className="text-sm text-white/60">{ANALYTICS_PROVENANCE_EMPTY}</p>
            );
          })()}
          {/* Prompt 231 Task 14 (condition 26): additive only, read-only via
              scanReadsShared.getLatestScan through /api/scan/latest. Never
              removes the body-fat readout above. */}
          {latestScan && (
            <p
              className="mt-1 text-[11px] text-white/45"
              data-testid="dashboard-latest-scan-chip"
            >
              Last scan: {formatScanChipDate(latestScan.date)} · {scanStatusLabel(latestScan.captureStatus)}
            </p>
          )}
        </SnapshotTile>
      </motion.div>

      <motion.div className="lg:col-span-3" {...fade(4)}>
        <SnapshotTile href="/body-tracker/metabolic" icon={Activity} label="Metabolic">
          {(() => {
            const rhr = vitalValueDisplay({
              value: snap.restingHr,
              unit: 'bpm',
              sourceName: snap.restingHrSourceName,
              round: true,
            });
            const meta = vitalValueDisplay({
              value: snap.metabolicAge,
              unit: 'yrs',
              sourceName: snap.metabolicAgeSourceName,
              round: true,
            });
            if (!rhr.chip && !meta.chip) {
              return <p className="text-sm text-white/60">{ANALYTICS_PROVENANCE_EMPTY}</p>;
            }
            return (
              <>
                <p className="text-lg font-semibold text-white">
                  {rhr.chip ? rhr.text : ANALYTICS_PROVENANCE_EMPTY}
                </p>
                <p className="text-xs text-white/55">
                  {rhr.chip ?? ''}
                  {meta.chip ? ` · Metabolic age ${meta.text} ${meta.chip}` : ''}
                </p>
              </>
            );
          })()}
        </SnapshotTile>
      </motion.div>

      <motion.div className="lg:col-span-3" {...fade(5)}>
        <SnapshotTile href="/body-tracker/hormones" icon={FlaskConical} label="Hormones">
          {snap.hormonesChip ? (
            <>
              <p className="text-lg font-semibold text-white">Labs on file</p>
              <p className="text-xs text-white/55">{snap.hormonesChip}</p>
            </>
          ) : (
            <p className="text-sm text-white/60">Set up your hormone report</p>
          )}
        </SnapshotTile>
      </motion.div>

      <motion.div className="lg:col-span-3" {...fade(6)}>
        <SnapshotTile href="/body-tracker/milestones" icon={Target} label="Milestones">
          {snap.milestonesTotal != null ? (
            <>
              <p className="text-2xl font-semibold tabular-nums text-white">
                {snap.milestonesDone ?? 0}
                <span className="text-sm font-medium text-white/50">
                  {' '}
                  / {snap.milestonesTotal}
                </span>
              </p>
              <p className="text-xs text-white/55">Complete this week · Helix rewards</p>
            </>
          ) : (
            <p className="text-sm text-white/60">Set weekly goals</p>
          )}
        </SnapshotTile>
      </motion.div>

      <motion.div className="lg:col-span-3" {...fade(7)}>
        <SnapshotTile href="/lab-results" icon={FileText} label="Lab Results">
          {snap.labsCount != null && snap.labsCount > 0 ? (
            <>
              <p className="text-2xl font-semibold tabular-nums text-white">{snap.labsCount}</p>
              <p className="text-xs text-white/55">
                Biomarkers{snap.labsLatest ? ` · Latest ${snap.labsLatest}` : ''}
              </p>
            </>
          ) : (
            <p className="text-sm text-white/60">Upload labs</p>
          )}
        </SnapshotTile>
      </motion.div>

      <motion.div
        className="col-span-1 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:grid-rows-2 sm:auto-rows-fr md:col-span-2 lg:col-span-12"
        {...fade(8)}
      >
        <div className="h-full min-h-[160px]">
          <QuickLogCompactTile
            className="h-full"
            onSaved={() => setRefreshKey((k) => k + 1)}
          />
        </div>

        <div className="h-full min-h-[160px]">
          {crossLoading ? (
            <BentoTile
              className="h-full min-h-[160px] rounded-[20px]"
              scrim={false}
              contentClassName="gap-3"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                Cross-Reference Sources
              </span>
              <p className="text-sm text-white/50">Loading connections...</p>
            </BentoTile>
          ) : (
            <ConnectionsStrip availability={crossRef.availability} tier={tier} />
          )}
        </div>

        <div className="h-full min-h-[160px]">
          <BentoTile
            className="flex h-full min-h-[160px] flex-col rounded-[20px]"
            scrim={false}
            contentClassName="gap-3 flex-1"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                Arnold&apos;s Recommendation
              </span>
            </div>
            <p className="text-sm text-white/75">
              {arnoldRec?.text ??
                (recError ?? 'Generate a personalized note from your connected sources.')}
            </p>
            <button
              type="button"
              disabled={recLoading || recGenerating}
              onClick={() => void recGenerate()}
              className="mt-auto inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-4 text-sm font-medium text-[#2DA5A0] disabled:opacity-50"
            >
              {recGenerating ? 'Generating...' : 'Generate'}
            </button>
          </BentoTile>
        </div>

        <div className="h-full min-h-[160px]">
          <Link href="/body-tracker" className="block h-full">
            <BentoTile
              interactive
              className="flex h-full min-h-[160px] flex-col rounded-[20px]"
              scrim={false}
              contentClassName="gap-2 flex-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                    Weekly Report
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
              </div>
              <p className="mt-auto text-sm text-white/75">
                Want deeper insights? Generate a weekly report from My Biology.
              </p>
            </BentoTile>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

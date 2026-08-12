'use client';

// Prompt 210h Revision C: dedicated FormaVision tab.
// Hosts the full 3D anatomical body (210g engine) and ghost comparison.
// Body Composition remains the numbers / manual / 2D surface.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BackToHubLink } from '@/components/body-tracker/hub/BackToHubLink';
import {
  CompositionSectionToggle,
  type CompositionNavTab,
} from '@/components/body-tracker/CompositionSectionToggle';
import {
  BodyCompositionAvatar,
  SelectBodyPartControl,
  RenderTierProvider,
} from '@/components/formavision';
import { JourneyTimeline, type JourneyScanReadout } from '@/components/formavision/JourneyTimeline';
import { FutureSelfPanel } from '@/components/formavision/FutureSelfPanel';
import { useReducedMotion } from '@/components/body-tracker/HoverSystem/useReducedMotion';
import { SegmentalHeatMap } from '@/components/body-tracker/SegmentalHeatMap';
import { useCompositionHistory } from '@/hooks/body-tracker/useCompositionHistory';
import { useCircumferenceHistory } from '@/hooks/body-tracker/useCircumferenceHistory';
import { useCircumferenceData } from '@/hooks/body-tracker/useCircumferenceData';
import { useUserBiologicalSex } from '@/hooks/body-tracker/useUserBiologicalSex';
import { useCurrentUser } from '@/components/body-tracker/manual-input';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { buildSegmentTintsFromChange } from '@/lib/formavision/geometry/composSegmentTints';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';
import { useAvatarTelemetry } from '@/lib/formavision/telemetry/useAvatarTelemetry';

export default function FormaVisionPage() {
  return (
    <RenderTierProvider>
      <FormaVisionSurface />
    </RenderTierProvider>
  );
}

function FormaVisionSurface() {
  const router = useRouter();
  const { id: userId } = useCurrentUser();
  const reducedMotion = useReducedMotion();
  const { sex: caqSex } = useUserBiologicalSex(userId ?? null);

  const onSectionNav = useCallback(
    (tab: CompositionNavTab) => {
      if (tab === 'formavision') return;
      router.push(`/body-tracker/composition?section=${tab}`);
    },
    [router],
  );
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  const [scrubVector, setScrubVector] = useState<BodyParamVector | null>(null);
  const [ghostVector, setGhostVector] = useState<BodyParamVector | null>(null);
  const [showGhost, setShowGhost] = useState(false);
  const [comparisonOverlayOn, setComparisonOverlayOn] = useState(false);
  const unit = 'in' as const;

  useEffect(() => {
    if (caqSex === 'male' || caqSex === 'female') setGender(caqSex);
  }, [caqSex]);

  const { emit: telEmit, emitOnce: telEmitOnce } = useAvatarTelemetry(userId);
  useEffect(() => {
    if (!userId) return;
    telEmitOnce('formavision.tab_entered', { surface: 'formavision' });
  }, [userId, telEmitOnce]);

  const composHistory = useCompositionHistory(userId ?? null);
  const circHistory = useCircumferenceHistory(userId ?? null, unit);
  const { data: circumferenceData } = useCircumferenceData({
    userId: userId ?? null,
    displayUnit: unit,
  });
  const snapshot = composHistory.latest;

  const firstScanVector = useMemo<BodyParamVector | null>(() => {
    const first = composHistory.first;
    if (!first) return null;
    return scanToParamVector({
      snapshot: first,
      circumferences: circHistory.first?.measurements ?? null,
      sex: gender,
      unit,
    });
  }, [composHistory.first, circHistory.first, gender, unit]);

  const hasScanData = Boolean(snapshot || circumferenceData.latest);

  const journeyVectors = useMemo(
    () =>
      composHistory.snapshots.map((snap, i) => {
        const circ =
          circHistory.entries.find((e) => e.recordedAt === snap.recordedAt)?.measurements ??
          circHistory.entries[i]?.measurements ??
          null;
        return scanToParamVector({
          snapshot: snap,
          circumferences: circ,
          sex: gender,
          unit,
        });
      }),
    [composHistory.snapshots, circHistory.entries, gender, unit],
  );

  const journeyReadouts = useMemo<JourneyScanReadout[]>(
    () =>
      composHistory.snapshots.map((snap, i) => {
        const circ =
          circHistory.entries.find((e) => e.recordedAt === snap.recordedAt)?.measurements ??
          circHistory.entries[i]?.measurements ??
          null;
        return {
          recordedAt: snap.recordedAt,
          totalBodyFatPct: snap.totalBodyFatPct,
          waist: circ?.waist ?? null,
        };
      }),
    [composHistory.snapshots, circHistory.entries],
  );

  const improvementTints = useMemo(() => {
    if (!composHistory.first || !composHistory.latest) return null;
    return buildSegmentTintsFromChange(
      composHistory.first.regionFatPct,
      composHistory.latest.regionFatPct,
      'fat',
    );
  }, [composHistory.first, composHistory.latest]);

  const effectiveGhost =
    comparisonOverlayOn && firstScanVector ? firstScanVector : ghostVector;
  const effectiveShowGhost =
    comparisonOverlayOn && firstScanVector
      ? true
      : comparisonOverlayOn
        ? false
        : showGhost;

  const onComparisonToggle = useCallback(() => {
    setComparisonOverlayOn((v) => {
      const next = !v;
      if (next) telEmit('formavision.ghost_compared', { baseline: 'first_scan' });
      return next;
    });
  }, [telEmit]);

  useEffect(() => {
    if (effectiveShowGhost && improvementTints && Object.keys(improvementTints).length > 0) {
      telEmitOnce('formavision.improvement_viewed', { mode: 'ghost' });
    }
  }, [effectiveShowGhost, improvementTints, telEmitOnce]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-16 pt-4 md:px-6">
      <BackToHubLink />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <CompositionSectionToggle active="formavision" onChange={onSectionNav} />
      </div>

      <header className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-md sm:p-5">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-[#B75E18]">Forma</span>
          <span className="text-white">Vision</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-white/65">
          {hasScanData
            ? 'Your body, built from your scan and measurements. A ghost overlay shows where you started.'
            : 'Scan your body or log measurements to build your 3D form. No photographic surface reconstruction.'}
        </p>
      </header>

      {!hasScanData && (
        <div
          data-testid="formavision-empty-state"
          className="rounded-2xl border border-white/10 bg-[#0D1520]/60 p-6 text-center"
        >
          <p className="text-sm text-white/70">
            No scan or measurements yet. Start a body scan or enter measurements to render your 3D
            body.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/body-tracker/photos"
              className="min-h-[44px] rounded-xl border border-[#B75E18]/50 bg-[#B75E18]/15 px-4 py-2.5 text-sm font-medium text-[#B75E18]"
            >
              Scan My Body
            </Link>
            <Link
              href="/body-tracker/composition"
              className="min-h-[44px] rounded-xl border border-white/20 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/80"
            >
              Log measurements
            </Link>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setGender('male')}
          className={`min-h-[44px] flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium ${
            gender === 'male'
              ? 'border-[#2DA5A0]/60 bg-[#2DA5A0]/15 text-[#2DA5A0]'
              : 'border-white/20 bg-white/[0.04] text-white/60'
          }`}
        >
          Male
        </button>
        <button
          type="button"
          onClick={() => setGender('female')}
          className={`min-h-[44px] flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium ${
            gender === 'female'
              ? 'border-[#B75E18]/60 bg-[#B75E18]/15 text-[#B75E18]'
              : 'border-white/20 bg-white/[0.04] text-white/60'
          }`}
        >
          Female
        </button>
      </div>

      <div
        data-testid="formavision-canvas-grid"
        className="relative min-h-[480px] rounded-2xl border border-white/[0.08] bg-transparent p-4 lg:min-h-[560px]"
      >
        <div className="pointer-events-none absolute left-2 top-2 z-10">
          <div className="pointer-events-auto">
            <SelectBodyPartControl value={selectedBodyPart} onChange={setSelectedBodyPart} />
          </div>
        </div>
        <div className="pointer-events-auto absolute right-2 top-2 z-10 flex max-w-[12rem] flex-col items-end gap-1">
          <button
            type="button"
            data-testid="comparison-overlay-toggle"
            aria-pressed={comparisonOverlayOn}
            disabled={!firstScanVector}
            onClick={onComparisonToggle}
            className="rounded-lg border border-white/15 bg-[#0D1520]/85 px-2.5 py-1.5 text-[11px] font-medium text-white/80 disabled:opacity-40"
          >
            {comparisonOverlayOn ? 'Hide Comparison Overlay' : 'Show Comparison Overlay'}
          </button>
          {!firstScanVector && (
            <p className="text-right text-[10px] leading-snug text-white/45">
              Comparison needs a prior scan. Complete a second scan to overlay your first body.
            </p>
          )}
        </div>

        <BodyCompositionAvatar
          sex={gender}
          scan={snapshot}
          firstScan={composHistory.first}
          circumferences={circumferenceData.latest}
          unit={unit}
          activeTab="bodyFat"
          selectedBodyPart={selectedBodyPart}
          onSelectBodyPart={setSelectedBodyPart}
          reducedMotion={reducedMotion}
          segmentTints={effectiveShowGhost ? improvementTints : null}
          scrubVector={scrubVector}
          ghostVector={effectiveGhost}
          showGhost={effectiveShowGhost}
        >
          <div className="flex h-full min-h-[400px] items-center justify-center">
            <SegmentalHeatMap sex={gender} segmentStatuses={{}} />
          </div>
        </BodyCompositionAvatar>
      </div>

      {journeyVectors.length > 1 && (
        <JourneyTimeline
          vectors={journeyVectors}
          readouts={journeyReadouts}
          unit={unit}
          reducedMotion={reducedMotion}
          onScrub={setScrubVector}
          onPlay={() => telEmit('formavision.journey_played', {})}
        />
      )}

      <FutureSelfPanel
        snapshot={snapshot}
        circumferences={circumferenceData.latest}
        sex={gender}
        unit={unit}
        userId={userId ?? null}
        reducedMotion={reducedMotion}
        onGhostChange={(v, s) => {
          if (!comparisonOverlayOn) {
            setGhostVector(v);
            setShowGhost(s);
          }
        }}
        onUserToggle={(on) => telEmit('formavision.future_self_toggled', { on })}
      />
    </div>
  );
}

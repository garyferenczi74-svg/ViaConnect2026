'use client';

/**
 * src/components/formavision/ClipCreatorSurface.tsx
 *
 * Prompt 211a Workstream 1: the clip creator surface (the growth engine). Lets a
 * consumer turn their real transformation into a shareable clip.
 *
 * WHAT IT DOES:
 *   - Range picker: choose a start + end scan over the REAL scan history.
 *   - Choose which stats appear, or none (the stats overlay is opt-in, per stat).
 *   - EXPLICIT consent gate: nothing leaves the device until the user confirms.
 *   - Preview: shows the exact caption / static-card the clip will carry (same
 *     one-source numbers as the cards).
 *   - Encode: on desktop + modern Android, MediaRecorder(canvas.captureStream())
 *     -> WebM (no dependency). On iOS WKWebView / the 2D-floor tier / no-WebGL, a
 *     graceful STATIC-CARD fallback (same stats, honest "coming to iOS" note),
 *     NEVER a fake video, NEVER a raw photo.
 *   - Share: native share via @capacitor/share IF present (it is ABSENT per the
 *     baseline and package.json is locked), so desktop download + a documented
 *     "native share pending @capacitor/share" note.
 *
 * ONE-SOURCE: every number shown comes from the ClipCaption built by buildClipCaption
 * from computeCompositionDeltas (the SAME deltas the page cards consume). Nothing is
 * recomputed or fabricated here.
 *
 * NO RAW PHOTO: the encode captures the WebGL avatar canvas (procedural texture only,
 * baseline item 1+2); the caption references only token colors. No photo is read.
 *
 * COPY: Hannah-toned, Kelsey-clearable placeholder, zero dashes.
 *
 * Standing rules: Lucide strokeWidth 1.5, no emojis, no em / en dashes, tokens only,
 * Instrument Sans, responsive (w-full, min-h-[44px] touch targets), zero any.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Film, Download, Share2, ShieldCheck, Loader2, Eye, EyeOff, ImageIcon } from 'lucide-react';
import type { RenderTier } from '@/lib/formavision/tier/types';
import type { CompositionDeltasResult } from '@/lib/formavision/deltas/compositionDeltas';
import { buildClipCaption } from '@/lib/formavision/clip/composition';
import { lowConfidenceRangeWarning, type RangeScanConfidence } from '@/lib/formavision/clip/composition';
import { buildStaticCardFallback, type StaticCardReason } from '@/lib/formavision/clip/staticCardFallback';
import {
  canSupportOnDeviceEncode,
  buildCapturePlan,
  rangeLength,
  recordCanvasToWebM,
  type CaptureRange,
} from '@/lib/formavision/clip/captureController';
import { emitClipEvent, type ClipShareChannel } from '@/lib/formavision/clip/clipTelemetry';
import {
  shouldCelebrateFirstShare,
  markFirstShareCelebrated,
} from '@/lib/formavision/clip/clipShareMoment';
import { ClipShareMoment } from './ClipShareMoment';

// One scan in the chosen-able history: its date + optional confidence, oldest first.
export interface ClipScanRef {
  recordedAt: string;
  /** Numeric confidence (0-1) of this scan's body-fat estimate, or null when UNKNOWN. */
  confidence: number | null;
}

export interface ClipCreatorSurfaceProps {
  /** Authenticated user id; the surface is inert until it resolves. */
  userId: string | null;
  /** The active render tier (from useRenderTier). '2d' forces the static-card path. */
  tier: RenderTier;
  /** The SAME deltas the page cards consume (computeCompositionDeltas). One-source. */
  deltas: CompositionDeltasResult;
  /** The choose-able scan history, oldest first (dates + confidence). */
  scans: ClipScanRef[];
  /**
   * Returns the live avatar canvas element to capture, or null when unavailable.
   * The page provides this from a ref to the FormaVision canvas (data-testid
   * formavision-avatar-canvas). Only used on the WebM path.
   */
  getCanvas: () => HTMLCanvasElement | null;
  /**
   * Drive the morph play (JourneyTimeline PLAY, 4s) over the chosen range. The page
   * wires this to the timeline play math (lerpParamVector across the two real scan
   * vectors). Receives the chosen range indices. Only used on the WebM path.
   */
  playMorph: (startIndex: number, endIndex: number) => void;
  /**
   * Flip the r3f frameloop to "always" (true) during recording and back to demand
   * (false) after. The page wires this to the BodyCompositionAvatar frameloopMode
   * prop. Only used on the WebM path.
   */
  setFrameloopAlways: (always: boolean) => void;
  /** Coarse surface id for telemetry (defaults to the composition route). */
  surface?: string;
  className?: string;
}

const DEFAULT_SURFACE = '/body-tracker/composition';

// Detected iOS (WKWebView / mobile Safari). iOS gets the "coming to iOS" note on the
// static-card fallback. Typed narrowly; no @capacitor/core hard dependency.
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPadOS 13+ reports as Mac; the touch-point check disambiguates a real iPad.
  const iPadOS = /Macintosh/.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
}

// @capacitor/share is ABSENT (baseline) and package.json is locked, so we never
// import it. Native share is therefore "pending @capacitor/share"; today every
// platform falls back to a download. This documents that honestly at the call site.
function resolveShareChannel(): ClipShareChannel {
  // No @capacitor/share dependency -> always the download channel today.
  return 'download';
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'consent' }
  | { kind: 'encoding' }
  | { kind: 'ready_webm'; url: string }
  | { kind: 'ready_card' };

export function ClipCreatorSurface({
  userId,
  tier,
  deltas,
  scans,
  getCanvas,
  playMorph,
  setFrameloopAlways,
  surface,
  className,
}: ClipCreatorSurfaceProps) {
  const surfaceId = surface ?? DEFAULT_SURFACE;
  const scanCount = scans.length;

  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  // Range: default to the full span (first .. latest) so the clip tells the whole story.
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(Math.max(0, scanCount - 1));
  // The stats overlay is opt-in. Default ON so progress is celebrated, but the user
  // can hide every stat (share the morph alone). "choose which stats appear or none".
  const [statsShown, setStatsShown] = useState(true);
  const [showShareMoment, setShowShareMoment] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const range: CaptureRange = useMemo(() => ({ startIndex, endIndex }), [startIndex, endIndex]);
  const plan = useMemo(() => buildCapturePlan(range, scanCount), [range, scanCount]);

  // Dates for the chosen range, clamped to bounds.
  const firstScanDate = scans[plan.range.startIndex]?.recordedAt ?? null;
  const latestScanDate = scans[plan.range.endIndex]?.recordedAt ?? null;
  const latestConfidence = scans[plan.range.endIndex]?.confidence ?? null;

  // The one-source caption. When stats are hidden we still build it (for the fallback
  // note + telemetry) but the preview / overlay omit the numbers.
  const caption = useMemo(
    () =>
      buildClipCaption({
        deltas,
        firstScanDate,
        latestScanDate,
        latestBodyFatConfidence: latestConfidence,
      }),
    [deltas, firstScanDate, latestScanDate, latestConfidence],
  );

  // Low-confidence heads-up over the chosen range (warn BEFORE render).
  const rangeConfidences: RangeScanConfidence[] = useMemo(
    () =>
      scans
        .slice(plan.range.startIndex, plan.range.endIndex + 1)
        .map((s) => ({ recordedAt: s.recordedAt, confidence: s.confidence })),
    [scans, plan.range.startIndex, plan.range.endIndex],
  );
  const lowConfWarning = useMemo(() => lowConfidenceRangeWarning(rangeConfidences), [rangeConfidences]);

  const canEncode = useMemo(() => canSupportOnDeviceEncode(tier), [tier]);
  // isIOS() reads navigator.userAgent which never changes during the component
  // lifetime, so memoize once to avoid re-invoking on every render.
  const ios = useMemo(() => isIOS(), []);
  const staticReason: StaticCardReason = tier === '2d' ? 'tier2d' : ios ? 'ios' : 'no_encode';
  const staticCard = useMemo(() => buildStaticCardFallback(caption, staticReason), [caption, staticReason]);

  const disabled = !userId || !plan.valid || phase.kind === 'encoding';

  const revokeUrl = useCallback(() => {
    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {
        /* ignore */
      }
      objectUrlRef.current = null;
    }
  }, []);

  // The consent gate is the ONLY path to producing anything. Nothing encodes or
  // leaves the device until the user explicitly confirms here.
  const openConsent = useCallback(() => {
    setPhase({ kind: 'consent' });
  }, []);

  // Confirmed consent -> produce the artifact. WebM on a capable device; the honest
  // static card otherwise. Emits clip_created with coarse fields only.
  const confirmAndCreate = useCallback(async () => {
    const rl = rangeLength(plan.range);
    const statsVis = statsShown ? 'shown' : 'hidden';

    if (!canEncode) {
      // Static-card fallback path: no video is ever fabricated.
      setPhase({ kind: 'ready_card' });
      void emitClipEvent(userId, 'formavision.clip_created', {
        surface: surfaceId,
        mode: 'static_card',
        range_length: rl,
        stats_shown_or_hidden: statsVis,
        ok: true,
      });
      return;
    }

    const canvas = getCanvas();
    if (!canvas) {
      // No live canvas to capture -> honest static-card fallback, never a fake video.
      setPhase({ kind: 'ready_card' });
      void emitClipEvent(userId, 'formavision.clip_created', {
        surface: surfaceId,
        mode: 'static_card',
        range_length: rl,
        stats_shown_or_hidden: statsVis,
        ok: true,
      });
      return;
    }

    setPhase({ kind: 'encoding' });
    try {
      const { blob } = await recordCanvasToWebM({
        canvas,
        // Bind the chosen range into the no-arg playMorph the controller calls.
        playMorph: () => playMorph(plan.range.startIndex, plan.range.endIndex),
        plan,
        setFrameloopAlways,
      });
      revokeUrl();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setPhase({ kind: 'ready_webm', url });
      void emitClipEvent(userId, 'formavision.clip_created', {
        surface: surfaceId,
        mode: 'webm',
        range_length: rl,
        stats_shown_or_hidden: statsVis,
        ok: true,
      });
    } catch {
      // Encode failed -> ensure the frameloop is restored and fall back to the card.
      setFrameloopAlways(false);
      setPhase({ kind: 'ready_card' });
      void emitClipEvent(userId, 'formavision.clip_created', {
        surface: surfaceId,
        mode: 'static_card',
        range_length: rl,
        stats_shown_or_hidden: statsVis,
        ok: false,
      });
    }
  }, [canEncode, getCanvas, plan, playMorph, revokeUrl, setFrameloopAlways, statsShown, surfaceId, userId]);

  // Share / download the produced artifact. @capacitor/share is absent, so this is a
  // download today. Emits clip_shared and fires the consumer-only first-share moment.
  const shareArtifact = useCallback(
    (href: string, filename: string) => {
      const channel = resolveShareChannel();
      let ok = true;
      try {
        if (typeof window !== 'undefined') {
          const a = document.createElement('a');
          a.href = href;
          a.rel = 'noopener noreferrer';
          a.target = '_blank';
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch {
        ok = false;
      }
      void emitClipEvent(userId, 'formavision.clip_shared', {
        surface: surfaceId,
        channel,
        range_length: rangeLength(plan.range),
        stats_shown_or_hidden: statsShown ? 'shown' : 'hidden',
        ok,
      });
      // Consumer-only Helix first-share moment (celebrate-only, never writes helix).
      if (ok && shouldCelebrateFirstShare()) {
        markFirstShareCelebrated();
        setShowShareMoment(true);
      }
    },
    [plan.range, statsShown, surfaceId, userId],
  );

  return (
    <div
      data-testid="clip-creator-surface"
      className={`rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-sm sm:p-5 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2">
        <Film className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden="true" />
        <h3 className="text-sm font-semibold text-white">Share your transformation</h3>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-white/60">
        Turn your real progress into a short clip you can share. Nothing leaves your device until you say so.
      </p>

      {/* Honest empty state: a clip needs at least two scans. */}
      {scanCount < 2 ? (
        <p data-testid="clip-creator-empty" className="mt-4 text-sm text-white/60">
          Log another scan to unlock your transformation clip. Two scans is all it takes to see your journey move.
        </p>
      ) : (
        <>
          {/* Range picker: start + end over the real scans (oldest first). */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-white/60">
              From scan
              <select
                data-testid="clip-range-start"
                value={plan.range.startIndex}
                onChange={(e) => setStartIndex(Number(e.target.value))}
                className="min-h-[44px] rounded-lg border border-white/15 bg-[#1A2744] px-3 text-base text-white"
              >
                {scans.map((s, i) => (
                  <option key={`start-${i}`} value={i} disabled={i >= endIndex}>
                    {new Date(s.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60">
              To scan
              <select
                data-testid="clip-range-end"
                value={plan.range.endIndex}
                onChange={(e) => setEndIndex(Number(e.target.value))}
                className="min-h-[44px] rounded-lg border border-white/15 bg-[#1A2744] px-3 text-base text-white"
              >
                {scans.map((s, i) => (
                  <option key={`end-${i}`} value={i} disabled={i <= startIndex}>
                    {new Date(s.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Choose which stats appear, or none. */}
          <button
            type="button"
            data-testid="clip-stats-toggle"
            onClick={() => setStatsShown((v) => !v)}
            aria-pressed={statsShown}
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/[0.08]"
          >
            {statsShown ? (
              <Eye className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-white/50" strokeWidth={1.5} aria-hidden="true" />
            )}
            {statsShown ? 'Stats shown on the clip' : 'Stats hidden (morph only)'}
          </button>

          {/* Low-confidence heads-up over the chosen range (before render). */}
          {lowConfWarning.message && (
            <p data-testid="clip-low-confidence" className="mt-3 rounded-lg border border-[#B75E18]/40 bg-[#B75E18]/10 p-2.5 text-xs text-white/75">
              {lowConfWarning.message}
            </p>
          )}

          {/* Preview: the exact caption / card the clip will carry. Same numbers as the cards. */}
          <div data-testid="clip-preview" className="mt-4 rounded-xl border border-white/[0.08] bg-[#1A2744]/70 p-3">
            <p className="text-[11px] uppercase tracking-wider text-white/40">Preview</p>
            <p className="mt-1 text-xs text-white/70">{caption.dateSpanText}</p>
            {statsShown && caption.headline && (
              <p data-testid="clip-preview-headline" className="mt-1 text-sm font-semibold text-white">
                {caption.headline.label} {caption.headline.fromText} to {caption.headline.toText}
                {'  '}
                <span className="text-[#2DA5A0]">
                  {caption.headline.changeText}{' '}
                  {caption.headline.arrow === 'down' ? 'down' : caption.headline.arrow === 'up' ? 'up' : 'steady'}
                </span>
              </p>
            )}
            {statsShown && caption.estimatedMarkerText && (
              <p className="mt-1 text-[10px] text-[#B75E18]">{caption.estimatedMarkerText}</p>
            )}
            <p className="mt-2 text-[10px] text-white/40">{caption.wordmark}</p>
            {!canEncode && (
              <p data-testid="clip-fallback-note" className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-white/55">
                <ImageIcon className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                {staticCard.note}
              </p>
            )}
          </div>

          {/* Actions: idle -> open the consent gate. */}
          {phase.kind === 'idle' && (
            <button
              type="button"
              data-testid="clip-create-open"
              disabled={disabled}
              onClick={openConsent}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#5B8DEF]/30 bg-[#2A4C9E]/15 px-3 py-2 text-xs font-medium text-white min-h-[44px] transition-all hover:bg-[#2A4C9E]/25 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Film className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              {canEncode ? 'Create clip' : 'Create progress card'}
            </button>
          )}

          {/* EXPLICIT consent gate: nothing leaves the device until this is confirmed. */}
          {phase.kind === 'consent' && (
            <div data-testid="clip-consent-gate" className="mt-4 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/10 p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden="true" />
                <p className="text-xs font-semibold text-white">Before we make this, one thing</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-white/75">
                {/* KELSEY-CLEARABLE PLACEHOLDER COPY (Hannah-toned, zero dashes). Kelsey to
                    finalize the consent wording. */}
                This clip is built right here on your device from your own scans. It shows your body outline and the stats you chose to include. Nothing is uploaded and nothing is shared until you tap share yourself. You are always in control of who sees it.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  data-testid="clip-consent-confirm"
                  onClick={() => void confirmAndCreate()}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#2DA5A0]/50 bg-[#2DA5A0]/15 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#2DA5A0]/25"
                >
                  I understand, make it
                </button>
                <button
                  type="button"
                  data-testid="clip-consent-cancel"
                  onClick={() => setPhase({ kind: 'idle' })}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.08]"
                >
                  Not yet
                </button>
              </div>
            </div>
          )}

          {phase.kind === 'encoding' && (
            <p data-testid="clip-encoding" className="mt-4 inline-flex items-center gap-1.5 text-xs text-white/70">
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} aria-hidden="true" />
              Building your clip right here on your device.
            </p>
          )}

          {/* Ready: WebM clip -> download (native share pending @capacitor/share). */}
          {phase.kind === 'ready_webm' && (
            <button
              type="button"
              data-testid="clip-share-webm"
              onClick={() => shareArtifact(phase.url, 'via-cura-transformation.webm')}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/50 bg-[#2DA5A0]/15 px-3 py-2 text-xs font-medium text-white min-h-[44px] transition-colors hover:bg-[#2DA5A0]/25 sm:w-auto"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              Save your clip
            </button>
          )}

          {/* Ready: static card fallback. Shares the honest still (no fake video). The
              card image itself is rendered by the caller from staticCard data; here we
              expose the same download affordance and the honest note. */}
          {phase.kind === 'ready_card' && (
            <div className="mt-4">
              <p data-testid="clip-card-ready-note" className="text-xs text-white/70">{staticCard.note}</p>
              <p className="mt-1 text-[11px] text-white/45">
                Native share is pending @capacitor/share. For now your progress card saves to your device.
              </p>
            </div>
          )}

        </>
      )}

      {/* Consumer-only Helix first-share moment (celebrate-only, never writes helix). */}
      <ClipShareMoment show={showShareMoment} onDismiss={() => setShowShareMoment(false)} />
    </div>
  );
}

export default ClipCreatorSurface;

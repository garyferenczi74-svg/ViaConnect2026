'use client';

// Prompt #170 Phase 1l: NutriVisionTab top-level orchestrator.
//
// State machine: idle, capturing, analyzing, reviewing, saving, confirmed.
// Each phase swaps the central card. Recent meals load on mount via supabase
// client. The save flow posts NutriVisionMealInsertPayload to /api/nutrition/
// meals and the response drives SaveConfirmation.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Camera, ChevronLeft, HelpCircle, ImageUp, Mic, Settings, X } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { CaptureResult, CaptureSource } from '@/lib/capacitor/camera-capture';
import { detectPlatform } from '@/lib/capacitor/camera-capture';
import { WebCameraPreview } from './WebCameraPreview';
import { mapAIErrorToClass } from '@/lib/nutrition/vision/error-class-mapper';
import { writeNutrivisionManualLogHandoff } from '@/hooks/useNutrivisionManualLogHandoff';
import { MobileHeroBackground } from '@/components/ui/MobileHeroBackground';
import { CameraCapture } from './CameraCapture';
import { AnalysisProgress } from './AnalysisProgress';
import { AnalysisResult } from './AnalysisResult';
import { ErrorStateCard } from './ErrorStateCard';
// Prompt 172 Phase 2 (172c): SaveConfirmation is no longer the post save
// destination. AnalysisResult stays mounted and renders the post save state
// in place. The component file is preserved for its own tests; nothing in
// the result surface mounts it anymore.
import { useCameraCapture } from './hooks/useCameraCapture';
import { useNutriVisionAnalysis } from './hooks/useNutriVisionAnalysis';
import { useMealItemEdits } from './hooks/useMealItemEdits';
import { detectMealTypeForNow } from './types';
// Prompt 175m (2026-06-05): the 170l Phase 1c-2 barcode entry path
// (BarcodeScannerOverlay + ProductConfirmation + NotFoundFallback +
// ManualBarcodeEntry + MacroEditPanel + OFF lookup machinery) was
// removed from the Nutrition log surface per Gary. The /api/nutrition/
// barcode/* routes remain in the codebase for any non-UI caller.
// Prompt 170n Phase C: Voice-Native entry path components.
import { VoiceNativeCaptureOverlay } from './VoiceNative/VoiceNativeCaptureOverlay';
import { voiceNativeToMealDraft } from './VoiceNative/voice-native-to-meal-draft';
import type { VoiceNativeParseResult, SttProvider } from '@/lib/nutrition/voice-native/types';
// Prompt 170o Phase 1 Phase C: hydration mounts below 4-button row. Gary
// 2026-06-03: switched from the 88px summary HydrationCard to the accordion
// that opens the full HydrationFullSection inline (same body as the detail
// route and the dashboard Quick Log pill).
import { HydrationAccordion } from '@/components/hydration/HydrationAccordion';
import type {
  Phase,
  MealDraft,
  RecentMealSummary,
  SaveResponse,
  MealType,
} from './types';

const NUTRITION_HERO_IMAGE =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Food%203.png';

const RECENT_MEAL_LIMIT = 6;

interface RecentRow {
  meal_id?: string;
  logged_at?: string;
  meal_type?: string;
  calories_kcal?: number;
  source_photo_blob_id?: string | null;
}

function asMealType(v: unknown): MealType {
  if (v === 'breakfast' || v === 'lunch' || v === 'dinner' || v === 'snack') return v;
  return 'snack';
}

// Local midnight boundary so "Recent NutriVision meals" only surfaces today's
// captures. Yesterday's rows roll off automatically; they remain in the
// database for the Dashboard meal log and corpus retention, but the at-a-glance
// list resets per local day. The midnight-refresh effect re-fetches at the
// next 00:00:01 local boundary so users keeping the tab open past midnight
// see the new day without a manual reload.
function getTodayStartISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getMsUntilNextMidnight(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 1, 0);
  return Math.max(1000, next.getTime() - now.getTime());
}

function mapRecentMealRows(rows: RecentRow[]): RecentMealSummary[] {
  return rows.flatMap((r) => {
    if (typeof r.meal_id !== 'string' || typeof r.logged_at !== 'string') return [];
    return [{
      meal_id: r.meal_id,
      logged_at: r.logged_at,
      meal_type: asMealType(r.meal_type),
      calories_kcal: typeof r.calories_kcal === 'number' ? r.calories_kcal : 0,
      item_count: 0,
    }];
  });
}

// Resolve signed thumbnail URLs for the recent meal summaries. Meals reference
// photos through meals.source_photo_blob_id, which links to photo_meal_blobs
// (storage_bucket, storage_path). We batch fetch the matching blob rows once
// and create one short lived signed URL per meal so the recent grid can render
// the actual capture instead of the Camera placeholder. The 1 hour TTL matches
// the 171a analyze response convention. Failures fall back silently to the
// placeholder so the recent grid still loads.
async function enrichRecentMealsWithThumbnails(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  rows: RecentRow[],
  summaries: RecentMealSummary[],
): Promise<RecentMealSummary[]> {
  if (summaries.length === 0) return summaries;

  const blobIdByMealId = new Map<string, string>();
  for (const r of rows) {
    if (typeof r.meal_id === 'string' && typeof r.source_photo_blob_id === 'string') {
      blobIdByMealId.set(r.meal_id, r.source_photo_blob_id);
    }
  }
  const blobIds = Array.from(new Set(blobIdByMealId.values()));
  if (blobIds.length === 0) return summaries;

  try {
    const { data: blobsRaw } = await supabase
      .from('photo_meal_blobs')
      .select('id, storage_bucket, storage_path')
      .in('id', blobIds);
    if (!Array.isArray(blobsRaw)) return summaries;

    const blobById = new Map<string, { bucket: string; path: string }>();
    for (const b of blobsRaw as Array<{ id: string; storage_bucket: string; storage_path: string }>) {
      if (typeof b.id === 'string' && typeof b.storage_bucket === 'string' && typeof b.storage_path === 'string') {
        blobById.set(b.id, { bucket: b.storage_bucket, path: b.storage_path });
      }
    }

    return Promise.all(summaries.map(async (s) => {
      const blobId = blobIdByMealId.get(s.meal_id);
      if (!blobId) return s;
      const blob = blobById.get(blobId);
      if (!blob) return s;
      try {
        const { data: signed } = await supabase.storage.from(blob.bucket).createSignedUrl(blob.path, 3600);
        if (signed && typeof signed.signedUrl === 'string') {
          return { ...s, thumbnail_url: signed.signedUrl };
        }
      } catch { /* silent */ }
      return s;
    }));
  } catch {
    return summaries;
  }
}

export default function NutriVisionTab() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [recentMeals, setRecentMeals] = useState<RecentMealSummary[]>([]);
  const [saveResponse, setSaveResponse] = useState<SaveResponse | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [corpusOptedIn, setCorpusOptedIn] = useState<boolean>(false);
  const [corpusDismissed, setCorpusDismissed] = useState<boolean>(false);
  const [showTips, setShowTips] = useState<boolean>(false);
  const [recentMealView, setRecentMealView] = useState<RecentMealSummary | null>(null);
  // #170a supplement §20.A: cache the latest capture so Try Again can reuse it
  // without forcing the user back to the capture screen.
  const [lastCaptureForRetry, setLastCaptureForRetry] = useState<CaptureResult | null>(null);

  // Prompt 175m (2026-06-05): barcode entry path state removed.
  // Prompt 171a: web-only camera preview overlay state. Mobile native opens
  // the Capacitor camera plugin's system UI which already has its own preview;
  // this overlay is web-only.
  const [showWebCameraPreview, setShowWebCameraPreview] = useState(false);
  // Prompt 175m (2026-06-05): pendingBarcodeItems removed with the rest
  // of the barcode entry path.

  // Prompt 170m Phase C: Quick Log modal state. The modal is overlay-style
  // and manages its own internal typing/loading/clarifying states. On parse
  // completion (no more clarifications) the handler below builds the
  // Prompt 170n Phase C: voice-native modal state. Overlay reuses 170j STT
  // pipeline (useVoiceCapture) wrapped with the voice-native parser hook.
  // voiceNativeContext rides through ReviewingSurface so handleSave routes
  // to /api/nutrition/voice-native/save with transcript + STT context.
  const [voiceNativeOpen, setVoiceNativeOpen] = useState(false);
  const [voiceNativeContext, setVoiceNativeContext] = useState<{
    transcript: string;
    stt_provider: SttProvider;
    stt_confidence_avg: number;
    audio_duration_ms: number;
    parse: VoiceNativeParseResult;
  } | null>(null);

  const capture = useCameraCapture();
  const analysis = useNutriVisionAnalysis();

  // Load the user id + recent meals + corpus opt-in status on mount.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserId(user.id);

      // Recent meals.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rowsRaw } = await (supabase as any)
          .from('meals')
          .select('meal_id, logged_at, meal_type, calories_kcal, source_photo_blob_id')
          .eq('user_id', user.id)
          .eq('source', 'nutrivision')
          .gte('logged_at', getTodayStartISO())
          .order('logged_at', { ascending: false })
          .limit(RECENT_MEAL_LIMIT);
        if (!cancelled && Array.isArray(rowsRaw)) {
          const rows = rowsRaw as RecentRow[];
          const base = mapRecentMealRows(rows);
          const enriched = await enrichRecentMealsWithThumbnails(supabase, rows, base);
          if (!cancelled) setRecentMeals(enriched);
        }
      } catch { /* silent */ }

      // Corpus opt-in.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: optRow } = await (supabase as any)
          .from('user_nutrivision_settings')
          .select('corpus_opt_in')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!cancelled && optRow && typeof optRow.corpus_opt_in === 'boolean') {
          setCorpusOptedIn(optRow.corpus_opt_in);
        }
      } catch { /* silent */ }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  // Auto-reset "Recent NutriVision meals" at the local-day boundary so
  // yesterday's captures roll off without requiring a page refresh. Re-query
  // fires at 00:00:01 local time and reschedules itself for the next day.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const supabase = createClient();
    const scheduleNext = (): void => {
      timer = setTimeout(async () => {
        if (cancelled) return;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: rowsRaw } = await (supabase as any)
            .from('meals')
            .select('meal_id, logged_at, meal_type, calories_kcal, source_photo_blob_id')
            .eq('user_id', userId)
            .eq('source', 'nutrivision')
            .gte('logged_at', getTodayStartISO())
            .order('logged_at', { ascending: false })
            .limit(RECENT_MEAL_LIMIT);
          if (!cancelled && Array.isArray(rowsRaw)) {
            const rows = rowsRaw as RecentRow[];
            const base = mapRecentMealRows(rows);
            const enriched = await enrichRecentMealsWithThumbnails(supabase, rows, base);
            if (!cancelled) setRecentMeals(enriched);
          }
        } catch { /* silent */ }
        scheduleNext();
      }, getMsUntilNextMidnight());
    };
    scheduleNext();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [userId]);

  // When analysis returns a draft, advance to the reviewing phase.
  useEffect(() => {
    if (analysis.mealDraft && phase === 'analyzing') {
      setDraft(analysis.mealDraft);
      setPhase('reviewing');
    }
  }, [analysis.mealDraft, phase]);

  // #170a supplement §20.1: analysis failures land on the structured error
  // card (phase 'error') instead of being toasted from idle. The error card
  // preserves the captured photo + lets the user retry, log manually, or
  // discard. The errorCode + lastCapture on the hook drive the card.
  useEffect(() => {
    if (analysis.error && phase === 'analyzing') {
      setAnalysisError(analysis.error);
      setPhase('error');
    }
  }, [analysis.error, phase]);

  const onCapture = useCallback(async (source: CaptureSource) => {
    setAnalysisError(null);
    // Prompt 171a: on web, the camera path opens a preview overlay so the
    // user can frame before capture. Gallery and native paths are unchanged.
    if (source === 'camera' && detectPlatform() === 'web') {
      setShowWebCameraPreview(true);
      return;
    }
    setPhase('capturing');
    const result = await capture.capture(source);
    if (!result) {
      setPhase('idle');
      return;
    }
    setLastCaptureForRetry(result);
    setPhase('analyzing');
    const next = await analysis.analyze(result);
    if (!next) {
      // useNutriVisionAnalysis sets error state; the effect above moves us
      // to the 'error' phase so ErrorStateCard takes over.
      return;
    }
  }, [capture, analysis]);

  // Prompt 171a: WebCameraPreview Confirm path. Skips the capture step
  // (CaptureResult already in hand) and goes straight to analyzing.
  const handleWebCameraConfirm = useCallback(
    async (result: CaptureResult) => {
      setShowWebCameraPreview(false);
      setAnalysisError(null);
      setLastCaptureForRetry(result);
      setPhase('analyzing');
      await analysis.analyze(result);
    },
    [analysis],
  );

  const handleWebCameraCancel = useCallback(() => {
    setShowWebCameraPreview(false);
  }, []);

  // #170a supplement §20.4: Try Again reuses the cached CaptureResult so the
  // user does not re-frame. If the capture is no longer available we fall
  // back to a fresh capture flow.
  const handleTryAgain = useCallback(async () => {
    setAnalysisError(null);
    const cachedCapture = analysis.lastCapture ?? lastCaptureForRetry;
    if (!cachedCapture) {
      // No cached capture (state lost on remount, etc.). Start a fresh capture.
      setPhase('idle');
      return;
    }
    setPhase('analyzing');
    await analysis.analyze(cachedCapture);
  }, [analysis, lastCaptureForRetry]);

  // #170a supplement §20.5 + Deviation B: stash source_photo_blob_id (when
  // available) in sessionStorage and bounce to /nutrition. /nutrition mounts
  // a banner via useNutrivisionManualLogHandoff inviting the user to open
  // any Quick Log pill below to log this meal manually.
  const handleLogManually = useCallback(() => {
    const blobId = analysis.mealDraft?.source_photo_blob_id ?? null;
    if (typeof blobId === 'string' && blobId.length > 0) {
      writeNutrivisionManualLogHandoff(blobId);
    }
    router.push('/nutrition');
  }, [analysis.mealDraft, router]);

  const handleDiscardError = useCallback(() => {
    setAnalysisError(null);
    setDraft(null);
    analysis.reset();
    capture.reset();
    setLastCaptureForRetry(null);
    setPhase('idle');
  }, [analysis, capture]);

  const cancelAnalysis = useCallback(() => {
    analysis.cancel();
    setPhase('idle');
  }, [analysis]);

  const handleCancelReview = useCallback(() => {
    setDraft(null);
    analysis.reset();
    capture.reset();
    setVoiceNativeContext(null);
    setPhase('idle');
  }, [analysis, capture]);

  const handleLogAnother = useCallback(() => {
    setSaveResponse(null);
    setDraft(null);
    analysis.reset();
    capture.reset();
    setVoiceNativeContext(null);
    setPhase('idle');
  }, [analysis, capture]);

  // Prompt 175m (2026-06-05): barcode flow handlers removed.

  // Prompt 170n Phase C: Voice-Native flow handlers.
  const handleOpenVoiceNative = useCallback(() => {
    setVoiceNativeOpen(true);
  }, []);

  const handleVoiceNativeClose = useCallback(() => {
    setVoiceNativeOpen(false);
  }, []);

  const handleVoiceNativeParseComplete = useCallback(
    (
      result: VoiceNativeParseResult,
      sttProvider: SttProvider,
      sttConfidenceAvg: number,
      transcript: string,
      audioDurationMs: number,
    ) => {
      const newDraft = voiceNativeToMealDraft(result);
      setVoiceNativeContext({
        transcript,
        stt_provider: sttProvider,
        stt_confidence_avg: sttConfidenceAvg,
        audio_duration_ms: audioDurationMs,
        parse: result,
      });
      setDraft(newDraft);
      setVoiceNativeOpen(false);
      setPhase('reviewing');
    },
    [],
  );

  // Prompt 175m (2026-06-05): manual barcode entry handlers removed.

  return (
    <>
      <MobileHeroBackground
        src={NUTRITION_HERO_IMAGE}
        overlayOpacity={0.55}
        objectPosition="center top"
        priority
      />
      <div className="relative z-10 min-h-screen text-white">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-8">
          <header className="mb-5 flex items-center gap-2">
            <Link
              href="/nutrition"
              aria-label="Back to Nutrition"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/5 text-white/80 transition-colors hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white sm:text-2xl">NutriVision</h1>
              <p className="mt-1 text-sm text-white/40">
                Snap your plate. We read it and compute the macros.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTips(true)}
              aria-label="View tips"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/5 text-white/80 transition-colors hover:bg-white/10"
            >
              <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
            </button>
            {/* #170a supplement §20.E: Settings gear opens NutriVision privacy
                page where Hannah's locked photo-data paragraph lives. */}
            <Link
              href="/settings/nutrivision"
              aria-label="NutriVision settings and photo privacy"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/5 text-white/80 transition-colors hover:bg-white/10"
            >
              <Settings className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </header>

          {phase === 'idle' && (
            <IdleSurface
              onCapture={onCapture}
              onOpenVoiceNative={handleOpenVoiceNative}
              isCapturing={capture.isCapturing}
              error={analysisError ?? capture.error}
              recentMeals={recentMeals}
              onPickRecent={setRecentMealView}
            />
          )}

          {phase === 'capturing' && (
            <CameraCapture
              onCapture={onCapture}
              isCapturing={true}
              error={capture.error}
            />
          )}

          {phase === 'analyzing' && (
            <AnalysisProgress
              stage={analysis.progressStage}
              onCancel={cancelAnalysis}
            />
          )}

          {phase === 'error' && (
            <ErrorStateCard
              errorClass={mapAIErrorToClass(
                analysis.errorCode ?? 'UNKNOWN',
                analysisError ?? undefined,
              )}
              photoBlobId={analysis.mealDraft?.source_photo_blob_id}
              onTryAgain={handleTryAgain}
              onLogManually={handleLogManually}
              onDiscard={handleDiscardError}
            />
          )}

          {phase === 'reviewing' && draft && (
            <ReviewingSurface
              draft={draft}
              userId={userId}
              corpusOptedIn={corpusOptedIn}
              corpusDismissed={corpusDismissed}
              onCorpusDismiss={() => setCorpusDismissed(true)}
              onCorpusOptIn={() => setCorpusOptedIn(true)}
              onCancel={handleCancelReview}
              onSaved={(resp) => { setSaveResponse(resp); setPhase('confirmed'); }}
              onSavingChange={(saving) => setPhase(saving ? 'saving' : 'reviewing')}
              voiceNativeContext={voiceNativeContext}
            />
          )}

          {phase === 'saving' && draft && (
            <div className="relative">
              <div className="opacity-40 pointer-events-none">
                <ReviewingSurface
                  draft={draft}
                  userId={userId}
                  corpusOptedIn={corpusOptedIn}
                  corpusDismissed={corpusDismissed}
                  onCorpusDismiss={() => setCorpusDismissed(true)}
                  onCorpusOptIn={() => setCorpusOptedIn(true)}
                  onCancel={handleCancelReview}
                  onSaved={() => undefined}
                  onSavingChange={() => undefined}
                  voiceNativeContext={voiceNativeContext}
                  forceSavingState
                />
              </div>
            </div>
          )}

          {phase === 'confirmed' && saveResponse && draft && (
            // Prompt 172 Phase 2 (172c) Option A: AnalysisResult stays
            // mounted post save. The card transitions to its post save
            // state in place via the saveResponse prop; the parent does
            // not swap to SaveConfirmation anymore. SaveConfirmation
            // remains a usable component (its tests still pass) but the
            // post save destination on the NutriVision result surface is
            // now ReviewingSurface itself, wrapping AnalysisResult and
            // the MealThread.
            <ReviewingSurface
              draft={draft}
              userId={userId}
              corpusOptedIn={corpusOptedIn}
              corpusDismissed={corpusDismissed}
              onCorpusDismiss={() => setCorpusDismissed(true)}
              onCorpusOptIn={() => setCorpusOptedIn(true)}
              onCancel={handleLogAnother}
              onSaved={() => undefined}
              onSavingChange={() => undefined}
              voiceNativeContext={voiceNativeContext}
              saveResponse={saveResponse}
              priorMeals={recentMeals
                .filter((m) => m.meal_id !== saveResponse.meal_id)
                .slice(0, 2)
                .map((m) => ({
                  mealId: m.meal_id,
                  title: m.item_count > 0 ? `${m.item_count} item meal` : m.meal_type,
                  loggedAt: m.logged_at,
                }))}
            />
          )}

          {/* Prompt 175m (2026-06-05): product_confirm and
              product_not_found phases removed with the rest of the
              barcode entry path. */}

          {showTips && (
            <TipsModal onClose={() => setShowTips(false)} />
          )}

          {recentMealView && (
            <RecentMealModal
              meal={recentMealView}
              onClose={() => setRecentMealView(null)}
            />
          )}
        </div>
      </div>

      {/* Prompt 171a: web camera preview overlay. Mobile native skips this
          and uses the @capacitor/camera plugin's system UI. */}
      <WebCameraPreview
        open={showWebCameraPreview}
        onCancel={handleWebCameraCancel}
        onConfirm={handleWebCameraConfirm}
      />

      {/* Prompt 175m (2026-06-05): BarcodeScannerOverlay and
          ManualBarcodeEntry mounts removed. */}

      {/* Prompt 170n Phase C: Voice-Native entry path capture overlay.
          Prompt 173 removed the deaf/HoH onSwitchToText fallback when the
          170m Quick Log modal was deleted; Photo is the implicit text-free
          fallback via the entry row. */}
      <VoiceNativeCaptureOverlay
        open={voiceNativeOpen}
        onClose={handleVoiceNativeClose}
        onParseComplete={handleVoiceNativeParseComplete}
      />

      {/* Prompt 175m (2026-06-05): MacroEditPanel mount removed with
          the rest of the barcode entry path. */}
    </>
  );
}

// ---------------------------------------------------------------------------
// IdleSurface
// ---------------------------------------------------------------------------

interface IdleSurfaceProps {
  onCapture: (source: CaptureSource) => void;
  onOpenVoiceNative: () => void;
  isCapturing: boolean;
  error: string | null;
  recentMeals: RecentMealSummary[];
  onPickRecent: (m: RecentMealSummary) => void;
}

// Prompt 170l Phase 1c-2 + Hannah 11.1: equal-weight peer entry path row.
// Prompt 175m (2026-06-05): Scan Barcode peer removed per Gary, leaving
// Photo + Upload + Voice. The grid now sits at 3 columns from the
// min-[360px] breakpoint up; iPhone SE class viewports get the
// grid-cols-2 split (Photo + Upload on row 1, Voice on row 2 full
// width).
function IdleSurface(props: IdleSurfaceProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 min-[360px]:grid-cols-3 sm:gap-3 [&>*:last-child]:col-span-2 min-[360px]:[&>*:last-child]:col-span-1">
        <EntryPathCard
          icon={<Camera className="h-6 w-6 sm:h-9 sm:w-9" strokeWidth={1.5} />}
          title="Photo"
          subtitle="Snap your plate."
          onTap={() => props.onCapture('camera')}
          disabled={props.isCapturing}
          ariaLabel="Photo. Snap your plate."
        />
        <EntryPathCard
          icon={<ImageUp className="h-6 w-6 sm:h-9 sm:w-9" strokeWidth={1.5} />}
          title="Upload"
          subtitle="From your library."
          onTap={() => props.onCapture('gallery')}
          disabled={props.isCapturing}
          ariaLabel="Upload. Pick a photo from your library."
        />
        <EntryPathCard
          icon={<Mic className="h-6 w-6 sm:h-9 sm:w-9" strokeWidth={1.5} />}
          title="Voice"
          subtitle="Say what you ate."
          onTap={props.onOpenVoiceNative}
          disabled={false}
          ariaLabel="Voice. Say what you ate hands-free."
        />
      </div>

      {/* Prompt 170o Phase 1 Phase C + Gary 2026-06-03: hydration accordion
          below the 4-button entry path row. Header pill matches the meal
          family; body is the full HydrationFullSection (ring + quick log +
          intake timeline + caffeine overlay + breakdown + electrolyte +
          picker + week + month + disclaimer + edit panel). */}
      <HydrationAccordion logSurface="nutrivision_card" />

      {props.error ? (
        <p className="rounded-xl border border-[#FCA5A5]/40 bg-[#1A2744]/30 p-3 text-[12px] text-[#FCA5A5]" role="alert">
          {props.error}
        </p>
      ) : null}

      <p className="rounded-xl border border-white/[0.08] bg-[#1A2744]/30 p-3 text-[11px] text-white/55">
        Photos may capture background details. Keep medications, ID, and personal documents out of frame for best privacy.
      </p>

      {props.recentMeals.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-3">
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-white/55">
            Recent NutriVision meals
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {props.recentMeals.map((m) => (
              <button
                key={m.meal_id}
                type="button"
                onClick={() => props.onPickRecent(m)}
                className="flex flex-col gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-left transition-colors hover:border-[#2DA5A0]/40 hover:bg-white/[0.06]"
              >
                <div className="flex h-16 items-center justify-center overflow-hidden rounded-md bg-[#1A2744]/50 text-white/40">
                  {m.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.thumbnail_url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Camera className="h-5 w-5" strokeWidth={1.5} />
                  )}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-white/45">
                  {m.meal_type}
                </div>
                <div className="font-mono text-[11px] text-white/80">
                  {Math.round(m.calories_kcal)} kcal
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface EntryPathCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onTap: () => void;
  disabled: boolean;
  ariaLabel: string;
}

function EntryPathCard({ icon, title, subtitle, onTap, disabled, ariaLabel }: EntryPathCardProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/[0.08] bg-[#1A2744]/65 p-2 text-center backdrop-blur-md transition-colors hover:border-[#2DA5A0]/40 hover:bg-[#1A2744]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[144px] sm:gap-2 sm:p-4"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2DA5A0]/15 text-[#2DA5A0] sm:h-12 sm:w-12">
        {icon}
      </div>
      <div className="text-[13px] font-medium text-white sm:text-sm">{title}</div>
      <div className="text-[10px] leading-tight text-white/70 sm:text-[11px]">{subtitle}</div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// ReviewingSurface
// ---------------------------------------------------------------------------

interface ReviewingSurfaceProps {
  draft: MealDraft;
  userId: string | null;
  corpusOptedIn: boolean;
  corpusDismissed: boolean;
  onCorpusDismiss: () => void;
  onCorpusOptIn: () => void;
  onCancel: () => void;
  onSaved: (resp: SaveResponse) => void;
  onSavingChange: (saving: boolean) => void;
  forceSavingState?: boolean;
  // Prompt 170n Phase C: when set, routes the save through the Voice-Native
  // endpoint so transcript + STT context + parser_version persist.
  voiceNativeContext?: {
    transcript: string;
    stt_provider: SttProvider;
    stt_confidence_avg: number;
    audio_duration_ms: number;
    parse: VoiceNativeParseResult;
  } | null;
  // Prompt 172 Phase 2 (172c): when the parent already has the SaveResponse
  // (post save phase) it threads it here so AnalysisResult stays mounted
  // and renders the post save MealCard subtree in place, with the BOS line
  // slot and acknowledgement live, wrapped in the light thread.
  saveResponse?: SaveResponse | null;
  // Prompt 172 Phase 2 (172c): optional priors for the MealThread stack
  // beneath the post save card. Up to two are rendered; the rest are
  // ignored to keep the stack visually shallow.
  priorMeals?: ReadonlyArray<{ mealId: string; title: string; loggedAt?: string }>;
}

function ReviewingSurface(props: ReviewingSurfaceProps) {
  const edits = useMealItemEdits({ initialDraft: props.draft });
  const [mealType, setMealType] = useState<MealType>(() => detectMealTypeForNow());
  // Prompt 180c (2026-06-08): explicit cross-route invalidation. The
  // QueryClient default staleTime is 5 minutes (lib/providers.tsx) so
  // a user returning to /nutrition right after a NutriVision save
  // reads cached meals and the new row never appears. The realtime
  // postgres_changes channel in useUserMeals is the other refresh
  // path, but it relies on the meals table being added to the
  // supabase_realtime publication and a stable WebSocket; both can
  // fail in production. Belt and suspenders: invalidate on every
  // successful save.
  const queryClient = useQueryClient();

  const isSaving = props.forceSavingState ?? false;

  const handleSave = useCallback(async () => {
    if (edits.draft.items.length === 0) {
      toast.error('Add at least one item before saving.');
      return;
    }
    props.onSavingChange(true);
    try {
      // Prompt 170n Phase C: route Voice-Native saves to its dedicated endpoint
      // so transcript + STT context + parser_version persist.
      // Photo + barcode flows continue to use /api/nutrition/meals.
      const isVoiceNative = props.voiceNativeContext !== null && props.voiceNativeContext !== undefined;
      const url = isVoiceNative
        ? '/api/nutrition/voice-native/save'
        : '/api/nutrition/meals';
      const payload = isVoiceNative && props.voiceNativeContext
        ? {
            transcript: props.voiceNativeContext.transcript,
            transcript_locale: 'en-US',
            transcript_retention_opted_in: false,
            stt_provider: props.voiceNativeContext.stt_provider,
            stt_confidence_avg: props.voiceNativeContext.stt_confidence_avg,
            audio_duration_ms: props.voiceNativeContext.audio_duration_ms,
            meal_type: mealType,
            meal_items: edits.draft.items.map((it) => ({
              food_name: it.food_name,
              portion_grams: it.portion_grams,
              cooking_method: it.cooking_method ?? null,
              caffeine_mg: typeof it.caffeine_mg === 'number' ? it.caffeine_mg : null,
              confidence: it.recognition_confidence,
            })),
            parser_confidence_avg: edits.draft.meal_confidence,
            combined_confidence_avg: edits.draft.meal_confidence,
            clarification_rounds: 0,
            fillers_removed_count: props.voiceNativeContext.parse.fillers_removed.length,
            restarts_resolved_count: props.voiceNativeContext.parse.restarts_resolved.length,
            triggered_split: props.voiceNativeContext.parse.split_into_multiple_meals_suggestion !== null,
            used_quick_apply: false,
          }
        : edits.buildSavePayload(mealType);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        const errMsg = extractError(body) ?? 'Could not save meal.';
        toast.error(errMsg);
        props.onSavingChange(false);
        return;
      }
      if (!body || typeof body.meal_id !== 'string') {
        toast.error('Save response was not understood.');
        props.onSavingChange(false);
        return;
      }
      // Voice-Native save endpoint returns a slimmer shape than the photo
      // save endpoint; synthesize a SaveResponse-compatible object.
      const saveResp: SaveResponse = isVoiceNative
        ? {
            meal_id: body.meal_id,
            gordon: {
              bio_optimization_delta: null,
              copy: null,
              quality_score: 0,
              quality_tier: 'unknown',
            },
            dashboard_crossover: { nutrition_dimension_recompute_queued: true },
            helix_events_emitted: [],
            corpus_row_written: false,
            requestId: '',
          }
        : (body as unknown as SaveResponse);
      // Prompt 180c (2026-06-08): invalidate every cached user-meals
      // query so Today's Meals + Daily Macros + Nutrition Score all
      // pick up the new row when the user navigates back to
      // /nutrition. queryKey: ['user-meals'] is the broad prefix; any
      // (userId, days, includeLegacy) tuple beneath it gets refetched.
      void queryClient.invalidateQueries({ queryKey: ['user-meals'] });
      props.onSaved(saveResp);
    } catch {
      toast.error('Network error. Try again.');
      props.onSavingChange(false);
    }
  }, [edits, props, mealType, queryClient]);

  return (
    <AnalysisResult
      draft={edits.draft}
      userId={props.userId}
      corpusOptedIn={props.corpusOptedIn}
      corpusDismissed={props.corpusDismissed}
      isSaving={isSaving}
      mealType={mealType}
      onMealTypeChange={setMealType}
      onCorpusDismiss={props.onCorpusDismiss}
      onCorpusOptIn={props.onCorpusOptIn}
      onPortionChange={edits.setPortion}
      onFoodSwap={edits.swapFood}
      onCookingOilChange={edits.setCookingOil}
      onApplyChip={edits.applyChip}
      onAddItem={edits.addItem}
      onRemoveItem={edits.removeItem}
      onMarkVerified={edits.markVerified}
      onNutrientEdit={edits.setItemNutrient}
      onPlateSizeChange={edits.setPlateSize}
      onRemoveChip={edits.removeChip}
      onRestoreSnapshot={edits.restoreSnapshot}
      onAppendItem={edits.appendItem}
      onSave={handleSave}
      onCancel={props.onCancel}
      saveResponse={props.saveResponse ?? null}
      priorMeals={props.priorMeals}
    />
  );
}

function extractError(body: Record<string, unknown> | null): string | undefined {
  if (!body) return undefined;
  const err = body.error;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const msg = (err as Record<string, unknown>).message;
    if (typeof msg === 'string') return msg;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// TipsModal + RecentMealModal: small stubs per spec.
// ---------------------------------------------------------------------------

function TipsModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell onClose={onClose} ariaLabel="NutriVision tips">
      <h2 className="text-base font-semibold text-white">Tips for accurate analysis</h2>
      <ul className="mt-3 flex flex-col gap-2 text-[12px] text-white/75">
        <li>Fill the frame with the plate so we can see edges and depth.</li>
        <li>Include a credit card or ID card next to your plate for portion accuracy.</li>
        <li>Adjust portions with the slider on each item if our estimate looks off.</li>
      </ul>
      <button
        type="button"
        onClick={onClose}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90"
      >
        Close
      </button>
    </ModalShell>
  );
}

function RecentMealModal({ meal, onClose }: { meal: RecentMealSummary; onClose: () => void }) {
  return (
    <ModalShell onClose={onClose} ariaLabel="Recent meal summary">
      <h2 className="text-base font-semibold text-white capitalize">{meal.meal_type}</h2>
      <p className="mt-1 text-[11px] text-white/55">
        {new Date(meal.logged_at).toLocaleString()}
      </p>
      <p className="mt-3 font-mono text-2xl text-white">
        {Math.round(meal.calories_kcal)} <span className="text-sm text-white/55">kcal</span>
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
      >
        Close
      </button>
    </ModalShell>
  );
}

function ModalShell({
  children,
  onClose,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClose: () => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#1E3054] p-5 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/65 transition-colors hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        {children}
      </div>
    </div>
  );
}


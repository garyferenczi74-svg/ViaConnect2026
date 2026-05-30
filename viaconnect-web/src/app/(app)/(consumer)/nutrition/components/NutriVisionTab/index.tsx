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
import toast from 'react-hot-toast';
import { Camera, ChevronLeft, HelpCircle, Settings, X } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { CaptureResult, CaptureSource } from '@/lib/capacitor/camera-capture';
import { mapAIErrorToClass } from '@/lib/nutrition/vision/error-class-mapper';
import { writeNutrivisionManualLogHandoff } from '@/hooks/useNutrivisionManualLogHandoff';
import { MobileHeroBackground } from '@/components/ui/MobileHeroBackground';
import { CameraCapture } from './CameraCapture';
import { AnalysisProgress } from './AnalysisProgress';
import { AnalysisResult } from './AnalysisResult';
import { ErrorStateCard } from './ErrorStateCard';
import { SaveConfirmation } from './SaveConfirmation';
import { useCameraCapture } from './hooks/useCameraCapture';
import { useNutriVisionAnalysis } from './hooks/useNutriVisionAnalysis';
import { useMealItemEdits } from './hooks/useMealItemEdits';
import { detectMealTypeForNow } from './types';
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
          .select('meal_id, logged_at, meal_type, calories_kcal')
          .eq('user_id', user.id)
          .eq('source', 'nutrivision')
          .gte('logged_at', getTodayStartISO())
          .order('logged_at', { ascending: false })
          .limit(RECENT_MEAL_LIMIT);
        if (!cancelled && Array.isArray(rowsRaw)) {
          setRecentMeals(mapRecentMealRows(rowsRaw as RecentRow[]));
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
            .select('meal_id, logged_at, meal_type, calories_kcal')
            .eq('user_id', userId)
            .eq('source', 'nutrivision')
            .gte('logged_at', getTodayStartISO())
            .order('logged_at', { ascending: false })
            .limit(RECENT_MEAL_LIMIT);
          if (!cancelled && Array.isArray(rowsRaw)) {
            setRecentMeals(mapRecentMealRows(rowsRaw as RecentRow[]));
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
    setPhase('idle');
  }, [analysis, capture]);

  const handleLogAnother = useCallback(() => {
    setSaveResponse(null);
    setDraft(null);
    analysis.reset();
    capture.reset();
    setPhase('idle');
  }, [analysis, capture]);

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
                  forceSavingState
                />
              </div>
            </div>
          )}

          {phase === 'confirmed' && saveResponse && draft && (
            <SaveConfirmation
              totals={draft.totals}
              response={saveResponse}
              onLogAnother={handleLogAnother}
            />
          )}

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
    </>
  );
}

// ---------------------------------------------------------------------------
// IdleSurface
// ---------------------------------------------------------------------------

interface IdleSurfaceProps {
  onCapture: (source: CaptureSource) => void;
  isCapturing: boolean;
  error: string | null;
  recentMeals: RecentMealSummary[];
  onPickRecent: (m: RecentMealSummary) => void;
}

function IdleSurface(props: IdleSurfaceProps) {
  return (
    <div className="flex flex-col gap-4">
      <CameraCapture
        onCapture={props.onCapture}
        isCapturing={props.isCapturing}
        error={props.error}
      />

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
                <div className="flex h-16 items-center justify-center rounded-md bg-[#1A2744]/50 text-white/40">
                  <Camera className="h-5 w-5" strokeWidth={1.5} />
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
}

function ReviewingSurface(props: ReviewingSurfaceProps) {
  const edits = useMealItemEdits({ initialDraft: props.draft });
  const [mealType, setMealType] = useState<MealType>(() => detectMealTypeForNow());

  const isSaving = props.forceSavingState ?? false;

  const handleSave = useCallback(async () => {
    if (edits.draft.items.length === 0) {
      toast.error('Add at least one item before saving.');
      return;
    }
    props.onSavingChange(true);
    try {
      const payload = edits.buildSavePayload(mealType);
      const res = await fetch('/api/nutrition/meals', {
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
      props.onSaved(body as unknown as SaveResponse);
    } catch {
      toast.error('Network error. Try again.');
      props.onSavingChange(false);
    }
  }, [edits, props, mealType]);

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
      onPlateSizeChange={edits.setPlateSize}
      onRemoveChip={edits.removeChip}
      onRestoreSnapshot={edits.restoreSnapshot}
      onAppendItem={edits.appendItem}
      onSave={handleSave}
      onCancel={props.onCancel}
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


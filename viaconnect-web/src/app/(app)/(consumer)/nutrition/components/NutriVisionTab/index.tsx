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
import { Camera, ChevronLeft, HelpCircle, MessageSquareText, Mic, ScanBarcode, Settings, X } from 'lucide-react';
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
import { SaveConfirmation } from './SaveConfirmation';
import { useCameraCapture } from './hooks/useCameraCapture';
import { useNutriVisionAnalysis } from './hooks/useNutriVisionAnalysis';
import { useMealItemEdits } from './hooks/useMealItemEdits';
import { detectMealTypeForNow } from './types';
// Prompt 170l Phase 1c-2: barcode entry path surfaces.
import { BarcodeScannerOverlay } from '@/components/barcode/BarcodeScannerOverlay';
import { ProductConfirmation } from '@/components/barcode/ProductConfirmation';
import { NotFoundFallback } from '@/components/barcode/NotFoundFallback';
import { ManualBarcodeEntry } from '@/components/barcode/ManualBarcodeEntry';
import { MacroEditPanel } from '@/components/barcode/MacroEditPanel';
import {
  convertOFFProductToMealItemDraft,
  buildBlankSlateDraft,
} from '@/components/barcode/lib/off-product-to-draft';
import type { LookupResult } from '@/components/barcode/hooks/useOffLookup';
import type { OFFProduct } from '@/lib/nutrition/barcode/types';
// Prompt 170m Phase C: Quick Log text-native entry path components.
import { QuickLogModal } from './QuickLog/QuickLogModal';
import { quickLogToMealDraft } from './QuickLog/quick-log-to-meal-draft';
import type { QuickLogParseResult } from '@/lib/nutrition/quick-log/types';
// Prompt 170n Phase C: Voice-Native entry path components.
import { VoiceNativeCaptureOverlay } from './VoiceNative/VoiceNativeCaptureOverlay';
import { voiceNativeToMealDraft } from './VoiceNative/voice-native-to-meal-draft';
import type { VoiceNativeParseResult, SttProvider } from '@/lib/nutrition/voice-native/types';
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

  // Prompt 170l Phase 1c-2: barcode entry path state.
  const [barcodeProduct, setBarcodeProduct] = useState<OFFProduct | null>(null);
  const [barcodeFormat, setBarcodeFormat] = useState<string | null>(null);
  const [barcodeNotFoundValue, setBarcodeNotFoundValue] = useState<string | null>(null);
  const [barcodeNotFoundIsNetwork, setBarcodeNotFoundIsNetwork] = useState<boolean>(false);
  const [manualEntryOpen, setManualEntryOpen] = useState<boolean>(false);
  const [macroEditOpen, setMacroEditOpen] = useState<boolean>(false);
  const [macroEditMode, setMacroEditMode] = useState<'prefilled' | 'blank_slate'>('prefilled');
  const [blankSlateBarcode, setBlankSlateBarcode] = useState<string | null>(null);
  // Prompt 171a: web-only camera preview overlay state. Mobile native opens
  // the Capacitor camera plugin's system UI which already has its own preview;
  // this overlay is web-only.
  const [showWebCameraPreview, setShowWebCameraPreview] = useState(false);
  // Prompt 170l Phase 1c-3: multi-product flow accumulator (§11.7).
  // When user taps "Scan another product" on §11.4, the current item is
  // pushed here and the next scan returns to product confirmation; the final
  // "Save to meal" tap builds the draft from [...pendingBarcodeItems, current].
  const [pendingBarcodeItems, setPendingBarcodeItems] = useState<import('./types').MealItemDraft[]>([]);

  // Prompt 170m Phase C: Quick Log modal state. The modal is overlay-style
  // and manages its own internal typing/loading/clarifying states. On parse
  // completion (no more clarifications) the handler below builds the
  // MealDraft and transitions to phase='reviewing' so the shared review
  // surface renders. quickLogParseResult is the verbatim parser response,
  // retained on the draft so the save handler can route to the Quick Log
  // save endpoint with the original text + clarification round count.
  const [quickLogModalOpen, setQuickLogModalOpen] = useState(false);
  const [quickLogText, setQuickLogText] = useState<string | null>(null);
  const [quickLogParseResult, setQuickLogParseResult] = useState<QuickLogParseResult | null>(null);

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
    setQuickLogText(null);
    setQuickLogParseResult(null);
    setVoiceNativeContext(null);
    setPhase('idle');
  }, [analysis, capture]);

  const handleLogAnother = useCallback(() => {
    setSaveResponse(null);
    setDraft(null);
    analysis.reset();
    capture.reset();
    setQuickLogText(null);
    setQuickLogParseResult(null);
    setVoiceNativeContext(null);
    setPhase('idle');
  }, [analysis, capture]);

  // Prompt 170l Phase 1c-2: barcode flow handlers.
  const handleOpenScanner = useCallback(() => {
    setBarcodeProduct(null);
    setBarcodeFormat(null);
    setBarcodeNotFoundValue(null);
    setBarcodeNotFoundIsNetwork(false);
    setPhase('scanning');
  }, []);

  const handleLookupResult = useCallback(
    (barcode: string, lookup: LookupResult) => {
      if (lookup.outcome === 'cache_hit' || lookup.outcome === 'off_hit' || lookup.outcome === 'sessionstorage_hit') {
        if (lookup.product) {
          setBarcodeProduct(lookup.product);
          setBarcodeFormat(null);
          setPhase('product_confirm');
        }
        return;
      }
      if (lookup.outcome === 'off_miss') {
        setBarcodeNotFoundValue(barcode);
        setBarcodeNotFoundIsNetwork(false);
        setPhase('product_not_found');
        return;
      }
      if (lookup.outcome === 'network_error') {
        setBarcodeNotFoundValue(barcode);
        setBarcodeNotFoundIsNetwork(true);
        setPhase('product_not_found');
        return;
      }
      if (lookup.outcome === 'rate_limit') {
        toast.error("You've reached today's scan limit. Try again tomorrow.");
        setPhase('idle');
        return;
      }
      if (lookup.outcome === 'feature_disabled') {
        toast.error('Barcode scanning is currently unavailable.');
        setPhase('idle');
        return;
      }
      toast.error('Something went wrong with that scan. Try again.');
      setPhase('idle');
    },
    [],
  );

  const handleScannerLookupResult = useCallback(
    (barcode: string, _decoded: unknown, lookup: LookupResult) => {
      handleLookupResult(barcode, lookup);
    },
    [handleLookupResult],
  );

  const handleProductSave = useCallback(
    (portionMultiplier: number) => {
      if (!barcodeProduct) return;
      const itemDraft = convertOFFProductToMealItemDraft(barcodeProduct, {
        portionMultiplier,
      });
      if (itemDraft === null) {
        toast.error("That product didn't have enough nutrition data to save.");
        return;
      }
      // Multi-product flow: combine with any items accumulated from prior
      // "Scan another product" steps. Single-product flow has pending=[].
      const allItems = [...pendingBarcodeItems, itemDraft];
      const totals = allItems.reduce(
        (acc, it) => ({
          calories_kcal: acc.calories_kcal + it.calories_kcal,
          protein_g: acc.protein_g + it.protein_g,
          carbs_g: acc.carbs_g + it.carbs_g,
          fat_g: acc.fat_g + it.fat_g,
          fiber_g: acc.fiber_g + (it.fiber_g ?? 0),
          sugar_g: acc.sugar_g + (it.sugar_g ?? 0),
          sodium_mg: acc.sodium_mg + (it.sodium_mg ?? 0),
          cholesterol_mg: acc.cholesterol_mg + (it.cholesterol_mg ?? 0),
        }),
        { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0, cholesterol_mg: 0 },
      );
      const newDraft = {
        id: `barcode-meal-${Date.now().toString(36)}`,
        items: allItems,
        totals,
        meal_confidence: 0.95,
        warnings: [],
        // Barcode meals have an exact serving size from OFF; plate selector
        // (170a Supplement 17) is not applicable.
        credit_card_detected: true,
      };
      setDraft(newDraft);
      setBarcodeProduct(null);
      setPendingBarcodeItems([]);
      setPhase('reviewing');
    },
    [barcodeProduct, pendingBarcodeItems],
  );

  // Prompt 170l Phase 1c-3 §11.7: append current item to pending list and
  // return to scanner so the user can scan another product into the same
  // meal-in-progress.
  const handleScanAnother = useCallback(
    (portionMultiplier: number) => {
      if (!barcodeProduct) return;
      const itemDraft = convertOFFProductToMealItemDraft(barcodeProduct, {
        portionMultiplier,
      });
      if (itemDraft === null) {
        toast.error("That product didn't have enough nutrition data to add.");
        return;
      }
      setPendingBarcodeItems((prev) => [...prev, itemDraft]);
      setBarcodeProduct(null);
      setBarcodeFormat(null);
      setPhase('scanning');
    },
    [barcodeProduct],
  );

  const handleProductCancel = useCallback(() => {
    setBarcodeProduct(null);
    setBarcodeFormat(null);
    // Cancel = abandon entire flow including any accumulated multi-product items.
    setPendingBarcodeItems([]);
    setPhase('idle');
  }, []);

  const handleProductBack = useCallback(() => {
    setBarcodeProduct(null);
    setPhase('scanning');
  }, []);

  const handleEditMacros = useCallback(() => {
    setMacroEditMode('prefilled');
    setMacroEditOpen(true);
  }, []);

  const handleFallbackPhotograph = useCallback(() => {
    setBarcodeNotFoundValue(null);
    setBarcodeNotFoundIsNetwork(false);
    setPhase('idle');
    void onCapture('camera');
  }, [onCapture]);

  const handleFallbackEnterMacros = useCallback(() => {
    if (!barcodeNotFoundValue) return;
    setBlankSlateBarcode(barcodeNotFoundValue);
    setMacroEditMode('blank_slate');
    setMacroEditOpen(true);
  }, [barcodeNotFoundValue]);

  const handleFallbackContribute = useCallback(() => {
    if (!barcodeNotFoundValue) return;
    // Open OFF deep-link to the contribution page for this barcode.
    const url = `https://world.openfoodfacts.org/cgi/product.pl?type=edit&code=${encodeURIComponent(barcodeNotFoundValue)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    // Fire-and-forget Helix barcode_off_contribution_clicked event (3pt).
    void fetch('/api/nutrition/barcode/contribution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode: barcodeNotFoundValue }),
    }).catch(() => undefined);
    toast.success("Thanks for contributing. We'll find this product next time.");
    setBarcodeNotFoundValue(null);
    setPhase('idle');
  }, [barcodeNotFoundValue]);

  const handleFallbackRetry = useCallback(() => {
    setBarcodeNotFoundValue(null);
    setBarcodeNotFoundIsNetwork(false);
    setPhase('scanning');
  }, []);

  const handleFallbackBack = useCallback(() => {
    setBarcodeNotFoundValue(null);
    setBarcodeNotFoundIsNetwork(false);
    setPhase('scanning');
  }, []);

  const handleFallbackClose = useCallback(() => {
    setBarcodeNotFoundValue(null);
    setBarcodeNotFoundIsNetwork(false);
    setPhase('idle');
  }, []);

  const handleMacroEditSave = useCallback(
    (values: { calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; sodium_mg: number; sugar_g: number }, didOverride: boolean) => {
      if (macroEditMode === 'blank_slate' && blankSlateBarcode !== null) {
        const itemDraft = buildBlankSlateDraft(blankSlateBarcode);
        itemDraft.calories_kcal = Math.round(values.calories_kcal);
        itemDraft.protein_g = Number(values.protein_g.toFixed(1));
        itemDraft.carbs_g = Number(values.carbs_g.toFixed(1));
        itemDraft.fat_g = Number(values.fat_g.toFixed(1));
        itemDraft.fiber_g = Number(values.fiber_g.toFixed(1));
        itemDraft.sugar_g = Number(values.sugar_g.toFixed(1));
        itemDraft.sodium_mg = Math.round(values.sodium_mg);
        const totals = {
          calories_kcal: itemDraft.calories_kcal,
          protein_g: itemDraft.protein_g,
          carbs_g: itemDraft.carbs_g,
          fat_g: itemDraft.fat_g,
          fiber_g: itemDraft.fiber_g ?? 0,
          sugar_g: itemDraft.sugar_g ?? 0,
          sodium_mg: itemDraft.sodium_mg ?? 0,
          cholesterol_mg: 0,
        };
        setDraft({
          id: `barcode-blank-meal-${Date.now().toString(36)}`,
          items: [itemDraft],
          totals,
          meal_confidence: 0.5,
          warnings: ['User-entered macros'],
          credit_card_detected: true,
        });
        setBlankSlateBarcode(null);
        setBarcodeNotFoundValue(null);
        setMacroEditOpen(false);
        setPhase('reviewing');
        return;
      }
      // prefilled mode: update the in-flight barcodeProduct then re-render confirmation
      if (barcodeProduct !== null && didOverride) {
        const editedProduct: OFFProduct = {
          ...barcodeProduct,
          nutriments: {
            ...(barcodeProduct.nutriments ?? {}),
            'energy-kcal_100g': values.calories_kcal,
            proteins_100g: values.protein_g,
            carbohydrates_100g: values.carbs_g,
            fat_100g: values.fat_g,
            fiber_100g: values.fiber_g,
            sugars_100g: values.sugar_g,
            sodium_100g: values.sodium_mg / 1000,
          },
        };
        setBarcodeProduct(editedProduct);
      }
      setMacroEditOpen(false);
    },
    [macroEditMode, blankSlateBarcode, barcodeProduct],
  );

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

  // Prompt 170m Phase C: Quick Log flow handlers.
  const handleOpenQuickLog = useCallback(() => {
    setQuickLogModalOpen(true);
  }, []);

  const handleQuickLogClose = useCallback(() => {
    setQuickLogModalOpen(false);
  }, []);

  const handleQuickLogParseComplete = useCallback(
    (result: QuickLogParseResult, originalText: string) => {
      const newDraft = quickLogToMealDraft(result);
      setQuickLogText(originalText);
      setQuickLogParseResult(result);
      setDraft(newDraft);
      setQuickLogModalOpen(false);
      setPhase('reviewing');
    },
    [],
  );

  const handleOpenManualEntry = useCallback(() => setManualEntryOpen(true), []);
  const handleCloseManualEntry = useCallback(() => setManualEntryOpen(false), []);
  const handleManualEntryLookup = useCallback(
    (barcode: string, lookup: LookupResult) => {
      setManualEntryOpen(false);
      handleLookupResult(barcode, lookup);
    },
    [handleLookupResult],
  );

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
              onOpenScanner={handleOpenScanner}
              onOpenQuickLog={handleOpenQuickLog}
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
              quickLogText={quickLogText}
              quickLogParseResult={quickLogParseResult}
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
                  quickLogText={quickLogText}
                  quickLogParseResult={quickLogParseResult}
                  voiceNativeContext={voiceNativeContext}
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
              thumbnailUrl={draft.thumbnail_url ?? null}
            />
          )}

          {phase === 'product_confirm' && barcodeProduct && (
            <ProductConfirmation
              product={barcodeProduct}
              format={barcodeFormat}
              servingSizeG={barcodeProduct.serving_size
                ? (parseFloat(barcodeProduct.serving_size) || 100)
                : 100}
              initialPortionMultiplier={1}
              onCancel={handleProductCancel}
              onBack={handleProductBack}
              onClose={handleProductCancel}
              onSave={handleProductSave}
              onEditMacros={handleEditMacros}
              onScanAnother={handleScanAnother}
            />
          )}

          {phase === 'product_not_found' && barcodeNotFoundValue && (
            <NotFoundFallback
              barcode={barcodeNotFoundValue}
              fallbackToPhotoEnabled={true}
              isNetworkError={barcodeNotFoundIsNetwork}
              onClose={handleFallbackClose}
              onBack={handleFallbackBack}
              onPhotograph={handleFallbackPhotograph}
              onEnterMacros={handleFallbackEnterMacros}
              onContribute={handleFallbackContribute}
              onRetry={handleFallbackRetry}
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

      {/* Prompt 171a: web camera preview overlay. Mobile native skips this
          and uses the @capacitor/camera plugin's system UI. */}
      <WebCameraPreview
        open={showWebCameraPreview}
        onCancel={handleWebCameraCancel}
        onConfirm={handleWebCameraConfirm}
      />

      {/* Prompt 170l Phase 1c-2: barcode scanner overlay + modals at the
          document root so they layer above the page content. */}
      <BarcodeScannerOverlay
        open={phase === 'scanning'}
        onClose={handleProductCancel}
        onLookupResult={handleScannerLookupResult}
        onManualEntry={handleOpenManualEntry}
        hapticEnabled={true}
        audioChimeEnabled={false}
      />

      <ManualBarcodeEntry
        open={manualEntryOpen}
        onClose={handleCloseManualEntry}
        onLookupResult={handleManualEntryLookup}
      />

      {/* Prompt 170m Phase C: Quick Log text-native entry path modal. Overlay
          style; sits above the document root so all phases can launch it. */}
      <QuickLogModal
        open={quickLogModalOpen}
        onClose={handleQuickLogClose}
        onParseComplete={handleQuickLogParseComplete}
      />

      {/* Prompt 170n Phase C: Voice-Native entry path capture overlay. */}
      <VoiceNativeCaptureOverlay
        open={voiceNativeOpen}
        onClose={handleVoiceNativeClose}
        onParseComplete={handleVoiceNativeParseComplete}
      />

      <MacroEditPanel
        open={macroEditOpen}
        mode={macroEditMode}
        initialValues={
          macroEditMode === 'prefilled' && barcodeProduct
            ? {
                calories_kcal: (barcodeProduct.nutriments?.['energy-kcal_100g'] ?? 0),
                protein_g: (barcodeProduct.nutriments?.['proteins_100g'] ?? 0),
                carbs_g: (barcodeProduct.nutriments?.['carbohydrates_100g'] ?? 0),
                fat_g: (barcodeProduct.nutriments?.['fat_100g'] ?? 0),
                fiber_g: (barcodeProduct.nutriments?.['fiber_100g'] ?? 0),
                sugar_g: (barcodeProduct.nutriments?.['sugars_100g'] ?? 0),
                sodium_mg: ((barcodeProduct.nutriments?.['sodium_100g'] ?? 0) * 1000),
              }
            : undefined
        }
        productNameHint={
          macroEditMode === 'prefilled' ? (barcodeProduct?.product_name ?? undefined) : undefined
        }
        onClose={() => setMacroEditOpen(false)}
        onSave={handleMacroEditSave}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// IdleSurface
// ---------------------------------------------------------------------------

interface IdleSurfaceProps {
  onCapture: (source: CaptureSource) => void;
  onOpenScanner: () => void;
  onOpenQuickLog: () => void;
  onOpenVoiceNative: () => void;
  isCapturing: boolean;
  error: string | null;
  recentMeals: RecentMealSummary[];
  onPickRecent: (m: RecentMealSummary) => void;
}

// Prompt 170l Phase 1c-2 + Hannah 11.1: equal-weight peer entry path row.
// Prompt 170m Phase C + Hannah 9.1 Gate 1: extended from two to three peers.
// Prompt 170n Phase C + Hannah Gate 1 (responsive): extended from three to
// four peers (Photo + Scan Barcode + Quick Log + Voice) with 2x2 collapse at
// viewports <=359px per Hannah's hard push-back on iPhone SE tap-target
// ergonomics. >=360px renders all four peers in one row; <=359px collapses
// to a 2x2 grid so each card retains comfortable touch area. Anti-condescension
// principle from 170l + 170m propagates: NO "Most common" chip on Photo, NO
// "NEW" chip on Voice. Photo retains left position for existing muscle memory.
function IdleSurface(props: IdleSurfaceProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 min-[360px]:grid-cols-4 sm:gap-3">
        <EntryPathCard
          icon={<Camera className="h-6 w-6 sm:h-9 sm:w-9" strokeWidth={1.5} />}
          title="Photo"
          subtitle="Snap your plate."
          onTap={() => props.onCapture('camera')}
          disabled={props.isCapturing}
          ariaLabel="Photo. Snap your plate."
        />
        <EntryPathCard
          icon={<ScanBarcode className="h-6 w-6 sm:h-9 sm:w-9" strokeWidth={1.5} />}
          title="Scan Barcode"
          subtitle="Packaged foods."
          onTap={props.onOpenScanner}
          disabled={false}
          ariaLabel="Scan Barcode. Read packaged food labels in under a second."
        />
        <EntryPathCard
          icon={<MessageSquareText className="h-6 w-6 sm:h-9 sm:w-9" strokeWidth={1.5} />}
          title="Quick Log"
          subtitle="Type what you ate."
          onTap={props.onOpenQuickLog}
          disabled={false}
          ariaLabel="Quick Log. Type what you ate."
        />
        <EntryPathCard
          icon={<Mic className="h-6 w-6 sm:h-9 sm:w-9" strokeWidth={1.5} />}
          title="Voice"
          subtitle="Speak your meal."
          onTap={props.onOpenVoiceNative}
          disabled={false}
          ariaLabel="Voice. Speak your meal hands-free."
        />
      </div>

      <button
        type="button"
        onClick={() => props.onCapture('gallery')}
        disabled={props.isCapturing}
        className="self-center text-[12px] text-white/65 underline disabled:opacity-50"
      >
        Upload photo from gallery
      </button>

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
      className="flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/[0.08] bg-[#1E3054]/45 p-2 text-center transition-colors hover:border-[#2DA5A0]/40 hover:bg-[#1E3054]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[144px] sm:gap-2 sm:p-4"
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
  // Prompt 170m Phase C: when set, routes the save through the Quick Log
  // endpoint so meals.text_input + parser_version + clarification metadata
  // ride the persistence. Photo + barcode flows leave these undefined and
  // route through /api/nutrition/meals as before.
  quickLogText?: string | null;
  quickLogParseResult?: QuickLogParseResult | null;
  // Prompt 170n Phase C: when set, routes the save through the Voice-Native
  // endpoint so transcript + STT context + parser_version persist.
  voiceNativeContext?: {
    transcript: string;
    stt_provider: SttProvider;
    stt_confidence_avg: number;
    audio_duration_ms: number;
    parse: VoiceNativeParseResult;
  } | null;
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
      // Prompt 170m Phase C: route Quick Log saves to the dedicated endpoint.
      // Prompt 170n Phase C: route Voice-Native saves to its dedicated endpoint
      // so transcript + STT context + parser_version persist.
      // Photo + barcode flows continue to use /api/nutrition/meals.
      const isQuickLog = typeof props.quickLogText === 'string' && props.quickLogText.length > 0;
      const isVoiceNative = props.voiceNativeContext !== null && props.voiceNativeContext !== undefined;
      const url = isVoiceNative
        ? '/api/nutrition/voice-native/save'
        : isQuickLog
          ? '/api/nutrition/quick-log/save'
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
        : isQuickLog && props.quickLogText
        ? {
            text_input: props.quickLogText,
            text_input_locale: 'en-US',
            meal_type: mealType,
            meal_items: edits.draft.items.map((it) => ({
              food_name: it.food_name,
              portion_grams: it.portion_grams,
              cooking_method: it.cooking_method ?? null,
              caffeine_mg: typeof it.caffeine_mg === 'number' ? it.caffeine_mg : null,
              confidence: it.recognition_confidence,
            })),
            parser_confidence_avg: edits.draft.meal_confidence,
            clarification_rounds: 0,
            triggered_split: false,
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
      // Quick Log + Voice-Native save endpoints return slimmer shapes than
      // the photo save endpoint; synthesize a SaveResponse-compatible object.
      const saveResp: SaveResponse = (isQuickLog || isVoiceNative)
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
      props.onSaved(saveResp);
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


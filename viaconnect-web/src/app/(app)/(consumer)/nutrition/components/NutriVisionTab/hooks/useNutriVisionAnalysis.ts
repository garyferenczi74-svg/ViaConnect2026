'use client';

// Prompt #170 Phase 1l: analyze hook that wraps POST /api/nutrition/photo/analyze.
//
// Converts a CaptureResult into a multipart form, POSTs, parses the response,
// and normalizes the meal_draft shape into MealDraft so the rest of the UI
// can edit it. Cycles a `progressStage` on a setTimeout so the AnalysisProgress
// copy advances even when the server response is slow.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useCallback, useEffect, useRef, useState } from 'react';
import { detectPlatform, type CaptureResult } from '@/lib/capacitor/camera-capture';
import type { AIErrorCode } from '@/lib/errors/classify-ai';
import type {
  MealDraft,
  MealItemDraft,
  MealTotals,
  ProgressStage,
  RecognitionProvider,
  NutrientSource,
  ConfidenceBand,
} from '../types';
import { classifyConfidence } from '../types';

export interface UseNutriVisionAnalysisReturn {
  analyze: (capture: CaptureResult) => Promise<MealDraft | null>;
  isAnalyzing: boolean;
  progressStage: ProgressStage;
  mealDraft: MealDraft | null;
  error: string | null;
  // #170a supplement §20.B: the underlying AIErrorCode (when known) so the
  // error card can map to the right error_class bucket without sniffing the
  // user-facing message. Stays null when no error is in flight.
  errorCode: AIErrorCode | null;
  lastCapture: CaptureResult | null;
  cancel: () => void;
  reset: () => void;
}

const KNOWN_AI_ERROR_CODES = new Set<AIErrorCode>([
  'AUTH_MISSING',
  'AUTH_INVALID',
  'RATE_LIMITED',
  'TIMEOUT',
  'API_DOWN',
  'INVALID_INPUT',
  'MALFORMED_RESPONSE',
  'UNAUTHENTICATED',
  'CONFIG_MISSING',
  'BUDGET_HIT',
  'NO_RECOGNITION',
  'UNKNOWN',
]);

function asAIErrorCode(v: unknown): AIErrorCode | null {
  if (typeof v !== 'string') return null;
  return KNOWN_AI_ERROR_CODES.has(v as AIErrorCode) ? (v as AIErrorCode) : null;
}

interface AnalyzeRespItemRaw {
  id?: string;
  food_name?: string;
  cuisine_tag?: string;
  bounding_box?: { x: number; y: number; w: number; h: number };
  recognition_provider?: string;
  recognition_confidence?: number;
  portion_grams?: number;
  portion_volume_ml?: number;
  portion_estimation_method?: string;
  nutrient_source?: string;
  usda_fdc_id?: number;
  off_barcode?: string;
  curated_food_id?: string;
  calories_kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  cholesterol_mg?: number;
  micronutrients?: Record<string, number>;
  cooking_method?: string;
  cooking_oil_suggestion?: { type?: string; amount_ml?: number; reasoning?: string };
}

interface AnalyzeRespRaw {
  job_id?: string;
  source_photo_blob_id?: string;
  // Prompt 171a: server-issued 60-minute signed URL for thumbnail rendering.
  thumbnail_url?: string | null;
  meal_draft?: {
    id?: string;
    items?: ReadonlyArray<AnalyzeRespItemRaw>;
    totals?: Partial<MealTotals>;
    meal_confidence?: number;
    warnings?: ReadonlyArray<string>;
    // #170a supplement §17.2: optional flag from the portion-estimation pass.
    // Server sets to true when a credit-card-shaped object was detected in the
    // photo so the UI can skip the plate selector. Older responses omit it
    // and the client defaults to surfacing the selector.
    credit_card_detected?: boolean;
  };
  error?: { code?: string; message?: string };
}

const KNOWN_PROVIDERS = new Set<string>(['logmeal', 'gemini', 'claude_vision']);
const KNOWN_SOURCES = new Set<string>([
  'farmceutica_curated',
  'usda_fdc',
  'open_food_facts',
  'vision_provider',
  'user_entered',
]);

function asProvider(v: string | undefined): RecognitionProvider | undefined {
  if (typeof v !== 'string') return undefined;
  return KNOWN_PROVIDERS.has(v) ? (v as RecognitionProvider) : undefined;
}

function asSource(v: string | undefined): NutrientSource {
  if (typeof v === 'string' && KNOWN_SOURCES.has(v)) return v as NutrientSource;
  return 'vision_provider';
}

function safeNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return fallback;
}

function safeOptionalNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

function normalizeItem(raw: AnalyzeRespItemRaw): MealItemDraft {
  const portionGrams = safeNumber(raw.portion_grams, 100);
  const factor = portionGrams > 0 ? 100 / portionGrams : 1;
  const confidence = safeOptionalNumber(raw.recognition_confidence);
  const band: ConfidenceBand = classifyConfidence(confidence);

  const item: MealItemDraft = {
    id: typeof raw.id === 'string' && raw.id.length > 0
      ? raw.id
      : `item-${Math.random().toString(36).slice(2)}`,
    food_name: typeof raw.food_name === 'string' ? raw.food_name : 'Unknown food',
    portion_grams: portionGrams,
    nutrient_source: asSource(raw.nutrient_source),
    per_100g: {
      calories_kcal: safeNumber(raw.calories_kcal) * factor,
      protein_g: safeNumber(raw.protein_g) * factor,
      carbs_g: safeNumber(raw.carbs_g) * factor,
      fat_g: safeNumber(raw.fat_g) * factor,
    },
    calories_kcal: safeNumber(raw.calories_kcal),
    protein_g: safeNumber(raw.protein_g),
    carbs_g: safeNumber(raw.carbs_g),
    fat_g: safeNumber(raw.fat_g),
    user_modified: false,
    confidence_band: band,
  };

  if (typeof raw.cuisine_tag === 'string') item.cuisine_tag = raw.cuisine_tag;
  if (raw.bounding_box) item.bounding_box = raw.bounding_box;
  const provider = asProvider(raw.recognition_provider);
  if (provider !== undefined) item.recognition_provider = provider;
  if (typeof confidence === 'number') item.recognition_confidence = confidence;
  if (typeof raw.portion_volume_ml === 'number') item.portion_volume_ml = raw.portion_volume_ml;
  if (typeof raw.portion_estimation_method === 'string') {
    const m = raw.portion_estimation_method;
    if (
      m === 'lidar' || m === 'arcore' || m === 'reference_object'
      || m === 'vision_inference' || m === 'user_override' || m === 'unknown'
    ) {
      item.portion_estimation_method = m;
    }
  }
  if (typeof raw.usda_fdc_id === 'number') item.usda_fdc_id = raw.usda_fdc_id;
  if (typeof raw.off_barcode === 'string') item.off_barcode = raw.off_barcode;
  if (typeof raw.curated_food_id === 'string') item.curated_food_id = raw.curated_food_id;

  // Optional per-100g enrichment (fiber, sugar, sodium, cholesterol) when the
  // analyze response gave us amounts. Same factor extraction.
  if (typeof raw.fiber_g === 'number') {
    item.fiber_g = raw.fiber_g;
    item.per_100g.fiber_g = raw.fiber_g * factor;
  }
  if (typeof raw.sugar_g === 'number') {
    item.sugar_g = raw.sugar_g;
    item.per_100g.sugar_g = raw.sugar_g * factor;
  }
  if (typeof raw.sodium_mg === 'number') {
    item.sodium_mg = raw.sodium_mg;
    item.per_100g.sodium_mg = raw.sodium_mg * factor;
  }
  if (typeof raw.cholesterol_mg === 'number') item.cholesterol_mg = raw.cholesterol_mg;
  if (raw.micronutrients && typeof raw.micronutrients === 'object') {
    item.micronutrients = raw.micronutrients;
  }
  if (typeof raw.cooking_method === 'string') item.cooking_method = raw.cooking_method;
  if (raw.cooking_oil_suggestion) {
    const s = raw.cooking_oil_suggestion;
    item.cooking_oil_suggestion = {
      type: typeof s.type === 'string' ? s.type : 'none',
      amount_ml: safeNumber(s.amount_ml, 0),
      reasoning: typeof s.reasoning === 'string' ? s.reasoning : '',
    };
  }

  return item;
}

function normalizeDraft(payload: AnalyzeRespRaw): MealDraft | null {
  const draft = payload.meal_draft;
  if (!draft) return null;
  const rawItems = Array.isArray(draft.items) ? draft.items : [];
  const items = rawItems.map(normalizeItem);
  const t = draft.totals ?? {};
  const totals: MealTotals = {
    calories_kcal: safeNumber(t.calories_kcal),
    protein_g: safeNumber(t.protein_g),
    carbs_g: safeNumber(t.carbs_g),
    fat_g: safeNumber(t.fat_g),
    fiber_g: safeNumber(t.fiber_g),
    sugar_g: safeNumber(t.sugar_g),
    sodium_mg: safeNumber(t.sodium_mg),
    cholesterol_mg: safeNumber(t.cholesterol_mg),
  };
  const result: MealDraft = {
    id: typeof draft.id === 'string'
      ? draft.id
      : `draft-${Math.random().toString(36).slice(2)}`,
    items,
    totals,
    meal_confidence: safeNumber(draft.meal_confidence, 0.6),
    warnings: Array.isArray(draft.warnings)
      ? draft.warnings.filter((w): w is string => typeof w === 'string')
      : [],
  };
  if (typeof payload.source_photo_blob_id === 'string') {
    result.source_photo_blob_id = payload.source_photo_blob_id;
  }
  // Prompt 171a: propagate the signed thumbnail URL onto MealDraft so the
  // review surface + save confirmation can render it.
  if (typeof payload.thumbnail_url === 'string' && payload.thumbnail_url.length > 0) {
    result.thumbnail_url = payload.thumbnail_url;
  }
  if (typeof draft.credit_card_detected === 'boolean') {
    result.credit_card_detected = draft.credit_card_detected;
  }
  return result;
}

function base64ToBlob(base64: string, mime: string): Blob {
  const byteString = atob(base64);
  const len = byteString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = byteString.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

const STAGE_TIMINGS_MS: Record<Exclude<ProgressStage, 'idle'>, number> = {
  reading: 0,
  portions: 1200,
  nutrients: 2400,
};

export function useNutriVisionAnalysis(): UseNutriVisionAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressStage, setProgressStage] = useState<ProgressStage>('idle');
  const [mealDraft, setMealDraft] = useState<MealDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AIErrorCode | null>(null);
  const [lastCapture, setLastCapture] = useState<CaptureResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      if (abortRef.current) abortRef.current.abort();
    };
  }, [clearTimers]);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    clearTimers();
    setProgressStage('idle');
    setIsAnalyzing(false);
  }, [clearTimers]);

  const reset = useCallback(() => {
    cancel();
    setMealDraft(null);
    setError(null);
    setErrorCode(null);
    setLastCapture(null);
  }, [cancel]);

  const analyze = useCallback(async (capture: CaptureResult): Promise<MealDraft | null> => {
    cancel();
    setError(null);
    setErrorCode(null);
    setLastCapture(capture);
    setIsAnalyzing(true);
    setProgressStage('reading');
    const portionsTimer = setTimeout(() => setProgressStage('portions'), STAGE_TIMINGS_MS.portions);
    const nutrientsTimer = setTimeout(() => setProgressStage('nutrients'), STAGE_TIMINGS_MS.nutrients);
    timersRef.current = [portionsTimer, nutrientsTimer];

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const blob = base64ToBlob(capture.imageBase64, capture.mime);
      const form = new FormData();
      const ext = capture.mime === 'image/png' ? 'png'
        : capture.mime === 'image/webp' ? 'webp' : 'jpg';
      form.append('image', blob, `meal.${ext}`);
      form.append('captured_at', capture.capturedAt);
      const clientId = globalThis.crypto?.randomUUID?.()
        ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      form.append('client_id', clientId);
      form.append('device_class', detectPlatform());

      const res = await fetch('/api/nutrition/photo/analyze', {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });

      const body = (await res.json().catch(() => null)) as AnalyzeRespRaw | null;
      if (!res.ok) {
        const msg = body?.error?.message ?? 'Analysis failed. Try again.';
        setError(msg);
        setErrorCode(asAIErrorCode(body?.error?.code) ?? 'UNKNOWN');
        setIsAnalyzing(false);
        clearTimers();
        setProgressStage('idle');
        return null;
      }
      if (!body) {
        setError('Could not read the analyze response.');
        setErrorCode('MALFORMED_RESPONSE');
        setIsAnalyzing(false);
        clearTimers();
        setProgressStage('idle');
        return null;
      }

      const normalized = normalizeDraft(body);
      if (!normalized || normalized.items.length === 0) {
        setError('We could not identify foods in this photo. Try a clearer shot.');
        setErrorCode('NO_RECOGNITION');
        setIsAnalyzing(false);
        clearTimers();
        setProgressStage('idle');
        return null;
      }

      setMealDraft(normalized);
      setIsAnalyzing(false);
      clearTimers();
      setProgressStage('idle');
      return normalized;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Cancelled by the user. Suppress the error.
        return null;
      }
      setError(err instanceof Error ? err.message : 'Network error. Try again.');
      // Treat any unhandled exception path (network failure, etc.) as API_DOWN
      // so the error card maps to provider_outage by default.
      setErrorCode('API_DOWN');
      setIsAnalyzing(false);
      clearTimers();
      setProgressStage('idle');
      return null;
    } finally {
      abortRef.current = null;
    }
  }, [cancel, clearTimers]);

  return {
    analyze,
    isAnalyzing,
    progressStage,
    mealDraft,
    error,
    errorCode,
    lastCapture,
    cancel,
    reset,
  };
}

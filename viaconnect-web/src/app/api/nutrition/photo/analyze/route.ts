// Prompt #170 Phase 1j: POST /api/nutrition/photo/analyze.
//
// The NutriVision analyze orchestrator. Wires the Phase 1b through 1i libs
// (vision detect, resolver, portion estimator, cooking-oil suggester) into
// an HTTP route per §9.1 contract. The route never resolves user identity
// downstream of the vision provider; sanitization is enforced inside detect
// already, and this file is grep-checked for auth.uid / getUser references
// inside any outbound provider construction.
//
// Pipeline:
//   1. Auth via createClient().auth.getUser().
//   2. Parse multipart form (image, captured_at, client_id, device_class,
//      month_spend_usd_so_far).
//   3. Upload image to nutrivision-meals/<user_id>/<YYYY-MM>/<fileId>.jpg
//      and write the ephemeral photo_meal_blobs row.
//   4. detectMeal(...) -> ReconciledRecognition + cache info.
//   5. For each item: resolveNutrients + estimatePortion + suggestCookingOil.
//   6. Per-item macros from per100g * (portion_grams / 100). Aggregate totals.
//   7. Return { job_id, meal_draft } per §9.1.
//
// Resilience: 30s AbortController on the outer handler. Each external call
// inside the libs is already withTimeout-wrapped. All structured logs go
// through safeLog. No console.log.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tryCreateAdminClient } from '@/lib/supabase/admin-optional';
import { safeLog } from '@/lib/utils/safe-log';
import { AIRouteError } from '@/lib/errors/classify-ai';
import { recordAudit, newRequestId } from '@/lib/observability/audit-recorder';

import { detectMeal } from '@/lib/nutrition/vision/detect';
import { resolveNutrients } from '@/lib/nutrition/databases/resolver';
import type { ResolvedNutrients } from '@/lib/nutrition/databases/resolver';
import { estimatePortion } from '@/lib/nutrition/portion/volume-estimate';
import { suggestCookingOil } from '@/lib/nutrition/cooking-oil/suggester';
import type {
  CuisineTag,
  CookingMethod,
  RecognitionProvider,
  VisionItem,
} from '@/lib/nutrition/vision/types';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/nutrition/photo/analyze';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const HANDLER_TIMEOUT_MS = 30_000;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const UUID_V4_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_DEVICE_CLASS = new Set([
  'ios_lidar',
  'ios_no_lidar',
  'android_arcore',
  'android_no_depth',
  'web',
]);

interface MealDraftItem {
  id: string;
  food_name: string;
  food_language?: string;
  cuisine_tag?: CuisineTag;
  bounding_box: { x: number; y: number; w: number; h: number };
  recognition_provider: RecognitionProvider;
  recognition_confidence: number;
  portion_grams: number;
  portion_volume_ml?: number;
  portion_estimation_method: string;
  portion_confidence: number;
  cooking_method?: CookingMethod;
  cooking_oil_suggestion: {
    type: string;
    amount_ml: number;
    reasoning: string;
  };
  nutrient_source: string;
  usda_fdc_id?: number;
  off_barcode?: string;
  curated_food_id?: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  cholesterol_mg?: number;
  micronutrients?: Record<string, number>;
}

interface MealDraftTotals {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
}

type DegradedMode =
  | 'no_cache'
  | 'no_curated_lookup'
  | 'no_corpus'
  | 'no_helix'
  | 'no_audit';

interface MealDraft {
  id: string;
  items: ReadonlyArray<MealDraftItem>;
  totals: MealDraftTotals;
  meal_confidence: number;
  warnings: ReadonlyArray<string>;
  providers_called: ReadonlyArray<RecognitionProvider>;
  from_cache: 'sha256_exact' | 'phash_near' | 'none';
  degraded_modes?: ReadonlyArray<DegradedMode>;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundInt(n: number): number {
  return Math.round(n);
}

function isCuisineTag(v: unknown): v is CuisineTag {
  return (
    typeof v === 'string'
    && [
      'north_american', 'mediterranean', 'latin_american', 'east_asian',
      'south_asian', 'southeast_asian', 'middle_eastern', 'african', 'unknown',
    ].includes(v)
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = newRequestId();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HANDLER_TIMEOUT_MS);
  let userId: string | null = null;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new AIRouteError(
        'UNAUTHENTICATED',
        'no session',
        401,
        'Please sign in to log meals.',
      );
    }
    userId = user.id;

    const form = await req.formData().catch(() => null);
    if (!form) {
      throw new AIRouteError('INVALID_INPUT', 'no form', 400, 'Please upload a photo.');
    }

    const imageRaw = form.get('image');
    if (!(imageRaw instanceof File)) {
      throw new AIRouteError('INVALID_INPUT', 'no image', 400, 'Please upload a photo.');
    }
    if (imageRaw.size > MAX_FILE_BYTES) {
      throw new AIRouteError(
        'INVALID_INPUT',
        'too large',
        413,
        'Image too large. Please use an image under 10 MB.',
      );
    }
    const mime = imageRaw.type.toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      if (mime === 'image/heic' || mime === 'image/heif') {
        throw new AIRouteError(
          'INVALID_INPUT',
          'heic',
          400,
          'HEIC not supported yet. Please use JPG, PNG, or WebP.',
        );
      }
      throw new AIRouteError(
        'INVALID_INPUT',
        `mime: ${mime}`,
        400,
        'Unsupported image type.',
      );
    }

    const capturedAtRaw = form.get('captured_at');
    const capturedAt = typeof capturedAtRaw === 'string' && !Number.isNaN(Date.parse(capturedAtRaw))
      ? capturedAtRaw
      : new Date().toISOString();

    const clientIdRaw = form.get('client_id');
    const clientId = typeof clientIdRaw === 'string' && UUID_V4_RX.test(clientIdRaw)
      ? clientIdRaw
      : null;
    if (clientId === null) {
      throw new AIRouteError(
        'INVALID_INPUT',
        'bad client_id',
        400,
        'A valid client id is required.',
      );
    }

    const deviceClassRaw = form.get('device_class');
    const deviceClassStr = typeof deviceClassRaw === 'string' ? deviceClassRaw : '';
    if (!ALLOWED_DEVICE_CLASS.has(deviceClassStr)) {
      throw new AIRouteError(
        'INVALID_INPUT',
        `device_class: ${deviceClassStr}`,
        400,
        'A valid device class is required.',
      );
    }
    const deviceClass = deviceClassStr as
      | 'ios_lidar'
      | 'ios_no_lidar'
      | 'android_arcore'
      | 'android_no_depth'
      | 'web';

    const monthSpendRaw = form.get('month_spend_usd_so_far');
    const monthSpendUsdSoFar = typeof monthSpendRaw === 'string' && monthSpendRaw.length > 0
      ? Number(monthSpendRaw)
      : 0;
    const monthlyCapUsdClaude = Number(process.env.NUTRIVISION_CLAUDE_MONTHLY_CAP_USD ?? 100);

    const buf = Buffer.from(await imageRaw.arrayBuffer());
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const ym = new Date().toISOString().slice(0, 7);
    const fileId = globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const storagePath = `${user.id}/${ym}/${fileId}.${ext}`;

    const supabaseAdmin = tryCreateAdminClient();
    const degradedModes: DegradedMode[] = [];
    if (supabaseAdmin === null) {
      degradedModes.push('no_cache', 'no_curated_lookup', 'no_audit');
    }

    // Storage upload + ephemeral photo_meal_blobs row. A failure on the blob
    // record is logged but does not abort the analyze; the storagePath is the
    // single source of truth for the file location. When the service-role key
    // is available, use the admin client so storage policies are bypassed
    // (production behavior). When it is not, fall back to the user-scoped
    // client, which depends on storage policies allowing the authenticated
    // user to write under their own prefix.
    const storageClient = supabaseAdmin ?? supabase;
    const uploadResult = await storageClient.storage
      .from('nutrivision-meals')
      .upload(storagePath, buf, { contentType: mime, upsert: false });
    if (uploadResult.error) {
      throw new AIRouteError(
        'API_DOWN',
        `upload: ${uploadResult.error.message}`,
        503,
        'Could not upload photo. Please check your connection.',
      );
    }

    // Prompt 171a: generate a 60-minute signed URL for the just-uploaded
    // photo so the client can render a thumbnail in AnalysisResult +
    // SaveConfirmation without a second round-trip. Failure here is logged
    // but does not abort the analyze; barcode-sourced meals never have a
    // thumbnail anyway, and a missing thumbnail just hides the UI block.
    let thumbnailUrl: string | null = null;
    try {
      const signed = await storageClient.storage
        .from('nutrivision-meals')
        .createSignedUrl(storagePath, 3600);
      if (signed.data && typeof signed.data.signedUrl === 'string') {
        thumbnailUrl = signed.data.signedUrl;
      } else if (signed.error) {
        safeLog.warn('api.nutrivision.photo.analyze', 'signed url failed (continuing)', {
          request_id: requestId,
          user_id: user.id,
          error: signed.error.message,
        });
      }
    } catch (signedErr) {
      safeLog.warn('api.nutrivision.photo.analyze', 'signed url threw (continuing)', {
        request_id: requestId,
        user_id: user.id,
        error: signedErr,
      });
    }

    let blobId: string | null = null;
    try {
      // photo_meal_blobs RLS policy is auth.uid() = user_id, so the
      // user-scoped client is always sufficient and is preferred even when
      // admin is available. Live schema columns: id, user_id, meal_id,
      // storage_bucket, storage_path, image_hash_sha256, retention_policy,
      // created_at, scheduled_deletion_at. mime_type, captured_at, client_id,
      // device_class are NOT on the table and were stripped in #170 Phase 1q
      // hotfix 3. storage_bucket and retention_policy take their server-side
      // defaults (nutrivision-meals, ephemeral_24h).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: blobRow, error: blobErr } = await (supabase as any)
        .from('photo_meal_blobs')
        .insert({
          user_id: user.id,
          storage_path: storagePath,
        })
        .select('id')
        .single();
      if (blobErr) {
        safeLog.warn('api.nutrivision.photo.analyze', 'blob insert failed (continuing)', {
          request_id: requestId,
          user_id: user.id,
          error: blobErr.message,
        });
      } else if (blobRow && typeof blobRow.id === 'string') {
        blobId = blobRow.id;
      }
    } catch (blobInsertErr) {
      safeLog.warn('api.nutrivision.photo.analyze', 'blob insert threw (continuing)', {
        request_id: requestId,
        user_id: user.id,
        error: blobInsertErr,
      });
    }

    // ----------------------------------------------------------------- detect
    // supabaseAdmin is passed through as undefined when the env var is missing;
    // detectMeal skips its cache lookup + write in that case (see Phase 1q hotfix).
    const detectResult = await detectMeal({
      imageBytes: buf,
      mime,
      requestId,
      deviceClass,
      capturedAt,
      monthSpendUsdSoFar: Number.isFinite(monthSpendUsdSoFar) ? monthSpendUsdSoFar : 0,
      monthlyCapUsdClaude,
      supabaseAdmin: supabaseAdmin ?? undefined,
    });

    const recognition = detectResult.recognition;
    if (recognition.items.length === 0) {
      throw new AIRouteError(
        'NO_RECOGNITION',
        'no items',
        502,
        'We could not identify foods in this photo. Try a clearer shot.',
      );
    }

    // ----------------------------------------------------- per-item enrichment
    const draftItems: MealDraftItem[] = [];
    const warnings: string[] = [...recognition.warnings];

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;
    let totalSugar = 0;
    let totalSodium = 0;

    for (const visionItem of recognition.items as ReadonlyArray<VisionItem>) {
      // Resolver. Provider built-in fallback is not wired here because the
      // vision providers we ship in Phase 1 do not return per100g nutrient
      // payloads; the resolver returns null when curated/USDA/OFF all miss.
      let resolved: ResolvedNutrients | null = null;
      try {
        resolved = await resolveNutrients(visionItem.foodName, {
          supabaseAdmin: supabaseAdmin ?? undefined,
          requestId,
          cuisineTagHint: visionItem.cuisineTag,
        });
      } catch (resolveErr) {
        safeLog.warn('api.nutrivision.photo.analyze', 'resolver threw (continuing)', {
          request_id: requestId,
          food_name: visionItem.foodName,
          error: resolveErr,
        });
      }

      if (resolved === null) {
        warnings.push(`No nutrient data found for "${visionItem.foodName}".`);
        continue;
      }

      // Portion. Reference object detection is a UI overlay feature; Phase 1
      // routes call estimatePortion without a reference and rely on the vision
      // provider hint or the coarse fallback.
      const portion = estimatePortion({ item: visionItem });

      // Cooking oil suggestion. NEVER auto-applied to the macros; the picker
      // surfaces the suggestion and the user confirms.
      const oilMethod: CookingMethod = visionItem.cookingMethod ?? 'unknown';
      const oilSuggestion = suggestCookingOil({
        cookingMethod: oilMethod,
        cuisineTag: visionItem.cuisineTag,
      });

      // Macros from per100g * (grams / 100).
      const factor = portion.grams / 100;
      const calories = roundInt(resolved.per100g.calories_kcal * factor);
      const protein = round1(resolved.per100g.protein_g * factor);
      const carbs = round1(resolved.per100g.carbs_g * factor);
      const fat = round1(resolved.per100g.fat_g * factor);
      const fiber = typeof resolved.per100g.fiber_g === 'number'
        ? round1(resolved.per100g.fiber_g * factor)
        : undefined;
      const sugar = typeof resolved.per100g.sugar_g === 'number'
        ? round1(resolved.per100g.sugar_g * factor)
        : undefined;
      const sodium = typeof resolved.per100g.sodium_mg === 'number'
        ? round1(resolved.per100g.sodium_mg * factor)
        : undefined;
      const cholesterol = typeof resolved.per100g.cholesterol_mg === 'number'
        ? round1(resolved.per100g.cholesterol_mg * factor)
        : undefined;

      totalCalories += calories;
      totalProtein += protein;
      totalCarbs += carbs;
      totalFat += fat;
      if (typeof fiber === 'number') totalFiber += fiber;
      if (typeof sugar === 'number') totalSugar += sugar;
      if (typeof sodium === 'number') totalSodium += sodium;

      const draftItem: MealDraftItem = {
        id: visionItem.id,
        food_name: visionItem.foodName,
        bounding_box: visionItem.boundingBox,
        recognition_provider: recognition.providerPrimary,
        recognition_confidence: visionItem.confidence,
        portion_grams: portion.grams,
        portion_estimation_method: portion.method,
        portion_confidence: portion.confidence,
        cooking_oil_suggestion: {
          type: oilSuggestion.type,
          amount_ml: oilSuggestion.amount_ml,
          reasoning: oilSuggestion.reasoning,
        },
        nutrient_source: resolved.source,
        calories_kcal: calories,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
      };
      if (typeof portion.volume_ml === 'number') draftItem.portion_volume_ml = portion.volume_ml;
      if (visionItem.foodLanguage !== undefined) draftItem.food_language = visionItem.foodLanguage;
      if (isCuisineTag(visionItem.cuisineTag)) draftItem.cuisine_tag = visionItem.cuisineTag;
      if (visionItem.cookingMethod !== undefined) draftItem.cooking_method = visionItem.cookingMethod;
      if (typeof resolved.usdaFdcId === 'number') draftItem.usda_fdc_id = resolved.usdaFdcId;
      if (typeof resolved.offBarcode === 'string') draftItem.off_barcode = resolved.offBarcode;
      if (typeof resolved.curatedFoodId === 'string') draftItem.curated_food_id = resolved.curatedFoodId;
      if (typeof fiber === 'number') draftItem.fiber_g = fiber;
      if (typeof sugar === 'number') draftItem.sugar_g = sugar;
      if (typeof sodium === 'number') draftItem.sodium_mg = sodium;
      if (typeof cholesterol === 'number') draftItem.cholesterol_mg = cholesterol;
      if (resolved.micronutrientsPer100g !== undefined) {
        const scaled: Record<string, number> = {};
        for (const [k, v] of Object.entries(resolved.micronutrientsPer100g)) {
          scaled[k] = round1(v * factor);
        }
        draftItem.micronutrients = scaled;
      }

      draftItems.push(draftItem);
    }

    if (draftItems.length === 0) {
      throw new AIRouteError(
        'NO_RECOGNITION',
        'all items unresolved',
        502,
        'We could not find nutrient data for these foods. Try adjusting the photo.',
      );
    }

    const draftId = globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const totals: MealDraftTotals = {
      calories_kcal: roundInt(totalCalories),
      protein_g: round1(totalProtein),
      carbs_g: round1(totalCarbs),
      fat_g: round1(totalFat),
      fiber_g: round1(totalFiber),
      sugar_g: round1(totalSugar),
      sodium_mg: round1(totalSodium),
    };

    const mealDraft: MealDraft = {
      id: draftId,
      items: draftItems,
      totals,
      meal_confidence: recognition.mealConfidence,
      warnings,
      providers_called: detectResult.providersCalled,
      from_cache: detectResult.fromCache,
    };
    if (degradedModes.length > 0) {
      mealDraft.degraded_modes = degradedModes;
    }

    const jobId = newRequestId();
    const latencyMs = Date.now() - startedAt;

    try {
      await recordAudit({
        requestId,
        userId: user.id,
        route: ROUTE,
        provider: 'google',
        outcome: 'success',
        httpStatus: 200,
        latencyMs,
      });
    } catch (auditErr) {
      safeLog.warn('api.nutrivision.photo.analyze', 'audit record failed (continuing)', {
        request_id: requestId,
        user_id: user.id,
        error: auditErr,
      });
    }

    safeLog.info('api.nutrivision.photo.analyze', 'analyze ok', {
      request_id: requestId,
      user_id: user.id,
      job_id: jobId,
      latency_ms: latencyMs,
      providers_called: detectResult.providersCalled,
      from_cache: detectResult.fromCache,
      item_count: draftItems.length,
      blob_id: blobId,
    });

    return NextResponse.json({
      job_id: jobId,
      source_photo_blob_id: blobId,
      thumbnail_url: thumbnailUrl,
      meal_draft: mealDraft,
      requestId,
    });
  } catch (err) {
    const ai = err instanceof AIRouteError
      ? err
      : new AIRouteError('UNKNOWN', String(err), 500, 'Something went wrong. Try again.', err);
    safeLog.warn('api.nutrivision.photo.analyze', 'failure', {
      request_id: requestId,
      user_id: userId,
      code: ai.code,
      message: ai.message,
    });
    try {
      await recordAudit({
        requestId,
        userId,
        route: ROUTE,
        provider: 'google',
        outcome: 'failure',
        errorCode: ai.code,
        httpStatus: ai.httpStatus,
        latencyMs: Date.now() - startedAt,
      });
    } catch (auditErr) {
      safeLog.warn('api.nutrivision.photo.analyze', 'audit failure record failed (swallowed)', {
        request_id: requestId,
        user_id: userId,
        error: auditErr,
      });
    }
    return NextResponse.json(
      { error: { code: ai.code, message: ai.userMessage, requestId } },
      { status: ai.httpStatus },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

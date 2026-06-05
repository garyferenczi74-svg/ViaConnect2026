/**
 * Prompt 170l Phase 1a: types for the barcode-scan entry path.
 *
 * Public to 170l components + tests. Imports the richer OFFProduct from
 * the OFF client extension landed in this same phase.
 */

import { z } from 'zod';

// Re-exported from the OFF client extension landed in this same phase.
export type { OFFProduct } from '@/lib/nutrition/databases/open-food-facts';

// Cache row shape served back from /api/nutrition/barcode/lookup.
export interface CachedOFFProduct {
  barcode: string;
  product_name: string | null;
  brands: string | null;
  nutriments: Record<string, number> | null;
  image_url: string | null;
  nutriscore_grade: string | null;
  nova_group: number | null;
  ecoscore_grade: string | null;
  ingredients_text: string | null;
  allergens_tags: string[] | null;
  serving_size: string | null;
  completeness: number | null;
  cached_at: string;
  revalidated_at: string;
  expires_at: string;
}

export const BarcodeLookupOutcomeEnum = z.enum([
  'cache_hit',
  'off_hit',
  'off_miss',
  'error',
  'manual_entry',
  'fallback_to_photo',
]);
export type BarcodeLookupOutcome = z.infer<typeof BarcodeLookupOutcomeEnum>;

// Prompt 175j (2026-06-05): 'zxing_wasm' added after the html5-qrcode ->
// zxing-wasm swap. 'html5_qrcode' retained so older barcode_scan_session
// rows in Supabase keep decoding without a migration.
export const BarcodeDecoderKindEnum = z.enum([
  'html5_qrcode',
  'zxing_wasm',
  'mlkit_native',
  'manual',
]);
export type BarcodeDecoderKind = z.infer<typeof BarcodeDecoderKindEnum>;

export const BarcodeDeviceKindEnum = z.enum([
  'ios_native',
  'android_native',
  'web',
]);
export type BarcodeDeviceKind = z.infer<typeof BarcodeDeviceKindEnum>;

export const BarcodeSessionOutcomeEnum = z.enum([
  'saved',
  'abandoned',
  'error',
]);
export type BarcodeSessionOutcome = z.infer<typeof BarcodeSessionOutcomeEnum>;

// Sampled telemetry write payload (10% per Gate 4).
export const BarcodeScanSessionWriteSchema = z.object({
  meal_id: z.string().uuid().nullable(),
  barcode_value: z.string().min(1).max(50),
  lookup_outcome: BarcodeLookupOutcomeEnum,
  cache_hit: z.boolean(),
  off_completeness_score: z.number().nullable(),
  off_nova_group: z.number().int().nullable(),
  off_nutrition_grade_fr: z.string().nullable(),
  user_overrode_macros: z.boolean(),
  manual_entry: z.boolean(),
  multi_product_position: z.number().int().nullable(),
  decoder_used: BarcodeDecoderKindEnum,
  decoder_latency_ms: z.number().int().nonnegative().nullable(),
  lookup_latency_ms: z.number().int().nonnegative().nullable(),
  device_kind: BarcodeDeviceKindEnum,
  session_outcome: BarcodeSessionOutcomeEnum,
  error_class: z.string().nullable(),
});

export type BarcodeScanSessionWrite = z.infer<typeof BarcodeScanSessionWriteSchema>;

// 3 per-user preference toggles (Hannah §11.9 + Gate 3).
export interface BarcodeUserSettings {
  barcode_quality_indicators: boolean;
  barcode_audio_chime: boolean;
  barcode_haptic_feedback: boolean;
}

export const BarcodeUserSettingsSchema = z.object({
  barcode_quality_indicators: z.boolean(),
  barcode_audio_chime: z.boolean(),
  barcode_haptic_feedback: z.boolean(),
});

// Barcode formats we accept.
// Prompt 175d (2026-06-05): UPC_E and CODE_128 added so html5-qrcode
// decodes that match those symbologies flow through the supplement
// scanner's post-decode filter instead of being silently dropped. The
// existing food-domain consumers (NutriVision) accept the union as
// string | null at their use sites, so widening is non-breaking.
export type BarcodeFormat = 'EAN_13' | 'UPC_A' | 'UPC_E' | 'EAN_8' | 'ITF_14' | 'CODE_128';

// Decoded scan result from the client-side decoder.
export interface BarcodeDecodedResult {
  value: string;
  format: BarcodeFormat;
  decoder: BarcodeDecoderKind;
  decoder_latency_ms: number;
}

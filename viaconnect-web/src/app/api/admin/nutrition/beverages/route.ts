// Prompt 207a Task 7+8: admin-gated beverage catalog read + write API.
//
// GET  /api/admin/nutrition/beverages
//   Returns ALL beverage_catalog rows (active + inactive) ordered by sort_order
//   then display_name. Admin-only service-role read (no RLS filter).
//
// POST /api/admin/nutrition/beverages
//   Creates a new beverage_catalog row. Validates via Zod (9-enum category,
//   9-enum hydration_source_kind, positive default_volume_ml,
//   hydration_coefficient in [0.50, 1.60]). Slug set on create and is
//   immutable (enforced by the PATCH handler). Returns a non-blocking
//   compliance_note routed to Kelsey and Marshall when requires_claim_review
//   is true or evidence_source is provided.
//
// Auth: requireAdmin() (401/403 for non-admins); writes use createAdminClient()
// (service-role) so no write RLS policy is needed on beverage_catalog.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/flags/admin-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getDisplayName } from '@/lib/getDisplayName';
import {
  BEVERAGE_CATEGORIES,
} from '@/components/nutrition/hydration/BeveragePicker/BeveragePicker.types';
import { HYDRATION_SOURCE_KINDS } from '@/lib/nutrition/hydration/types';

// ---------------------------------------------------------------------------
// Shared Zod schema for beverage_catalog write operations
// ---------------------------------------------------------------------------

export const BeverageCatalogWriteSchema = z.object({
  slug: z.string().min(1).max(80).regex(/^[a-z0-9_]+$/, 'slug must be lowercase alphanumeric and underscores only'),
  display_name: z.string().min(1).max(120),
  category: z.enum(BEVERAGE_CATEGORIES as unknown as [string, ...string[]]),
  hydration_source_kind: z.enum(HYDRATION_SOURCE_KINDS as unknown as [string, ...string[]]),
  default_volume_ml: z.number().positive('default_volume_ml must be positive'),
  hydration_coefficient: z
    .number()
    .min(0.50, 'hydration_coefficient must be between 0.50 and 1.60')
    .max(1.60, 'hydration_coefficient must be between 0.50 and 1.60'),
  caffeine_mg_per_serving: z.number().min(0).default(0),
  kcal_per_serving: z.number().min(0).default(0),
  sugar_g: z.number().min(0).default(0),
  sodium_mg: z.number().min(0).default(0),
  potassium_mg: z.number().min(0).default(0),
  magnesium_mg: z.number().min(0).default(0),
  is_alcoholic: z.boolean().default(false),
  abv: z.number().min(0).max(100).nullable().default(null),
  evidence_source: z.string().max(500).nullable().default(null),
  requires_claim_review: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export type BeverageCatalogWrite = z.infer<typeof BeverageCatalogWriteSchema>;

// ---------------------------------------------------------------------------
// Compliance note helper
// ---------------------------------------------------------------------------

/**
 * Returns a non-blocking compliance note string when the write touches
 * health-claim-adjacent fields. Uses getDisplayName() for agent names so copy
 * stays consistent with the centralized NAME_MAP.
 */
export function buildComplianceNote(
  requiresClaimReview: boolean,
  evidenceSource: string | null | undefined,
): string | undefined {
  if (!requiresClaimReview && !evidenceSource) return undefined;
  const kelsey = getDisplayName('kelsey');
  const marshall = getDisplayName('marshall');
  const reasons: string[] = [];
  if (requiresClaimReview) reasons.push('requires_claim_review was set');
  if (evidenceSource) reasons.push('evidence_source was provided');
  return (
    `Compliance review required (${reasons.join('; ')}). ` +
    `Route this beverage entry to ${kelsey} and ${marshall} for clinical and compliance sign-off before activating.`
  );
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth.kind === 'error') return auth.response;

  try {
    const admin = createAdminClient();

    const result = await withTimeout(
      admin
        .from('beverage_catalog')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('display_name', { ascending: true }),
      4000,
      'api.admin.nutrition.beverages.list',
    );

    if (result.error) {
      safeLog.error('api.admin.nutrition.beverages', 'database query failed', {
        error: result.error,
      });
      return NextResponse.json({ error: 'Could not load beverage catalog' }, { status: 500 });
    }

    return NextResponse.json({ beverages: result.data ?? [] });
  } catch (err) {
    safeLog.error('api.admin.nutrition.beverages', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Could not load beverage catalog' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST: create a new beverage_catalog row
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth.kind === 'error') return auth.response;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = BeverageCatalogWriteSchema.safeParse(rawBody);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    // Surface the first field-level error message so the client knows which
    // field failed. Fall back to a generic message for cross-field errors.
    const firstFieldError = Object.entries(flat.fieldErrors)[0];
    const message = firstFieldError
      ? `${firstFieldError[0]}: ${firstFieldError[1]?.[0] ?? 'invalid value'}`
      : flat.formErrors[0] ?? 'Invalid body';
    return NextResponse.json(
      { error: message, details: flat },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  try {
    const admin = createAdminClient();

    const result = await withTimeout(
      admin
        .from('beverage_catalog')
        .insert(payload)
        .select('*')
        .single(),
      5000,
      'api.admin.nutrition.beverages.create',
    );

    if (result.error || !result.data) {
      safeLog.error('api.admin.nutrition.beverages', 'insert failed', {
        error: result.error,
        adminId: auth.user.id,
      });
      return NextResponse.json({ error: 'Could not create beverage' }, { status: 500 });
    }

    safeLog.info('api.admin.nutrition.beverages', 'beverage created', {
      slug: payload.slug,
      adminId: auth.user.id,
    });

    const complianceNote = buildComplianceNote(
      payload.requires_claim_review,
      payload.evidence_source,
    );

    const responseBody: Record<string, unknown> = { beverage: result.data };
    if (complianceNote) responseBody.compliance_note = complianceNote;

    return NextResponse.json(responseBody, { status: 201 });
  } catch (err) {
    safeLog.error('api.admin.nutrition.beverages', 'unexpected error on create', {
      error: err,
      adminId: auth.user.id,
    });
    return NextResponse.json({ error: 'Could not create beverage' }, { status: 500 });
  }
}

// Prompt 207a Task 8: PATCH /api/admin/nutrition/beverages/[slug]
//
// Updates a beverage_catalog row identified by its slug. The slug is
// IMMUTABLE: the URL slug identifies the row; any slug field in the request
// body is rejected with 400. Disable action sets is_active=false (soft delete).
// There is NO DELETE handler; hard deletes of catalog rows are forbidden.
//
// Validation: subset of BeverageCatalogWriteSchema (all fields optional except
// the constraint that hydration_coefficient, if present, must be in [0.50,1.60];
// category/hydration_source_kind, if present, must be in their 9-value enums).
//
// Compliance: when requires_claim_review is set true OR evidence_source is
// present in the patch body, the response includes a non-blocking
// compliance_note routed to Kelsey and Marshall (via getDisplayName()).
//
// Auth: requireAdmin() first; writes use createAdminClient() (service-role).
// Runtime: nodejs, force-dynamic.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/flags/admin-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { buildComplianceNote } from '../route';
import {
  BEVERAGE_CATEGORIES,
} from '@/components/nutrition/hydration/BeveragePicker/BeveragePicker.types';
import { HYDRATION_SOURCE_KINDS } from '@/lib/nutrition/hydration/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Patch schema: all fields optional, slug MUST NOT appear
// ---------------------------------------------------------------------------

const BeverageCatalogPatchSchema = z.object({
  display_name: z.string().min(1).max(120).optional(),
  category: z.enum(BEVERAGE_CATEGORIES as unknown as [string, ...string[]]).optional(),
  hydration_source_kind: z.enum(HYDRATION_SOURCE_KINDS as unknown as [string, ...string[]]).optional(),
  default_volume_ml: z.number().positive('default_volume_ml must be positive').optional(),
  hydration_coefficient: z
    .number()
    .min(0.50, 'hydration_coefficient must be between 0.50 and 1.60')
    .max(1.60, 'hydration_coefficient must be between 0.50 and 1.60')
    .optional(),
  caffeine_mg_per_serving: z.number().min(0).optional(),
  kcal_per_serving: z.number().min(0).optional(),
  sugar_g: z.number().min(0).optional(),
  sodium_mg: z.number().min(0).optional(),
  potassium_mg: z.number().min(0).optional(),
  magnesium_mg: z.number().min(0).optional(),
  is_alcoholic: z.boolean().optional(),
  abv: z.number().min(0).max(100).nullable().optional(),
  evidence_source: z.string().max(500).nullable().optional(),
  requires_claim_review: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

type BeverageCatalogPatch = z.infer<typeof BeverageCatalogPatchSchema>;

// ---------------------------------------------------------------------------
// PATCH handler
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, props: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const auth = await requireAdmin();
  if (auth.kind === 'error') return auth.response;

  const { slug } = params;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Slug immutability: reject any attempt to include slug in the patch body
  if (rawBody !== null && typeof rawBody === 'object' && 'slug' in rawBody) {
    return NextResponse.json(
      {
        error:
          'slug is immutable and cannot be changed. The URL slug identifies the row; remove slug from the request body.',
      },
      { status: 400 },
    );
  }

  const parsed = BeverageCatalogPatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstFieldError = Object.entries(flat.fieldErrors)[0];
    const message = firstFieldError
      ? `${firstFieldError[0]}: ${firstFieldError[1]?.[0] ?? 'invalid value'}`
      : flat.formErrors[0] ?? 'Invalid body';
    return NextResponse.json(
      { error: message, details: flat },
      { status: 400 },
    );
  }

  const patch: BeverageCatalogPatch = parsed.data;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    const result = await withTimeout(
      admin
        .from('beverage_catalog')
        .update(patch)
        .eq('slug', slug)
        .select('*')
        .single(),
      5000,
      'api.admin.nutrition.beverages.patch',
    );

    if (result.error || !result.data) {
      safeLog.error('api.admin.nutrition.beverages.patch', 'update failed', {
        error: result.error,
        slug,
        adminId: auth.user.id,
      });
      return NextResponse.json({ error: 'Could not update beverage' }, { status: 500 });
    }

    safeLog.info('api.admin.nutrition.beverages.patch', 'beverage updated', {
      slug,
      adminId: auth.user.id,
      fields: Object.keys(patch),
    });

    const complianceNote = buildComplianceNote(
      patch.requires_claim_review ?? false,
      patch.evidence_source,
    );

    const responseBody: Record<string, unknown> = { beverage: result.data };
    if (complianceNote) responseBody.compliance_note = complianceNote;

    return NextResponse.json(responseBody);
  } catch (err) {
    safeLog.error('api.admin.nutrition.beverages.patch', 'unexpected error', {
      error: err,
      slug,
      adminId: auth.user.id,
    });
    return NextResponse.json({ error: 'Could not update beverage' }, { status: 500 });
  }
}

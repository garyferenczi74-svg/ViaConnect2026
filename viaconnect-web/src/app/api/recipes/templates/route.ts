/**
 * Prompt 170f Phase C: public recipe templates list endpoint.
 *
 * GET /api/recipes/templates -> published templates with optional filtering
 * by diet_tag / cuisine_tag / meal_type. Used by the cold-start browser when
 * a user has fewer than 5 saved recipes (per spec §5 cold-start contract).
 *
 * No auth required since templates are public; but we still enforce a sane
 * default limit (20) per query and validate filter inputs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import {
  RECIPE_MEAL_TYPE_TAGS,
} from '@/lib/recipes/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  diet_tag: z.string().max(40).optional(),
  cuisine_tag: z.string().max(40).optional(),
  meal_type: z.enum(RECIPE_MEAL_TYPE_TAGS).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.RECIPES_LIBRARY_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Recipe library is temporarily unavailable.' }, { status: 503 });
  }

  const sp = new URL(req.url).searchParams;
  const parsed = QuerySchema.safeParse({
    diet_tag: sp.get('diet_tag') ?? undefined,
    cuisine_tag: sp.get('cuisine_tag') ?? undefined,
    meal_type: sp.get('meal_type') ?? undefined,
    limit: sp.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  let query = admin
    .from('recipe_public_templates')
    .select('id, slug, name, description, photo_url, servings, cuisine_tags, diet_tags, meal_type_tags, prep_minutes, total_calories, total_protein_g, total_carbs_g, total_fat_g, allergen_flags, save_count')
    .eq('is_published', true)
    .order('save_count', { ascending: false })
    .limit(parsed.data.limit);

  if (parsed.data.diet_tag) query = query.contains('diet_tags', [parsed.data.diet_tag]);
  if (parsed.data.cuisine_tag) query = query.contains('cuisine_tags', [parsed.data.cuisine_tag]);
  if (parsed.data.meal_type) query = query.contains('meal_type_tags', [parsed.data.meal_type]);

  const { data, error } = await query;
  if (error) {
    safeLog.error('api.recipes.templates.list', 'select failed', { error });
    return NextResponse.json({ error: 'Could not load templates' }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [] });
}

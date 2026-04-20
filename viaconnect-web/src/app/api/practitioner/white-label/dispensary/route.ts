// Prompt #96 Phase 6: Practitioner-side dispensary settings.
//
// GET   /api/practitioner/white-label/dispensary             list approved labels with settings (joined)
// PATCH /api/practitioner/white-label/dispensary
//   body: { label_design_id, retail_price_cents, patient_facing_description?,
//           is_published?, is_featured?, display_order? }
//   Upsert on (practitioner_id, label_design_id).
//
// Publishing the first label also generates a dispensary_slug on the
// practitioner row when one does not exist yet.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const patchSchema = z.object({
  label_design_id: z.string().uuid(),
  retail_price_cents: z.number().int().min(0).max(100_000_00),
  patient_facing_description: z.string().max(2000).optional(),
  is_published: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
});

function slugify(input: string): string {
  return input.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'practice';
}

async function loadCtx(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as any;
  const { data: practitioner } = await sb
    .from('practitioners').select('id, practice_name, dispensary_slug').eq('user_id', user.id).maybeSingle();
  if (!practitioner) return { ok: false as const, response: NextResponse.json({ error: 'No practitioner record' }, { status: 404 }) };
  return { ok: true as const, user, practitioner };
}

export async function GET(): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await loadCtx(supabase);
  if (!ctx.ok) return ctx.response;

  const sb = supabase as any;
  // Approved labels (any version) joined with their dispensary settings.
  const { data: labels } = await sb
    .from('white_label_label_designs')
    .select(`
      id, display_product_name, status, version_number, product_catalog_id,
      product_catalog (id, name, sku),
      white_label_dispensary_settings!inner (id, retail_price_cents, patient_facing_description, is_published, is_featured, display_order)
    `)
    .eq('practitioner_id', ctx.practitioner.id)
    .eq('is_current_version', true)
    .in('status', ['approved', 'production_ready']);

  // Also include approved labels WITHOUT a settings row yet (left join workaround).
  const { data: bareLabels } = await sb
    .from('white_label_label_designs')
    .select('id, display_product_name, status, version_number, product_catalog_id, product_catalog (id, name, sku)')
    .eq('practitioner_id', ctx.practitioner.id)
    .eq('is_current_version', true)
    .in('status', ['approved', 'production_ready']);

  const haveSettings = new Set((labels ?? []).map((l: any) => l.id));
  const bare = (bareLabels ?? []).filter((l: any) => !haveSettings.has(l.id));

  return NextResponse.json({
    practitioner: ctx.practitioner,
    labels_with_settings: labels ?? [],
    labels_without_settings: bare,
  });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await loadCtx(supabase);
  if (!ctx.ok) return ctx.response;

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
  }

  const sb = supabase as any;
  // Verify the label is owned by this practitioner.
  const { data: label } = await sb
    .from('white_label_label_designs')
    .select('id, practitioner_id, status')
    .eq('id', parsed.data.label_design_id)
    .maybeSingle();
  if (!label || label.practitioner_id !== ctx.practitioner.id) {
    return NextResponse.json({ error: 'Label not found' }, { status: 404 });
  }
  if (!['approved', 'production_ready'].includes(label.status)) {
    return NextResponse.json({ error: `Label is in status ${label.status}; only approved labels can appear in the dispensary.` }, { status: 400 });
  }

  const upsertRow: Record<string, unknown> = {
    practitioner_id: ctx.practitioner.id,
    label_design_id: parsed.data.label_design_id,
    retail_price_cents: parsed.data.retail_price_cents,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.patient_facing_description !== undefined) upsertRow.patient_facing_description = parsed.data.patient_facing_description;
  if (parsed.data.is_published !== undefined) upsertRow.is_published = parsed.data.is_published;
  if (parsed.data.is_featured !== undefined) upsertRow.is_featured = parsed.data.is_featured;
  if (parsed.data.display_order !== undefined) upsertRow.display_order = parsed.data.display_order;

  const { data, error } = await sb
    .from('white_label_dispensary_settings')
    .upsert(upsertRow, { onConflict: 'practitioner_id,label_design_id' })
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-generate dispensary_slug on first publish if missing.
  if (parsed.data.is_published === true && !ctx.practitioner.dispensary_slug) {
    const baseSlug = slugify(ctx.practitioner.practice_name);
    let candidate = baseSlug;
    // Append id-suffix on collision.
    const { data: clash } = await sb
      .from('practitioners').select('id').eq('dispensary_slug', candidate).maybeSingle();
    if (clash) candidate = `${baseSlug}-${ctx.practitioner.id.slice(0, 6)}`;
    await sb.from('practitioners').update({ dispensary_slug: candidate, updated_at: new Date().toISOString() }).eq('id', ctx.practitioner.id);
  }

  return NextResponse.json({ settings: data });
}

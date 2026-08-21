/**
 * Prompt 226: consumer CRUD for user-entered prescribed peptides.
 * Allowlist only (converter_eligible). Values originate from the user Rx.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadConverterAllowlist } from '@/lib/peptides/converterAllowlist';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('user_prescribed_peptides')
    .select(
      'id, peptide_id, dose_amount, dose_unit, vial_amount, vial_unit, diluent_ml, frequency_text, notes, label, created_at, updated_at',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, items: [] });
  }

  const peptideIds = [...new Set((data ?? []).map((r) => r.peptide_id))];
  const nameById = new Map<string, { displayName: string; slug: string }>();
  if (peptideIds.length) {
    const { data: peps } = await admin
      .from('kb_peptides')
      .select('id, display_name, slug')
      .in('id', peptideIds);
    for (const p of peps ?? []) {
      nameById.set(String(p.id), {
        displayName: String(p.display_name ?? p.slug),
        slug: String(p.slug),
      });
    }
  }

  const allowlist = await loadConverterAllowlist();
  const allowlistCompounds = allowlist.ok ? allowlist.compounds : [];

  return NextResponse.json({
    ok: true,
    items: (data ?? []).map((row) => ({
      ...row,
      displayName: nameById.get(String(row.peptide_id))?.displayName ?? 'Peptide',
      slug: nameById.get(String(row.peptide_id))?.slug ?? '',
    })),
    allowlist: allowlistCompounds.map((c) => ({
      id: c.id,
      slug: c.slug,
      displayName: c.displayName,
      iuEnabled: c.iuMgFactorVerified && c.iuMgFactor != null,
    })),
    allowlistUnavailable: !allowlist.ok,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const peptideId = typeof body.peptideId === 'string' ? body.peptideId : '';
  const doseAmount = Number(body.doseAmount);
  const doseUnit = body.doseUnit;
  if (!peptideId || !(doseAmount > 0) || !['mg', 'mcg', 'IU'].includes(String(doseUnit))) {
    return NextResponse.json(
      { ok: false, error: 'peptideId and positive doseAmount with unit required' },
      { status: 400 },
    );
  }

  const allowlist = await loadConverterAllowlist();
  if (!allowlist.ok) {
    return NextResponse.json({ ok: false, unavailable: true, error: allowlist.reason });
  }
  const compound = allowlist.compounds.find((c) => c.id === peptideId);
  if (!compound) {
    return NextResponse.json(
      {
        ok: false,
        error: 'peptide_not_found',
        message: 'Choose a peptide from the catalog list.',
      },
      { status: 403 },
    );
  }

  if (doseUnit === 'IU' && !compound.iuMgFactorVerified) {
    return NextResponse.json({
      ok: false,
      error: 'iu_not_enabled',
      message: 'IU is not enabled for this compound until a verified factor exists.',
    });
  }

  const vialAmount =
    body.vialAmount === '' || body.vialAmount == null
      ? null
      : Number(body.vialAmount);
  const diluentMl =
    body.diluentMl === '' || body.diluentMl == null ? null : Number(body.diluentMl);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('user_prescribed_peptides')
    .upsert(
      {
        user_id: user.id,
        peptide_id: peptideId,
        dose_amount: doseAmount,
        dose_unit: doseUnit,
        vial_amount: vialAmount != null && vialAmount > 0 ? vialAmount : null,
        vial_unit:
          body.vialUnit === 'mg' || body.vialUnit === 'mcg' || body.vialUnit === 'IU'
            ? body.vialUnit
            : null,
        diluent_ml: diluentMl != null && diluentMl > 0 ? diluentMl : null,
        frequency_text: String(body.frequencyText ?? '').slice(0, 200),
        notes: String(body.notes ?? '').slice(0, 500),
        label: String(body.label ?? '').slice(0, 80),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,peptide_id' },
    )
    .select('id, peptide_id, dose_amount, dose_unit, created_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message.slice(0, 200) });
  }

  return NextResponse.json({
    ok: true,
    item: data,
    compound: { id: compound.id, slug: compound.slug, displayName: compound.displayName },
  });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ ok: false, error: 'id_required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('user_prescribed_peptides')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message.slice(0, 200) });
  }
  return NextResponse.json({ ok: true });
}

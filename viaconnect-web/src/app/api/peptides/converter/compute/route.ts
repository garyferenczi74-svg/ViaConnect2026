/**
 * Prompt 226: server-side conversion. Never invents dose. Allowlist-enforced.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getActiveConverterDisclaimer,
  userHasAcknowledged,
} from '@/lib/peptides/converterGate';
import { loadConverterAllowlist } from '@/lib/peptides/converterAllowlist';
import {
  computeSyringeUnits,
  type BarrelSize,
  type MassUnit,
  type SyringeStandard,
} from '@/lib/peptides/converterMath';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const disclaimer = await getActiveConverterDisclaimer();
  if (!disclaimer) {
    return NextResponse.json(
      { ok: false, error: 'disclaimer_not_cleared' },
      { status: 403 },
    );
  }

  const ack = await userHasAcknowledged(user.id, disclaimer.id);
  if (!ack.acked) {
    return NextResponse.json(
      { ok: false, error: 'acknowledgement_required' },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const peptideId = typeof body.peptideId === 'string' ? body.peptideId : '';
  if (!peptideId) {
    return NextResponse.json({ ok: false, error: 'peptideId_required' }, { status: 400 });
  }

  const allowlist = await loadConverterAllowlist();
  if (!allowlist.ok) {
    return NextResponse.json({
      ok: false,
      unavailable: true,
      error: allowlist.reason,
    });
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

  const vialUnit = body.vialUnit as MassUnit;
  const doseUnit = body.doseUnit as MassUnit;
  const syringeStandard = body.syringeStandard as SyringeStandard;
  const barrelSize = Number(body.barrelSize) as BarrelSize;

  const result = computeSyringeUnits({
    vialAmount: Number(body.vialAmount),
    vialUnit,
    diluentMl: Number(body.diluentMl),
    doseAmount: Number(body.doseAmount),
    doseUnit,
    syringeStandard,
    barrelSize,
    iuMgFactor: compound.iuMgFactor,
    iuMgFactorVerified: compound.iuMgFactorVerified,
  });

  return NextResponse.json({
    ok: result.ok,
    peptide: { id: compound.id, slug: compound.slug, displayName: compound.displayName },
    result,
    layer3: disclaimer.layer3Text,
    disclaimerVersion: disclaimer.version,
  });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'POST only' }, { status: 405 });
}

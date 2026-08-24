/**
 * Prompt 226: record first-use disclaimer ack + syringe standard confirmation.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveConverterDisclaimer } from '@/lib/peptides/converterGate';

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

  let body: { syringeStandard?: unknown };
  try {
    body = (await request.json()) as { syringeStandard?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const standard =
    body.syringeStandard === 'U-40'
      ? 'U-40'
      : body.syringeStandard === 'U-100'
        ? 'U-100'
        : null;
  if (!standard) {
    return NextResponse.json(
      { error: 'syringeStandard must be U-100 or U-40' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from('converter_disclaimer_acks').upsert(
    {
      user_id: user.id,
      disclaimer_version_id: disclaimer.id,
      syringe_standard_confirmed: standard,
      acknowledged_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,disclaimer_version_id' },
  );

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message.slice(0, 200) },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    acknowledged: true,
    syringeStandardConfirmed: standard,
    disclaimerVersion: disclaimer.version,
  });
}

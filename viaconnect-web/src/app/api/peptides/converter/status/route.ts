/**
 * Prompt 226: converter gate + disclaimer + ack status for the signed-in user.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getActiveConverterDisclaimer,
  userHasAcknowledged,
} from '@/lib/peptides/converterGate';
import { CONVERTER_COPY } from '@/lib/peptides/converterMath';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const disclaimer = await getActiveConverterDisclaimer();
  if (!disclaimer) {
    return NextResponse.json({
      ok: true,
      available: false,
      reason: 'lex_or_marshall_pending',
      copy: CONVERTER_COPY,
      message:
        'The concentration converter is unavailable until disclaimer clearance is complete.',
    });
  }

  const ack = await userHasAcknowledged(user.id, disclaimer.id);
  return NextResponse.json({
    ok: true,
    available: true,
    acknowledged: ack.acked,
    syringeStandardConfirmed: ack.syringeStandard,
    disclaimer: {
      id: disclaimer.id,
      version: disclaimer.version,
      layer1Markdown: disclaimer.layer1Markdown,
      layer2Text: disclaimer.layer2Text,
      layer3Text: disclaimer.layer3Text,
    },
    copy: CONVERTER_COPY,
  });
}

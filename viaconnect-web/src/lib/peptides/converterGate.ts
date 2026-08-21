/**
 * Prompt 226: Lex/Marshall gate for Module A converter.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface ActiveDisclaimer {
  id: string;
  version: string;
  layer1Markdown: string;
  layer2Text: string;
  layer3Text: string;
}

export async function getActiveConverterDisclaimer(): Promise<ActiveDisclaimer | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('converter_disclaimer_versions')
    .select('id, version, layer1_markdown, layer2_text, layer3_text, lex_status, marshall_status')
    .eq('lex_status', 'cleared')
    .eq('marshall_status', 'approved')
    .order('effective_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: String(data.id),
    version: String(data.version),
    layer1Markdown: String(data.layer1_markdown),
    layer2Text: String(data.layer2_text),
    layer3Text: String(data.layer3_text),
  };
}

export async function userHasAcknowledged(
  userId: string,
  disclaimerVersionId: string,
): Promise<{ acked: boolean; syringeStandard: 'U-100' | 'U-40' | null }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('converter_disclaimer_acks')
    .select('syringe_standard_confirmed')
    .eq('user_id', userId)
    .eq('disclaimer_version_id', disclaimerVersionId)
    .maybeSingle();
  if (!data) return { acked: false, syringeStandard: null };
  const s = String(data.syringe_standard_confirmed);
  return {
    acked: true,
    syringeStandard: s === 'U-40' ? 'U-40' : 'U-100',
  };
}

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type { ConsentSnapshot } from './consent';

type UserClient = SupabaseClient<Database>;

interface ConsentColumns {
  ai_data_sharing_accepted_at: string | null;
  ai_data_sharing_revoked_at: string | null;
  ai_data_sharing_consent_version: string | null;
}

export async function readAiConsentSnapshot(
  supabase: UserClient,
  userId: string,
): Promise<ConsentSnapshot | null | 'error'> {
  const { data, error } = await supabase
    .from('user_consents')
    .select(
      'ai_data_sharing_accepted_at, ai_data_sharing_revoked_at, ai_data_sharing_consent_version',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return 'error';
  if (!data) return null;
  const row = data as ConsentColumns;
  return {
    acceptedAt: row.ai_data_sharing_accepted_at,
    revokedAt: row.ai_data_sharing_revoked_at,
    version: row.ai_data_sharing_consent_version,
  };
}

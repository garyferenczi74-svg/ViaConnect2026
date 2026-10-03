// VIA-10 edge-function copy of the consent decision in
// src/lib/ai/data-sharing/consent.ts. Keep AI_DATA_SHARING_CONSENT_VERSION
// identical to that file. The Next app tests fail if the versions diverge.
//
// Gate: AI_THIRD_PARTY_CONSENT_GATE=true on the Supabase function secrets,
// after the consent migration is applied. Off by default.

export const AI_DATA_SHARING_CONSENT_VERSION = '2026-10-03.v1';

interface ConsentRow {
  ai_data_sharing_accepted_at?: string | null;
  ai_data_sharing_revoked_at?: string | null;
  ai_data_sharing_consent_version?: string | null;
}

interface ConsentQuery {
  select(columns: string): {
    eq(column: string, value: string): {
      maybeSingle(): Promise<{ data: ConsentRow | null; error: { message: string } | null }>;
    };
  };
}

interface ConsentClient {
  from(table: string): ConsentQuery;
}

export function aiDataSharingGateEnabled(): boolean {
  const value = Deno.env.get('AI_THIRD_PARTY_CONSENT_GATE') ?? '';
  return value === 'true' || value === '1';
}

export function consentIsCurrent(row: ConsentRow | null): boolean {
  if (!row?.ai_data_sharing_accepted_at) return false;
  if (row.ai_data_sharing_consent_version !== AI_DATA_SHARING_CONSENT_VERSION) return false;
  const accepted = Date.parse(row.ai_data_sharing_accepted_at);
  if (Number.isNaN(accepted)) return false;
  if (row.ai_data_sharing_revoked_at) {
    const revoked = Date.parse(row.ai_data_sharing_revoked_at);
    if (Number.isNaN(revoked) || revoked >= accepted) return false;
  }
  return true;
}

/** True when the gate is on and this user must not be sent to an AI vendor. */
export async function aiDataSharingBlocked(
  sb: ConsentClient,
  userId: string,
): Promise<boolean> {
  if (!aiDataSharingGateEnabled()) return false;
  const { data, error } = await sb
    .from('user_consents')
    .select('ai_data_sharing_accepted_at, ai_data_sharing_revoked_at, ai_data_sharing_consent_version')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return true;
  return !consentIsCurrent(data);
}

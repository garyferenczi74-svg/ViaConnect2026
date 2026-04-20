// Prompt #98 Phase 2: Practitioner referral-code lifecycle.
//
// Get-or-create. Codes are stable for life of enrollment so a
// practitioner who has shared their URL on a conference flyer or in
// an email signature does not have it suddenly stop working. On
// random-suffix collision (very rare given the 4-char alphabet of
// 32 confusable-safe chars = 32^4 = 1,048,576 combos per practice
// name) we retry once with a fresh suffix.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildReferralCode,
  generateRandomSuffix,
  toCodeSlug,
} from './schema-types';

export interface CodeRecord {
  id: string;
  practitioner_id: string;
  code: string;
  code_slug: string;
  is_active: boolean;
  cached_total_clicks: number;
  cached_total_attributions: number;
  cached_total_successful_referrals: number;
  cached_total_credits_earned_cents: number;
}

export interface GetOrCreateInput {
  practitioner_id: string;
  practice_name: string;
  account_status: string | null;
  supabase: SupabaseClient | unknown;
}

export interface GetOrCreateResult {
  code: CodeRecord;
  was_existing: boolean;
}

const MAX_COLLISION_RETRIES = 5;

export async function getOrCreateReferralCode(input: GetOrCreateInput): Promise<GetOrCreateResult> {
  if (input.account_status !== 'active') {
    throw new Error('Only active practitioners can generate referral codes');
  }

  const sb = input.supabase as any;

  // 1. Return existing active row if any.
  const existingRes = await sb
    .from('practitioner_referral_codes')
    .select('id, practitioner_id, code, code_slug, is_active, cached_total_clicks, cached_total_attributions, cached_total_successful_referrals, cached_total_credits_earned_cents')
    .eq('practitioner_id', input.practitioner_id)
    .eq('is_active', true)
    .maybeSingle();

  if (existingRes.error) {
    throw new Error(`Code lookup failed: ${existingRes.error.message}`);
  }
  if (existingRes.data) {
    return { code: existingRes.data as CodeRecord, was_existing: true };
  }

  // 2. Insert with collision retry on the UNIQUE (code, code_slug) constraints.
  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
    const suffix = generateRandomSuffix(4);
    const code = buildReferralCode(input.practice_name, suffix);
    const code_slug = toCodeSlug(code);

    const insertRes = await sb
      .from('practitioner_referral_codes')
      .insert({
        practitioner_id: input.practitioner_id,
        code,
        code_slug,
      })
      .select('id, practitioner_id, code, code_slug, is_active, cached_total_clicks, cached_total_attributions, cached_total_successful_referrals, cached_total_credits_earned_cents')
      .maybeSingle();

    if (!insertRes.error && insertRes.data) {
      return { code: insertRes.data as CodeRecord, was_existing: false };
    }

    // 23505 = unique_violation; everything else fails immediately.
    if (insertRes.error?.code !== '23505') {
      throw new Error(`Code insert failed: ${insertRes.error?.message ?? 'unknown'}`);
    }
    // Otherwise loop and try a fresh suffix.
  }

  throw new Error(`Could not generate a unique referral code after ${MAX_COLLISION_RETRIES} attempts`);
}

/**
 * Convenience wrapper: build the public referral URL for a code.
 */
export function buildReferralUrl(codeSlug: string, baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return `${trimmed}/practitioner/join?ref=${encodeURIComponent(codeSlug)}`;
}

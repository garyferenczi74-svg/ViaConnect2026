// Prompt #92 Phase 4: Helix referral engine.
//
// Tracks customer-to-customer referrals through three milestones:
//   1. signup attribution (+100 base points to referrer)
//   2. first supplement purchase (+500 base points)
//   3. GeneX360 purchase (+1000 base points)
// All credits route through creditEarning() so the referrer's Helix
// tier multiplier applies.

import { randomBytes } from 'node:crypto';
import { creditEarning } from './earning-engine';
import type { PricingSupabaseClient } from '@/lib/pricing/supabase-types';
import type { EarningResult } from '@/types/helix';

// ----- Pure: deterministic code generation ---------------------------------

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I for legibility
const CODE_LEN = 6;

/** Pure: generate a legible 6-char code. Injectable random source for tests. */
export function generateCodeString(randomByte: () => number = defaultRandomByte): string {
  let out = '';
  for (let i = 0; i < CODE_LEN; i++) {
    out += CODE_CHARS[randomByte() % CODE_CHARS.length];
  }
  return out;
}

function defaultRandomByte(): number {
  return randomBytes(1)[0];
}

export function normalizeCode(raw: string | null | undefined): string {
  return (raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN);
}

// ----- DB-backed -----------------------------------------------------------

export async function getReferralCode(
  client: PricingSupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await client
    .from('helix_referral_codes')
    .select('code')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as { code: string } | null)?.code ?? null;
}

/** Get the user's personal code, generating and persisting on first call.
 *  Retries up to 5 times on the rare unique-code collision. */
export async function getOrCreateReferralCode(
  client: PricingSupabaseClient,
  userId: string,
): Promise<string> {
  const existing = await getReferralCode(client, userId);
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCodeString();
    const { error } = await client
      .from('helix_referral_codes')
      .insert({ user_id: userId, code } as never);
    if (!error) return code;
    // unique_violation code 23505: try another code
    const isConflict = (error as { code?: string }).code === '23505';
    if (!isConflict) throw new Error(`Failed to create referral code: ${error.message}`);
  }
  throw new Error('Unable to allocate a unique referral code after 5 attempts');
}

export interface SignupAttributionInput {
  code: string;           // the code the new user entered on signup
  newUserId: string;      // the freshly-created user's id
  newUserEmail: string;   // required by existing helix_referrals.referred_email NOT NULL
}

export interface SignupAttributionResult {
  attributed: boolean;
  referrerUserId?: string;
  referralRowId?: string;
  earning?: EarningResult;
  skippedReason?: string;
}

export async function trackReferralSignup(
  client: PricingSupabaseClient,
  input: SignupAttributionInput,
): Promise<SignupAttributionResult> {
  const code = normalizeCode(input.code);
  if (!code) return { attributed: false, skippedReason: 'No referral code supplied' };

  // Resolve code -> referrer
  const { data: row } = await client
    .from('helix_referral_codes')
    .select('user_id')
    .eq('code', code)
    .maybeSingle();
  const referrerUserId = (row as { user_id: string } | null)?.user_id ?? null;
  if (!referrerUserId) return { attributed: false, skippedReason: 'Unknown referral code' };

  if (referrerUserId === input.newUserId) {
    return { attributed: false, skippedReason: 'Self-referral rejected' };
  }

  // Check if this user was already attributed to someone (should be blocked by
  // unique index but we check first for a clean response).
  const { data: existing } = await client
    .from('helix_referrals')
    .select('id')
    .eq('referred_user_id', input.newUserId)
    .maybeSingle();
  if (existing) {
    return { attributed: false, skippedReason: 'User already attributed to a referrer' };
  }

  // Create attribution row
  const { data: created, error: insErr } = await client
    .from('helix_referrals')
    .insert({
      referrer_id: referrerUserId,
      referred_email: input.newUserEmail,
      referred_user_id: input.newUserId,
      referral_code: code,
      status: 'signed_up',
      signed_up_at: new Date().toISOString(),
    } as never)
    .select('id')
    .single();
  if (insErr || !created) {
    return { attributed: false, skippedReason: `Attribution insert failed: ${insErr?.message ?? 'unknown'}` };
  }

  // Credit referrer through the earning engine (tier-multiplied)
  const earning = await creditEarning(client, {
    userId: referrerUserId,
    eventTypeId: 'referral_signup',
    referenceId: input.newUserId,
    metadata: { reference_type: 'referred_user', referral_code: code },
  });

  // Mirror the awarded amount onto the referral row for quick reads
  if (earning.success && earning.pointsEarned) {
    await client
      .from('helix_referrals')
      .update({ referrer_tokens_awarded: earning.pointsEarned } as never)
      .eq('id', (created as { id: string }).id);
  }

  return {
    attributed: true,
    referrerUserId,
    referralRowId: (created as { id: string }).id,
    earning,
  };
}

export interface PurchaseAttributionInput {
  referredUserId: string;
  orderId: string;
  isFirstPurchase: boolean;
  isGeneX360: boolean;
}

export interface PurchaseAttributionResult {
  credited: boolean;
  firstPurchaseEarning?: EarningResult;
  genex360Earning?: EarningResult;
  skippedReason?: string;
}

export async function trackReferralPurchase(
  client: PricingSupabaseClient,
  input: PurchaseAttributionInput,
): Promise<PurchaseAttributionResult> {
  const { data: row } = await client
    .from('helix_referrals')
    .select('id, referrer_id, first_purchase_at')
    .eq('referred_user_id', input.referredUserId)
    .maybeSingle();
  const referral = row as { id: string; referrer_id: string | null; first_purchase_at: string | null } | null;
  if (!referral || !referral.referrer_id) {
    return { credited: false, skippedReason: 'Buyer is not a referred user' };
  }

  const firstPurchaseRecorded = Boolean(referral.first_purchase_at);
  let firstPurchaseEarning: EarningResult | undefined;
  let genex360Earning: EarningResult | undefined;

  if (input.isFirstPurchase && !firstPurchaseRecorded) {
    firstPurchaseEarning = await creditEarning(client, {
      userId: referral.referrer_id,
      eventTypeId: 'referral_first_purchase',
      referenceId: input.orderId,
      metadata: { reference_type: 'order', referred_user_id: input.referredUserId },
    });
    await client
      .from('helix_referrals')
      .update({
        status: 'first_purchase',
        first_purchase_at: new Date().toISOString(),
      } as never)
      .eq('id', referral.id);
  }

  if (input.isGeneX360) {
    genex360Earning = await creditEarning(client, {
      userId: referral.referrer_id,
      eventTypeId: 'referral_genex360',
      referenceId: input.orderId,
      metadata: { reference_type: 'order', referred_user_id: input.referredUserId },
    });
    await client
      .from('helix_referrals')
      .update({ first_purchase_genex360_at: new Date().toISOString() } as never)
      .eq('id', referral.id);
  }

  return {
    credited: Boolean(firstPurchaseEarning?.success || genex360Earning?.success),
    firstPurchaseEarning,
    genex360Earning,
  };
}

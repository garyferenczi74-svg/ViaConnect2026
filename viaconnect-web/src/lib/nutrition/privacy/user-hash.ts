// Prompt #170 Phase 1b: salted SHA-256 hash of the user_id, stamped per
// user_meal_corpus write. Per Prompt 170 §6.6 and Prompt 170a §4.4 the live
// salt is held in Supabase Vault and accessed via SECURITY DEFINER function
// public.get_corpus_salt() (service_role only EXECUTE). Cloud Postgres does
// not let us set app.corpus_salt via ALTER DATABASE, so the salt is fetched
// via supabaseAdmin.rpc('get_corpus_salt') and the digest is computed locally
// with node:crypto.
//
// saltVersion is hardcoded at 1 for now to match user_meal_corpus.salt_version
// default. Salt rotation (bumping salt_version) is a later phase.
//
// Hard rules honored: no em or en dashes anywhere, no emojis, no any.

import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserHashResult {
  userHash: string;
  saltVersion: number;
}

const CURRENT_SALT_VERSION = 1;

export function computeUserHashWithSalt(
  userId: string,
  salt: string,
  saltVersion: number,
): UserHashResult {
  if (!userId || typeof userId !== 'string') {
    throw new Error('computeUserHashWithSalt: userId is required');
  }
  if (!salt || typeof salt !== 'string') {
    throw new Error('computeUserHashWithSalt: salt is required');
  }
  if (!Number.isInteger(saltVersion) || saltVersion < 1) {
    throw new Error('computeUserHashWithSalt: saltVersion must be a positive integer');
  }
  const userHash = createHash('sha256').update(`${userId}${salt}`).digest('hex');
  return { userHash, saltVersion };
}

export async function computeUserHash(args: {
  userId: string;
  supabaseAdmin: SupabaseClient;
}): Promise<UserHashResult> {
  const { userId, supabaseAdmin } = args;
  if (!userId || typeof userId !== 'string') {
    throw new Error('computeUserHash: userId is required');
  }

  const { data, error } = await supabaseAdmin.rpc('get_corpus_salt');
  if (error) {
    throw new Error(`computeUserHash: failed to read corpus salt: ${error.message}`);
  }
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('computeUserHash: get_corpus_salt returned empty value');
  }

  return computeUserHashWithSalt(userId, data, CURRENT_SALT_VERSION);
}

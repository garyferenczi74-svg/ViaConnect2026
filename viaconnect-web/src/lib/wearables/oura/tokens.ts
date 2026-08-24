// Encrypted Oura token store + single-flight refresh. No TypeScript any.

import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  encryptWearableToken,
  tryDecryptWearableToken,
  isWearableTokenKeyConfigured,
} from '../crypto';
import { refreshOuraToken } from './client';

const SCOPE = 'lib.wearables.oura.tokens';
const REFRESH_SKEW_MS = 5 * 60 * 1000;

const inflight = new Map<string, Promise<string | null>>();

interface TokenRow {
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  expires_at: string;
}

export async function storeOuraTokens(
  admin: SupabaseClient,
  userId: string,
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    scope?: string;
  },
): Promise<void> {
  if (!isWearableTokenKeyConfigured()) {
    throw new Error('WEARABLE_TOKEN_KEY not configured');
  }
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
  await withTimeout(
    admin.from('wearable_oauth_tokens').upsert(
      {
        user_id: userId,
        provider: 'oura',
        access_token_encrypted: encryptWearableToken(tokens.accessToken),
        refresh_token_encrypted: encryptWearableToken(tokens.refreshToken),
        expires_at: expiresAt,
        token_scope: tokens.scope ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' },
    ),
    4000,
    `${SCOPE}.store`,
  );
}

export async function deleteOuraTokens(admin: SupabaseClient, userId: string): Promise<void> {
  try {
    await withTimeout(
      admin.from('wearable_oauth_tokens').delete().eq('user_id', userId).eq('provider', 'oura'),
      4000,
      `${SCOPE}.delete`,
    );
  } catch (err) {
    safeLog.warn(SCOPE, 'delete tokens failed', { error: err });
  }
}

export async function getOuraAccessToken(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const existing = inflight.get(userId);
  if (existing) return existing;

  const run = (async () => {
    try {
      const { data, error } = await withTimeout(
        admin
          .from('wearable_oauth_tokens')
          .select('access_token_encrypted, refresh_token_encrypted, expires_at')
          .eq('user_id', userId)
          .eq('provider', 'oura')
          .maybeSingle(),
        4000,
        `${SCOPE}.load`,
      );
      if (error || !data) return null;
      const row = data as TokenRow;

      const access = tryDecryptWearableToken(row.access_token_encrypted);
      const refresh = tryDecryptWearableToken(row.refresh_token_encrypted);
      if (!access || !refresh) {
        await markSourceError(admin, userId, 'token_decrypt_failed');
        return null;
      }

      const expiresAt = new Date(row.expires_at).getTime();
      if (expiresAt - Date.now() > REFRESH_SKEW_MS) {
        return access;
      }

      try {
        const next = await refreshOuraToken(refresh);
        await storeOuraTokens(admin, userId, {
          accessToken: next.access_token,
          refreshToken: next.refresh_token || refresh,
          expiresIn: next.expires_in ?? 3600,
        });
        return next.access_token;
      } catch (err) {
        const invalidGrant =
          err && typeof err === 'object' && 'invalidGrant' in err
            ? Boolean((err as { invalidGrant?: boolean }).invalidGrant)
            : false;
        if (invalidGrant) {
          await markSourceError(admin, userId, 'invalid_grant');
        }
        safeLog.warn(SCOPE, 'refresh failed', { error: err });
        return null;
      }
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.warn(SCOPE, 'token load timeout', { error: err });
      } else {
        safeLog.error(SCOPE, 'getOuraAccessToken failed', { error: err });
      }
      return null;
    } finally {
      inflight.delete(userId);
    }
  })();

  inflight.set(userId, run);
  return run;
}

async function markSourceError(
  admin: SupabaseClient,
  userId: string,
  code: string,
): Promise<void> {
  try {
    await withTimeout(
      admin
        .from('connected_sources')
        .update({
          status: 'error',
          error_detail: { code, at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('provider', 'oura'),
      4000,
      `${SCOPE}.markError`,
    );
  } catch (err) {
    safeLog.warn(SCOPE, 'mark error failed', { error: err });
  }
}

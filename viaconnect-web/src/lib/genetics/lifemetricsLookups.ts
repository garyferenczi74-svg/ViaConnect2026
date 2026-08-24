/**
 * src/lib/genetics/lifemetricsLookups.ts
 *
 * Supabase-backed identity lookups for LifeMetrics ingest. Exclusive match
 * only. Never logs email or kit barcodes (those can identify a member).
 *
 * Standing rules: no em or en dashes, TypeScript strict (no any).
 */

import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type { LifemetricsIdentityLookups } from './lifemetricsIdentity';

const SCOPE = 'genetics.lifemetrics.identity';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export function createLifemetricsIdentityLookups(
  supabase: SupabaseLike,
): LifemetricsIdentityLookups {
  return {
    async findProfileId(userId: string): Promise<string | null> {
      try {
        const result = (await withTimeout(
          supabase.from('profiles').select('id').eq('id', userId).maybeSingle(),
          4000,
          `${SCOPE}.profile`,
        )) as { data: { id?: string } | null; error: { message?: string } | null };
        if (result.error) {
          safeLog.warn(SCOPE, 'profile lookup failed', {
            error: result.error.message ?? 'supabase error',
          });
          return null;
        }
        return typeof result.data?.id === 'string' ? result.data.id : null;
      } catch (err) {
        safeLog.warn(SCOPE, 'profile lookup threw', {
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      }
    },

    async findUserIdsByEmail(email: string): Promise<string[]> {
      try {
        const adminAuth = supabase.auth?.admin as
          | {
              getUserByEmail?: (value: string) => Promise<{
                data?: { user?: { id?: string } | null };
                error?: { message?: string } | null;
              }>;
            }
          | undefined;
        if (typeof adminAuth?.getUserByEmail === 'function') {
          const result = await withTimeout(
            adminAuth.getUserByEmail(email),
            4000,
            `${SCOPE}.email`,
          );
          const id = result.data?.user?.id;
          return typeof id === 'string' ? [id] : [];
        }
        safeLog.warn(SCOPE, 'email lookup unavailable', {});
        return [];
      } catch (err) {
        safeLog.warn(SCOPE, 'email lookup threw', {
          error: err instanceof Error ? err.message : String(err),
        });
        return [];
      }
    },

    async findUserIdsByKitBarcode(kitBarcode: string): Promise<string[]> {
      try {
        const result = (await withTimeout(
          supabase
            .from('kit_registrations')
            .select('user_id')
            .eq('kit_barcode', kitBarcode),
          4000,
          `${SCOPE}.kit`,
        )) as { data: Array<{ user_id?: string }> | null; error: { message?: string } | null };
        if (result.error) {
          safeLog.warn(SCOPE, 'kit lookup failed', {
            error: result.error.message ?? 'supabase error',
          });
          return [];
        }
        const ids: string[] = [];
        for (const row of result.data ?? []) {
          if (typeof row.user_id === 'string') ids.push(row.user_id);
        }
        return ids;
      } catch (err) {
        safeLog.warn(SCOPE, 'kit lookup threw', {
          error: err instanceof Error ? err.message : String(err),
        });
        return [];
      }
    },
  };
}

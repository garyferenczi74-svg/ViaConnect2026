/**
 * Prompt 170l Phase 1c-1: useOffLookup hook.
 *
 * Client-side OFF product lookup that hits sessionStorage (1hr TTL) before
 * falling through to /api/nutrition/barcode/lookup. The server then walks
 * off_product_cache > OFF API per cache.ts and rate-limit.ts.
 *
 * sessionStorage shape: { barcode -> { product, cachedAt } }, encoded as a
 * single JSON value at key `barcode-lookup-${barcode}`.
 */

'use client';

import { useCallback, useState } from 'react';
import type { OFFProduct } from '@/lib/nutrition/barcode/types';

const SESSION_STORAGE_TTL_MS = 60 * 60 * 1000; // 1 hour
const SESSION_STORAGE_PREFIX = 'barcode-lookup-';

export type LookupOutcome =
  | 'sessionstorage_hit'
  | 'cache_hit'
  | 'off_hit'
  | 'off_miss'
  | 'rate_limit'
  | 'feature_disabled'
  | 'network_error'
  | 'error';

export interface LookupResult {
  outcome: LookupOutcome;
  product?: OFFProduct;
  isStale?: boolean;
  lookupLatencyMs?: number;
  rateLimitCurrent?: number;
  rateLimitLimit?: number;
  errorMessage?: string;
}

interface SessionStorageEntry {
  product: OFFProduct;
  cachedAt: number;
}

function safeReadSessionStorage(barcode: string): SessionStorageEntry | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_PREFIX + barcode);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as SessionStorageEntry;
    if (typeof parsed?.cachedAt !== 'number') return null;
    if (Date.now() - parsed.cachedAt > SESSION_STORAGE_TTL_MS) {
      sessionStorage.removeItem(SESSION_STORAGE_PREFIX + barcode);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function safeWriteSessionStorage(barcode: string, product: OFFProduct): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const entry: SessionStorageEntry = { product, cachedAt: Date.now() };
    sessionStorage.setItem(SESSION_STORAGE_PREFIX + barcode, JSON.stringify(entry));
  } catch {
    // sessionStorage may throw on quota or in private browsing; degrade silently.
  }
}

export interface UseOffLookupResult {
  loading: boolean;
  lookup: (barcode: string) => Promise<LookupResult>;
}

export function useOffLookup(): UseOffLookupResult {
  const [loading, setLoading] = useState(false);

  const lookup = useCallback(async (barcode: string): Promise<LookupResult> => {
    setLoading(true);
    try {
      const cached = safeReadSessionStorage(barcode);
      if (cached !== null) {
        return { outcome: 'sessionstorage_hit', product: cached.product };
      }

      let res: Response;
      try {
        res = await fetch('/api/nutrition/barcode/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode }),
        });
      } catch (err) {
        return {
          outcome: 'network_error',
          errorMessage: err instanceof Error ? err.message : String(err),
        };
      }

      const body = await res.json().catch(() => ({}));

      if (res.status === 503) {
        return {
          outcome: 'feature_disabled',
          errorMessage: body?.error?.message,
        };
      }

      if (res.status === 429) {
        return {
          outcome: 'rate_limit',
          rateLimitCurrent: typeof body?.current === 'number' ? body.current : undefined,
          rateLimitLimit: typeof body?.limit === 'number' ? body.limit : undefined,
        };
      }

      if (res.status === 404 && body?.outcome === 'off_miss') {
        return {
          outcome: 'off_miss',
          lookupLatencyMs: typeof body?.lookup_latency_ms === 'number'
            ? body.lookup_latency_ms
            : undefined,
        };
      }

      if (!res.ok) {
        return {
          outcome: 'error',
          errorMessage: body?.error?.message,
        };
      }

      if (body?.outcome === 'cache_hit' || body?.outcome === 'off_hit') {
        const product = body.product as OFFProduct;
        safeWriteSessionStorage(barcode, product);
        return {
          outcome: body.outcome,
          product,
          isStale: typeof body?.is_stale === 'boolean' ? body.is_stale : undefined,
          lookupLatencyMs: typeof body?.lookup_latency_ms === 'number'
            ? body.lookup_latency_ms
            : undefined,
        };
      }

      return { outcome: 'error', errorMessage: 'unexpected response shape' };
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, lookup };
}

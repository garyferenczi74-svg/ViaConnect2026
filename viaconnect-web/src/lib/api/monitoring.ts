// API monitoring and retry utilities
//
// Required table:
// CREATE TABLE api_call_logs (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   service TEXT NOT NULL,
//   endpoint TEXT NOT NULL,
//   method TEXT NOT NULL,
//   status INTEGER NOT NULL,
//   latency_ms INTEGER NOT NULL,
//   user_id UUID,
//   error TEXT,
//   created_at TIMESTAMPTZ DEFAULT now()
// );

import { createClient } from '@supabase/supabase-js';

const API_CALL_LOG_TABLE = 'api_call_logs';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryOn?: (error: unknown) => boolean;
}

interface APICallLogEntry {
  service: string;
  endpoint: string;
  method: string;
  status: number;
  latency_ms: number;
  user_id?: string;
  error?: string;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase admin environment variables');
  }

  return createClient(url, serviceKey);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelay = options?.baseDelay ?? 1000;
  const maxDelay = options?.maxDelay ?? 30000;
  const retryOn = options?.retryOn;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts
      if (attempt >= maxRetries) break;

      // Check if we should retry this error
      if (retryOn && !retryOn(error)) break;

      // Exponential backoff with jitter
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const cappedDelay = Math.min(exponentialDelay, maxDelay);
      const jitteredDelay = cappedDelay * (0.5 + Math.random() * 0.5);

      await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
    }
  }

  throw lastError;
}

export function logAPICall(entry: APICallLogEntry): void {
  // Fire-and-forget: intentionally not awaited
  try {
    const supabaseAdmin = getSupabaseAdmin();

    supabaseAdmin
      .from(API_CALL_LOG_TABLE)
      .insert({
        service: entry.service,
        endpoint: entry.endpoint,
        method: entry.method,
        status: entry.status,
        latency_ms: entry.latency_ms,
        user_id: entry.user_id ?? null,
        error: entry.error ?? null,
      })
      .then(({ error }) => {
        if (error) {
          console.error('[monitoring] Failed to log API call:', error.message);
        }
      });
  } catch (err) {
    console.error('[monitoring] Failed to initialize Supabase admin for logging:', err);
  }
}

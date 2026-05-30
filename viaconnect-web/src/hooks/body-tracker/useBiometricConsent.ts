'use client';

// useBiometricConsent  read/write the append-only biometric consent ledger and
// the "has current consent" gate (Prompt #169b, Task 16, spec section 2).
//
// Exposes:
//   * hasCurrentConsent  whether the user has a CURRENT consent on file (latest
//     row's version == CURRENT_CONSENT_VERSION). This is the client gate the
//     scan capture entry composes with the age + premium gates.
//   * needsReconsent     consented before, but to an older version.
//   * isLoading
//   * recordConsent(...) write a new append-only consent row.
//
// PERSISTENCE: biometric_consents (migration 20260516000070), owner SELECT +
// INSERT only (append-only; no UPDATE/DELETE). Reads + writes use the Supabase
// browser client with a narrow cast, matching the body-tracker hooks pattern
// (the table is not yet in the generated supabase types).
//
// The DECISION + the insert payload shaping are the pure, unit-tested module
// src/lib/body-tracker/biometric-consent.ts; this hook is only I/O + React state.
//
// IP HASHING: the schema stores ip_address HASHED. From the CLIENT we do not see
// a trustworthy client IP, so the recorded value is a non-identifying
// placeholder (CLIENT_IP_HASH_PLACEHOLDER) and a RAW IP is never written. If the
// consent write is moved server-side later, the server hashes the real IP with a
// salt there (see biometric-consent.ts).

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  decideCurrentConsent,
  buildConsentInsertPayload,
  CLIENT_IP_HASH_PLACEHOLDER,
  type BiometricConsentRow,
} from '@/lib/body-tracker/biometric-consent';

export interface RecordConsentArgs {
  retentionDays: number | null;
  modelImprovementOptIn: boolean;
}

export interface UseBiometricConsentResult {
  hasCurrentConsent: boolean;
  needsReconsent: boolean;
  isLoading: boolean;
  // Persist a new append-only consent row, then refresh the decision. Resolves
  // true on a successful write, false otherwise (the caller can keep the user on
  // the consent screen on false rather than proceeding to capture).
  recordConsent: (args: RecordConsentArgs) => Promise<boolean>;
}

// Narrow structural casts for the body_photo-style loose Supabase access.
type ConsentReader = {
  from: (t: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        order: (col: string, opts: { ascending: boolean }) => {
          limit: (n: number) => Promise<{ data: BiometricConsentRow[] | null }>;
        };
      };
    };
  };
};

type ConsentWriter = {
  from: (t: string) => {
    insert: (rows: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
};

export function useBiometricConsent(): UseBiometricConsentResult {
  const [userId, setUserId] = useState<string | null>(null);
  const [hasCurrentConsent, setHasCurrentConsent] = useState(false);
  const [needsReconsent, setNeedsReconsent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async (uid: string) => {
    const supabase = createClient();
    const sb = supabase as unknown as ConsentReader;
    const { data } = await sb
      .from('biometric_consents')
      .select('consent_version, consented_at')
      .eq('user_id', uid)
      .order('consented_at', { ascending: false })
      .limit(20);
    const decision = decideCurrentConsent(data ?? []);
    setHasCurrentConsent(decision.hasCurrentConsent);
    setNeedsReconsent(decision.needsReconsent);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setIsLoading(false);
          return;
        }
        if (!cancelled) setUserId(user.id);
        await refresh(user.id);
      } catch {
        // Fail-safe: on a read error, treat as "no current consent" so the
        // capture entry steers the user through the consent screen rather than
        // silently letting an un-consented scan proceed.
        if (!cancelled) {
          setHasCurrentConsent(false);
          setNeedsReconsent(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  const recordConsent = useCallback(async (args: RecordConsentArgs): Promise<boolean> => {
    if (!userId) return false;
    try {
      const supabase = createClient();
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
      // Client cannot see a trustworthy IP; record the non-identifying
      // placeholder. A raw IP is never written. (Server hashes the real IP if
      // this write is later moved server-side.)
      const payload = buildConsentInsertPayload({
        retentionDays: args.retentionDays,
        modelImprovementOptIn: args.modelImprovementOptIn,
        ipHash: CLIENT_IP_HASH_PLACEHOLDER,
        userAgent,
      });
      const sb = supabase as unknown as ConsentWriter;
      const { error } = await sb
        .from('biometric_consents')
        .insert({ ...payload, user_id: userId });
      if (error) return false;
      await refresh(userId);
      return true;
    } catch {
      return false;
    }
  }, [userId, refresh]);

  return { hasCurrentConsent, needsReconsent, isLoading, recordConsent };
}

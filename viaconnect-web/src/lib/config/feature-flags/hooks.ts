'use client';

import { useState, useEffect } from 'react';

/**
 * Client-side feature flag hook.
 *
 * Reads from a thin /api/feature-flags?flag=<name> endpoint (future) or
 * falls back to a NEXT_PUBLIC_ env var. For launch, all Hannah flags are
 * server-evaluated, so this hook only governs UI visibility of the avatar
 * launcher and evidence footer.
 */
export function useFeatureFlag(flag: string): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Client-side: read from NEXT_PUBLIC_ prefixed env var
    const envKey = `NEXT_PUBLIC_${flag.toUpperCase()}`;
    const val =
      typeof window !== 'undefined'
        ? (process.env as Record<string, string | undefined>)[envKey]
        : undefined;
    setEnabled(val === 'true' || val === '1');
  }, [flag]);

  return enabled;
}

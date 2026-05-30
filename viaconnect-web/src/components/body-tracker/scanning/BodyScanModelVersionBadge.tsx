'use client';

// BodyScanModelVersionBadge.tsx  (Prompt #169b, Task 19, spec section 16.5)
//
// A small "Scanned with vX" badge shown on a scan whose stamped engine version
// DIFFERS from the current version, i.e. an OLDER scan. A scan on the current
// engine shows nothing (no badge clutter on fresh scans). A scan with no
// model_versions stamp at all (the '{}' default, e.g. a pre-feature legacy scan)
// is treated as older and shows the badge with an honest "v0" sentinel.
//
// The decision is the pure, unit-tested decideModelVersionBadge from
// body-scan-model-versions.ts; this component only reads the stamp and renders.
// It accepts the stamp directly (when a parent already loaded the session row) OR
// fetches it by sessionId (RLS-scoped) when it is the one with the id.
//
// Lucide icon at strokeWidth 1.5; copy is commas/colons only (no dashes); no
// emojis; responsive (a single inline pill).

import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  decideModelVersionBadge,
  type ModelVersionStamp,
} from '@/lib/body-tracker/body-scan-model-versions';

interface BodyScanModelVersionBadgeProps {
  // The model_versions JSONB off the body_photo_sessions row, when the parent
  // already has it (preferred: no extra read).
  modelVersions?: ModelVersionStamp | null;
  // Fallback: fetch model_versions for this session when the stamp was not passed
  // in. Ignored when modelVersions is provided.
  sessionId?: string;
  className?: string;
}

export function BodyScanModelVersionBadge({
  modelVersions,
  sessionId,
  className = '',
}: BodyScanModelVersionBadgeProps) {
  const [stamp, setStamp] = useState<ModelVersionStamp | null>(modelVersions ?? null);
  // Whether we still need to resolve a stamp (only when none was passed and a
  // sessionId was). Prevents a flash of the legacy "v0" badge before the read.
  const [resolving, setResolving] = useState<boolean>(modelVersions === undefined && !!sessionId);

  useEffect(() => {
    // Parent-provided stamp wins; no read.
    if (modelVersions !== undefined) {
      setStamp(modelVersions ?? null);
      setResolving(false);
      return;
    }
    if (!sessionId) {
      setResolving(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('body_photo_sessions')
          .select('model_versions')
          .eq('id', sessionId)
          .maybeSingle();
        if (!mounted) return;
        const row = data as unknown as { model_versions?: ModelVersionStamp | null } | null;
        setStamp(row?.model_versions ?? null);
      } catch {
        // On a read error, leave the stamp null; the decision then treats it as a
        // legacy scan. Better to honestly flag "earlier version" than to imply the
        // current engine.
        if (mounted) setStamp(null);
      } finally {
        if (mounted) setResolving(false);
      }
    })();
    return () => { mounted = false; };
  }, [modelVersions, sessionId]);

  if (resolving) return null;

  const decision = decideModelVersionBadge(stamp);
  if (!decision.show || !decision.scanToken) return null;

  return (
    <span
      data-testid="model-version-badge"
      data-scan-version={decision.scanToken}
      title={`This scan was created with an earlier scanning engine (${decision.scanToken}). Newer scans use ${decision.currentToken}. Numbers can shift slightly between engine versions.`}
      className={`inline-flex items-center gap-1 rounded-full border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/55 ${className}`}
    >
      <History className="h-2.5 w-2.5" strokeWidth={1.5} />
      Scanned with {decision.scanToken}
    </span>
  );
}

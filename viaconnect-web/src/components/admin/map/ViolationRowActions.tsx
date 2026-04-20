// Prompt #100 Phase 5: admin violation row actions.
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { MAPViolationRow } from '@/lib/map/types';

export function ViolationRowActions({
  violation,
  onChange,
}: {
  violation: MAPViolationRow;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try { await fn(); onChange(); } finally { setBusy(null); }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = () => createClient() as unknown as any;

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        disabled={!!busy}
        onClick={() => act('resolve', async () => {
          await supabase()
            .from('map_violations')
            .update({ status: 'remediated', remediated_at: new Date().toISOString() })
            .eq('violation_id', violation.violationId);
        })}
        className="text-[10px] rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-2 py-0.5 hover:bg-emerald-500/20"
      >
        {busy === 'resolve' ? '...' : 'Resolve'}
      </button>
      <button
        type="button"
        disabled={!!busy}
        onClick={() => act('dismiss', async () => {
          const reason = prompt('Dismissal reason:');
          if (!reason) return;
          await supabase()
            .from('map_violations')
            .update({ status: 'dismissed', dismissed_at: new Date().toISOString(), dismissal_reason: reason })
            .eq('violation_id', violation.violationId);
        })}
        className="text-[10px] rounded-md border border-white/20 bg-white/[0.04] text-white/70 px-2 py-0.5 hover:bg-white/10"
      >
        {busy === 'dismiss' ? '...' : 'Dismiss'}
      </button>
      <button
        type="button"
        disabled={!!busy || !violation.practitionerId}
        onClick={() => act('escalate', async () => {
          await supabase()
            .from('map_violations')
            .update({ status: 'escalated', escalated_at: new Date().toISOString() })
            .eq('violation_id', violation.violationId);
        })}
        className="text-[10px] rounded-md border border-red-500/30 bg-red-500/10 text-red-300 px-2 py-0.5 hover:bg-red-500/20 disabled:opacity-50"
      >
        {busy === 'escalate' ? '...' : 'Escalate'}
      </button>
    </div>
  );
}

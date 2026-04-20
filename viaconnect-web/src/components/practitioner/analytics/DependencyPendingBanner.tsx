// Prompt #99 Phase 1 (Path A): Banner shown on analytics surfaces
// whose underlying materialized view + dependency tables are not yet
// live. Communicates scope honestly to practitioners during rollout.

import { Clock } from 'lucide-react';

export function DependencyPendingBanner({ pendingReason }: { pendingReason: string }) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.04] p-4"
    >
      <div className="flex items-start gap-2.5">
        <Clock
          className="h-4 w-4 text-sky-300 mt-0.5 shrink-0"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-sky-200">
            This analytics surface activates when upstream data is live.
          </p>
          <p className="text-[11px] leading-relaxed text-sky-200/70">
            Waiting on: {pendingReason}. The page layout, cache, and
            Helix-isolation guardrails are ready; the full rollup activates
            once the dependency tables populate.
          </p>
        </div>
      </div>
    </section>
  );
}

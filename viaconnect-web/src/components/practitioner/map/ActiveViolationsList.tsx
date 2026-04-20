// Prompt #100 Phase 4: severity-sorted list of active violations.
'use client';

import { useState } from 'react';
import type { ActiveViolationView } from '@/lib/map/queries-client';
import { ViolationDetailCard } from './ViolationDetailCard';
import { MarkRemediatedDialog } from './MarkRemediatedDialog';

const SEVERITY_ORDER = { black: 0, red: 1, orange: 2, yellow: 3 } as const;

export function ActiveViolationsList({
  violations,
  onRefresh,
}: {
  violations: ActiveViolationView[];
  onRefresh: () => void;
}) {
  const [remediatingViolation, setRemediatingViolation] =
    useState<ActiveViolationView | null>(null);

  const sorted = [...violations].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  if (sorted.length === 0) {
    return (
      <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <p className="text-xs text-emerald-200">
          No active MAP violations. Your listings are compliant.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-3">
        {sorted.map((v) => (
          <ViolationDetailCard
            key={v.violationId}
            violation={v}
            onMarkRemediated={setRemediatingViolation}
          />
        ))}
      </section>

      {remediatingViolation && (
        <MarkRemediatedDialog
          violation={remediatingViolation}
          onClose={() => setRemediatingViolation(null)}
          onSubmitted={onRefresh}
        />
      )}
    </>
  );
}

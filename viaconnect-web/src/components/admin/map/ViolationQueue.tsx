// Prompt #100 Phase 5: admin active violations queue.
'use client';

import type { MAPViolationRow } from '@/lib/map/types';
import { SEVERITY_TONE } from '@/lib/map/severity';
import { hoursRemainingInGrace } from '@/lib/map/gracePeriods';
import { formatPriceFromCents } from '@/lib/pricing/format';
import { ViolationRowActions } from './ViolationRowActions';

export function ViolationQueue({
  rows,
  onChange,
}: {
  rows: MAPViolationRow[];
  onChange: () => void;
}) {
  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
        <p className="text-xs text-white/60">No active violations in the network.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-3 overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-white/50 text-[10px] uppercase tracking-wide">
          <tr className="border-b border-white/[0.06]">
            <th className="text-left py-2 px-2">Severity</th>
            <th className="text-left py-2 px-2">Practitioner</th>
            <th className="text-right py-2 px-2">Observed</th>
            <th className="text-right py-2 px-2">MAP</th>
            <th className="text-right py-2 px-2">Below</th>
            <th className="text-right py-2 px-2">Grace</th>
            <th className="text-left py-2 px-2">Status</th>
            <th className="text-left py-2 px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => {
            const hoursLeft = hoursRemainingInGrace(v.gracePeriodEndsAt);
            return (
              <tr key={v.violationId} className="border-b border-white/[0.04]">
                <td className="py-2 px-2">
                  <span className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 border ${SEVERITY_TONE[v.severity]}`}>
                    {v.severity.toUpperCase()}
                  </span>
                </td>
                <td className="py-2 px-2 text-white/80 font-mono text-[10px]">
                  {v.practitionerId ? v.practitionerId.slice(0, 8) : 'anon'}
                </td>
                <td className="py-2 px-2 text-right text-white">
                  {formatPriceFromCents(v.observedPriceCents)}
                </td>
                <td className="py-2 px-2 text-right text-white/70">
                  {formatPriceFromCents(v.mapPriceCents)}
                </td>
                <td className="py-2 px-2 text-right text-white/80">{v.discountPctBelowMap}%</td>
                <td className={`py-2 px-2 text-right ${hoursLeft < 4 ? 'text-red-300' : hoursLeft < 24 ? 'text-orange-300' : 'text-white/70'}`}>
                  {hoursLeft > 0 ? `${hoursLeft}h` : 'Expired'}
                </td>
                <td className="py-2 px-2 text-white/60">{v.status}</td>
                <td className="py-2 px-2">
                  <ViolationRowActions violation={v} onChange={onChange} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

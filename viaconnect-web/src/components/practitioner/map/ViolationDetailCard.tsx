// Prompt #100 Phase 4: individual violation card with evidence + countdown.

import { ExternalLink } from 'lucide-react';
import type { ActiveViolationView } from '@/lib/map/queries-client';
import { SEVERITY_LABEL, SEVERITY_TONE } from '@/lib/map/severity';
import { hoursRemainingInGrace } from '@/lib/map/gracePeriods';
import { formatPriceFromCents } from '@/lib/pricing/format';

export function ViolationDetailCard({
  violation,
  onMarkRemediated,
}: {
  violation: ActiveViolationView;
  onMarkRemediated: (v: ActiveViolationView) => void;
}) {
  const hoursLeft = hoursRemainingInGrace(violation.gracePeriodEndsAt);
  const countdownTone =
    hoursLeft < 4 ? 'text-red-300' : hoursLeft < 24 ? 'text-orange-300' : 'text-white/70';

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">
            {violation.productName ?? violation.productSku ?? 'Product'}
          </p>
          <p className="text-[11px] text-white/55">SKU: {violation.productSku ?? 'N/A'}</p>
        </div>
        <span
          className={`text-[10px] font-semibold rounded-lg px-2 py-0.5 border ${SEVERITY_TONE[violation.severity]}`}
        >
          {SEVERITY_LABEL[violation.severity]}
        </span>
      </header>

      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-white/50">Observed price</dt>
          <dd className="text-white font-semibold">
            {formatPriceFromCents(violation.observedPriceCents)}
          </dd>
        </div>
        <div>
          <dt className="text-white/50">MAP price</dt>
          <dd className="text-white font-semibold">
            {formatPriceFromCents(violation.mapPriceCents)}
          </dd>
        </div>
        <div>
          <dt className="text-white/50">Below MAP</dt>
          <dd className="text-white font-semibold">{violation.discountPctBelowMap}%</dd>
        </div>
        <div>
          <dt className="text-white/50">Grace remaining</dt>
          <dd className={`font-semibold ${countdownTone}`}>
            {hoursLeft > 0 ? `${hoursLeft}h` : 'Expired'}
          </dd>
        </div>
      </dl>

      <a
        href={violation.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[11px] text-[#2DA5A0] hover:underline"
      >
        <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" /> Source listing
      </a>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onMarkRemediated(violation)}
          className="rounded-lg bg-[#2DA5A0] hover:bg-[#2DA5A0]/80 px-3 py-1.5 text-[11px] font-semibold text-[#0B1520]"
        >
          Mark remediated
        </button>
      </div>
    </article>
  );
}

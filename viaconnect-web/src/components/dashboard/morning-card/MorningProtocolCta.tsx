'use client';

import Link from 'next/link';
import { ArrowRight, Check, Loader2, Pill } from 'lucide-react';
import type { MorningProtocolCta } from '@/lib/dashboard/morning-card/protocol-cta';

export interface MorningProtocolCtaProps {
  cta: MorningProtocolCta;
  onTake?: () => void;
  taking?: boolean;
}

export function MorningProtocolCtaButton({
  cta,
  onTake,
  taking = false,
}: MorningProtocolCtaProps) {
  if (cta.kind === 'loading') {
    return (
      <div
        data-cta-kind="loading"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-[#1A2744]/70 px-4 py-2 text-sm text-white/50"
      >
        <Loader2 className="h-4 w-4 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
        {cta.label}
      </div>
    );
  }

  if (cta.kind === 'unavailable') {
    return (
      <p data-cta-kind="unavailable" className="text-sm text-white/50">
        {cta.label}
      </p>
    );
  }

  if (cta.kind === 'complete') {
    return (
      <div
        data-cta-kind="complete"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-4 py-2 text-sm font-medium text-[#2DA5A0]"
      >
        <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        {cta.label}
      </div>
    );
  }

  if (cta.kind === 'empty' && cta.href) {
    return (
      <Link
        data-cta-kind="empty"
        href={cta.href}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/15 px-4 py-2 text-sm font-semibold text-[#2DA5A0] sm:w-auto"
      >
        {cta.label}
        <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      data-cta-kind="action"
      data-slot-id={cta.item?.slotId ?? ''}
      onClick={onTake}
      disabled={taking || !onTake}
      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/15 px-4 py-2 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] disabled:opacity-60 sm:w-auto"
    >
      <Pill className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      {cta.label}
      {cta.item?.dose ? (
        <span className="font-normal text-[#2DA5A0]/70">{cta.item.dose}</span>
      ) : null}
    </button>
  );
}

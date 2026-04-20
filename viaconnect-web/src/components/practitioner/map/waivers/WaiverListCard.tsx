// Prompt #101 Phase 4: waiver list row.

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import type { MAPWaiverStatus, MAPWaiverType } from '@/lib/map/waivers/types';

const STATUS_TONE: Record<MAPWaiverStatus, string> = {
  draft: 'bg-white/[0.06] text-white/60 border-white/10',
  pending_approval: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  info_requested: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  active: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  expired: 'bg-white/[0.04] text-white/50 border-white/10',
  revoked: 'bg-red-500/15 text-red-300 border-red-500/30',
  rejected: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const TYPE_LABEL: Record<MAPWaiverType, string> = {
  seasonal_promotion: 'Seasonal promotion',
  charity_event: 'Charity event',
  clinic_in_person_only: 'Clinic in-person only',
  clinical_study_recruitment: 'Clinical study',
  new_patient_onboarding: 'New patient onboarding',
};

export function WaiverListCard({
  waiverId,
  waiverType,
  status,
  scopeDescription,
  waiverStartAt,
  waiverEndAt,
}: {
  waiverId: string;
  waiverType: MAPWaiverType;
  status: MAPWaiverStatus;
  scopeDescription: string;
  waiverStartAt: string;
  waiverEndAt: string;
}) {
  return (
    <Link
      href={`/practitioner/map/waivers/${waiverId}`}
      className="block rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 hover:bg-[#1A2744] p-4 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-sm text-white font-semibold">{TYPE_LABEL[waiverType]}</span>
        </div>
        <span className={`text-[10px] font-semibold rounded-md px-2 py-0.5 border ${STATUS_TONE[status]}`}>
          {status.replace(/_/g, ' ')}
        </span>
      </div>
      <p className="text-[11px] text-white/60 line-clamp-2">{scopeDescription}</p>
      <p className="text-[10px] text-white/40">
        {new Date(waiverStartAt).toLocaleDateString()} to {new Date(waiverEndAt).toLocaleDateString()}
      </p>
    </Link>
  );
}

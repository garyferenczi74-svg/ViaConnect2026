import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { MedicalDisclaimer } from "@/components/practitioner/analytics/MedicalDisclaimer";
import { PortalEmptyPage } from "@/components/portal/PortalEmptyState";
import { PORTAL_EMPTY_COPY } from "@/lib/portal/empty-state-copy";

export default function CohortsPage() {
  const copy = PORTAL_EMPTY_COPY.practitionerCohorts;
  return (
    <PortalEmptyPage
      copy={copy}
      icon={
        <Users
          className="mt-1 h-5 w-5 shrink-0 text-white/70"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      }
      before={
        <Link
          href="/practitioner/analytics"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-white/70 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          {copy.actionLabel}
        </Link>
      }
      after={<MedicalDisclaimer />}
    />
  );
}

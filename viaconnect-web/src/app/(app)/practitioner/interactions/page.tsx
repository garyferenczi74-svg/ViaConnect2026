import { AlertTriangle } from "lucide-react";
import { InteractionEngine } from "@/components/shared/InteractionEngine";
import { PortalEmptyPage } from "@/components/portal/PortalEmptyState";
import { PORTAL_EMPTY_COPY } from "@/lib/portal/empty-state-copy";

export default function PractitionerInteractionsPage() {
  return (
    <PortalEmptyPage
      copy={PORTAL_EMPTY_COPY.practitionerInteractions}
      icon={
        <AlertTriangle
          className="mt-1 h-5 w-5 shrink-0 text-white/70"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      }
      after={
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-6">
          <InteractionEngine mode="practitioner" userId="" />
        </div>
      }
    />
  );
}

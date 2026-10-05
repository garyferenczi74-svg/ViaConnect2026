import { Activity } from "lucide-react";
import { PortalEmptyPage } from "@/components/portal/PortalEmptyState";
import { PORTAL_EMPTY_COPY } from "@/lib/portal/empty-state-copy";

export default function NaturopathConstitutionalPage() {
  return (
    <PortalEmptyPage
      copy={PORTAL_EMPTY_COPY.naturopathConstitutional}
      icon={
        <Activity
          className="mt-1 h-5 w-5 shrink-0 text-white/70"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      }
    />
  );
}

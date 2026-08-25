import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { HelixAliasHint } from "@/components/not-found/HelixAliasHint";

/**
 * In-app 404 body. Chrome (sidebar, top bar, navy+orange V logo) comes from
 * PortalShellRouter via (app)/layout or the signed-in root not-found wrap.
 */
export function AppNotFoundView() {
  return (
    <div className="min-h-[60vh] bg-[#1A2744] px-4 py-8 sm:px-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B75E18]">
          404
        </p>
        <h1 className="mt-3 text-2xl font-semibold leading-tight text-white md:text-3xl">
          Page not found
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70 md:text-base">
          This page does not exist or has been moved.
        </p>
        <HelixAliasHint />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/dashboard"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/15 px-4 py-2.5 text-sm font-semibold text-[#2DA5A0] no-underline transition-colors hover:bg-[#2DA5A0]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] sm:w-auto"
          >
            <LayoutDashboard
              aria-hidden="true"
              className="h-4 w-4"
              strokeWidth={1.5}
            />
            Go to Dashboard
          </Link>
          <Link
            href="/helix"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/80 no-underline transition-colors hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] sm:w-auto"
          >
            <ArrowLeft
              aria-hidden="true"
              className="h-4 w-4"
              strokeWidth={1.5}
            />
            Helix Rewards
          </Link>
        </div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import type { PortalEmptyCopy } from "@/lib/portal/empty-state-copy";

export function PortalEmptyState({
  copy,
}: {
  copy: Pick<PortalEmptyCopy, "title" | "body">;
}) {
  return (
    <section
      role="status"
      data-testid="portal-empty-state"
      className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-6 md:p-8"
    >
      <div className="flex items-start gap-3">
        <Inbox
          className="mt-0.5 h-5 w-5 shrink-0 text-white/50"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-semibold text-white sm:text-lg">{copy.title}</h2>
          <p className="text-sm leading-relaxed text-white/60">{copy.body}</p>
        </div>
      </div>
    </section>
  );
}

export function PortalEmptyPage({
  copy,
  icon,
  before,
  after,
  actionHref,
}: {
  copy: PortalEmptyCopy;
  icon?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
  actionHref?: string;
}) {
  return (
    <div className="min-h-screen bg-[#0E1A30] px-4 py-6 sm:px-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex items-start gap-3">
          {icon}
          <h1 className="text-xl font-semibold text-white sm:text-2xl md:text-3xl">
            {copy.heading}
          </h1>
        </header>
        {before}
        <PortalEmptyState copy={copy} />
        {actionHref && copy.actionLabel ? (
          <Link
            href={actionHref}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-white/15 px-4 text-sm text-white hover:bg-white/[0.04] sm:w-auto sm:justify-start"
          >
            {copy.actionLabel}
          </Link>
        ) : null}
        {after}
      </div>
    </div>
  );
}

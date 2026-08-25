import Link from "next/link";
import { ViaConnectLogo } from "@/components/ui/ViaConnectLogo";
import { HelixAliasHint } from "@/components/not-found/HelixAliasHint";

/**
 * Unsigned / public 404. Marketing chrome with the navy+orange V logo.
 * Never a blank unbranded page.
 */
export function MarketingNotFoundView() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0B1120]">
      <header className="flex h-16 items-center border-b border-white/5 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="ViaConnect home"
          className="inline-flex min-h-[44px] items-center"
        >
          <ViaConnectLogo size="md" />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 md:px-8">
        <div className="w-full max-w-md text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B75E18]">
            404
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white md:text-3xl">
            Page not found
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/70 md:text-base">
            The page you are looking for does not exist or has been moved.
          </p>
          <div className="flex justify-center">
            <HelixAliasHint />
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#B75E18]/40 bg-[#B75E18]/15 px-4 py-2.5 text-sm font-semibold text-[#B75E18] no-underline transition-colors hover:bg-[#B75E18]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B75E18]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120] sm:w-auto"
            >
              Go home
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120] sm:w-auto"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// BOSCardSkeleton: loading shimmer that mirrors the populated card's
// four section vertical rhythm per #161e §6.9. Includes a circular
// placeholder for the gauge. The teaching paragraph now lives inside
// the side panel column on the populated card, so the standalone
// explanation placeholder was removed to avoid content shift on load.
//
// No animation libraries; pure Tailwind animate-pulse so this can
// render under any environment without JS bookkeeping. Layout matches
// the populated card so the user does not see content shift when
// data arrives.

export function BOSCardSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading Bio Optimization Score"
      className="rounded-3xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-5 sm:p-6 md:p-8"
    >
      <div className="flex flex-col gap-5 sm:gap-6">
        {/* 1. Header */}
        <div className="h-3 w-32 animate-pulse rounded-full bg-white/10" />

        {/* 2. Gauge placeholder (circular) */}
        <div className="flex flex-col items-center">
          <div className="h-[120px] w-[120px] animate-pulse rounded-full bg-white/10 sm:h-[160px] sm:w-[160px]" />
          <div className="mt-3 h-3 w-20 animate-pulse rounded-full bg-white/10" />
          <div className="mt-2 h-3 w-40 animate-pulse rounded-full bg-white/10" />
        </div>

        {/* 3. Accuracy row */}
        <div className="space-y-2">
          <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
          <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/10" />
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <div className="h-7 w-28 animate-pulse rounded-lg bg-white/10" />
            <div className="h-7 w-28 animate-pulse rounded-lg bg-white/10" />
            <div className="h-7 w-32 animate-pulse rounded-lg bg-white/10" />
          </div>
        </div>

        {/* 4. Engagement row */}
        <div className="space-y-2">
          <div className="h-3 w-44 animate-pulse rounded-full bg-white/10" />
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/10" />
          <div className="mt-1 grid grid-cols-3 gap-2">
            <div className="h-[88px] animate-pulse rounded-lg bg-white/10" />
            <div className="h-[88px] animate-pulse rounded-lg bg-white/10" />
            <div className="h-[88px] animate-pulse rounded-lg bg-white/10" />
            <div className="h-[88px] animate-pulse rounded-lg bg-white/10" />
            <div className="h-[88px] animate-pulse rounded-lg bg-white/10" />
            <div className="h-[88px] animate-pulse rounded-lg bg-white/10" />
          </div>
        </div>
      </div>
    </section>
  );
}
